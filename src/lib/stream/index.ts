// lib/streamQueue.js
import { prisma } from "@/lib/prisma";
import { r2 } from "@/lib/r2/index";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// /**
//  * Process all pending queue items (for cron job)
//  */
export async function processQueue(batchSize = 5) {
  console.log(`[STREAM QUEUE] Processing batch of ${batchSize} items`);

  const results = [];
  for (let i = 0; i < batchSize; i++) {
    try {
      const result = await processNextQueueItem();
      if (!result) break; // No more items
      results.push(result);
    } catch (error) {
      console.error(`[STREAM QUEUE] Error processing item ${i + 1}:`, error);
      // Continue with next item
    }
  }

  console.log(`[STREAM QUEUE] Processed ${results.length} items`);
  return results;
}

/**
 * Process next pending item in the queue
 */
export async function processNextQueueItem() {
  let queueItem = null;

  try {
    // Get next pending item (prioritize HIGH, then NORMAL, then LOW)
    queueItem = await prisma.streamQueue.findFirst({
      where: {
        status: "PENDING",
        attempts: {
          lt: prisma.streamQueue.fields.maxAttempts,
        },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        asset: {
          select: {
            id: true,
            title: true,
            filename: true,
            companyId: true,
            r2Key: true,
          },
        },
      },
    });

    if (!queueItem) {
      console.log("[STREAM QUEUE] No pending items");
      return null;
    }

    console.log(
      `[STREAM QUEUE] Processing asset ${queueItem.assetId} (Priority: ${queueItem.priority})`
    );

    // Mark as processing
    await prisma.streamQueue.update({
      where: { id: queueItem.id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    // Upload to Cloudflare Stream
    const result = await uploadToCloudflareStream(queueItem);
    console.log("result is", result);

    // Update Asset once Stream upload succeeded
    await prisma.asset.update({
      where: { id: queueItem.assetId },
      data: {
        streamId: result.streamId,
        playbackUrl: result.playbackUrl,
        thumbnailUrl: result.thumbnailUrl,
        status: "READY",
        duration: result.duration ?? undefined,
        resolution: result.resolution ?? undefined,
      },
    });

    // Update queue status on success
    await prisma.streamQueue.update({
      where: { id: queueItem.id },
      data: {
        status: "COMPLETED",
        streamId: result.streamId,
        completedAt: new Date(),
      },
    });

    console.log(
      `[STREAM QUEUE] Asset ${queueItem.assetId} uploaded successfully. StreamID: ${result.streamId}`
    );

    return result;
  } catch (error) {
    console.error("[STREAM QUEUE ERROR]", error);

    // Update queue item with error
    if (queueItem) {
      const maxAttempts = queueItem.maxAttempts || 3;
      const currentAttempts = queueItem.attempts + 1;
      const isFinalAttempt = currentAttempts >= maxAttempts;

      await prisma.streamQueue.update({
        where: { id: queueItem.id },
        data: {
          status: isFinalAttempt ? "FAILED" : "PENDING",
          lastError: (error as Error).message,
        },
      });

      // Update asset status if all retries exhausted
      if (isFinalAttempt) {
        await prisma.asset.update({
          where: { id: queueItem.assetId },
          data: {
            status: "ERROR",
            metadata: {
              streamUploadError: (error as Error).message,
              failedAt: new Date().toISOString(),
              attempts: currentAttempts,
            },
          },
        });

        console.error(
          `[STREAM QUEUE] Asset ${queueItem.assetId} failed after ${currentAttempts} attempts`
        );
      } else {
        console.log(
          `[STREAM QUEUE] Asset ${queueItem.assetId} will retry (Attempt ${currentAttempts}/${maxAttempts})`
        );
      }
    }

    throw error;
  }
}

/**
 * Upload video to Cloudflare Stream
 */
async function uploadToCloudflareStream(queueItem: any) {
  // 1. Generate presigned download URL from R2 (valid for 1 hour)
  const getObjectCommand = new GetObjectCommand({
    Bucket: queueItem.r2Bucket ?? process.env.R2_BUCKET_NAME,
    Key: queueItem.r2Key ?? queueItem.asset.r2Key,
  });

  const downloadUrl = await getSignedUrl(r2, getObjectCommand, {
    expiresIn: 3600, // 1 hour
  });

  // 2. Upload to Cloudflare Stream via URL
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  const streamResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: downloadUrl,
        meta: {
          assetId: queueItem.assetId,
          name: queueItem.asset.title || queueItem.asset.filename,
          companyId: queueItem.asset.companyId,
        },
        requireSignedURLs: false, // Set to true if you want signed URLs for playback
        allowedOrigins: [],
        thumbnailTimestampPct: 0.1, // Generate thumbnail at 10% of video
      }),
    }
  );

  if (!streamResponse.ok) {
    const errorData = await streamResponse.json();
    throw new Error(`Cloudflare Stream upload failed: ${JSON.stringify(errorData)}`);
  }

  const streamData = await streamResponse.json();

  if (!streamData.success) {
    throw new Error(`Cloudflare Stream API error: ${JSON.stringify(streamData.errors)}`);
  }

  const streamId = streamData.result.uid;
  // const playbackUrl = `https://customer-${accountId.substring(0, 8)}.cloudflarestream.com/${streamId}/manifest/video.m3u8`;
  // const thumbnailUrl = `https://customer-${accountId.substring(0, 8)}.cloudflarestream.com/${streamId}/thumbnails/thumbnail.jpg`;
  const detailsResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${streamId}`,
    { headers: { "Authorization": `Bearer ${apiToken}` } }
  );

  const detailsData = await detailsResponse.json();

  return {
    streamId,
    playbackUrl: detailsData.result.playback.hls, // ✅ Correct subdomain
    thumbnailUrl: detailsData.result.thumbnail, // ✅ Correct subdomain
    duration: detailsData.result.duration,
    resolution: `${detailsData.result.input.width}x${detailsData.result.input.height}`,
  };
}

type StreamQueuePriority = "LOW" | "NORMAL" | "HIGH";

/**
 * Queue an Asset for Cloudflare Stream upload.
 * This assumes the Asset already has `r2Key` and `r2Bucket` set.
 */
export async function enqueueAssetStreamUpload(
  assetId: string,
  priority: StreamQueuePriority = "NORMAL"
) {
  try {
    // Check if already queued for this asset
    const existing = await prisma.streamQueue.findFirst({
      where: { assetId, status: { in: ["PENDING", "PROCESSING"] } },
    });

    if (existing) {
      console.log(
        `[STREAM QUEUE] Asset ${assetId} already queued (status=${existing.status})`
      );
      return existing;
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        r2Key: true,
        r2Bucket: true,
      },
    });

    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const queueEntry = await prisma.streamQueue.create({
      data: {
        assetId: asset.id,
        r2Key: asset.r2Key,
        r2Bucket: asset.r2Bucket,
        status: "PENDING",
        priority,
        attempts: 0,
        maxAttempts: 3,
      },
    });

    console.log(
      `[STREAM QUEUE] Asset ${assetId} queued successfully with priority ${priority}`
    );

    if (priority === "HIGH") {
      // Fire-and-forget immediate processing for high-priority items
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      processNextQueueItem();
    }

    return queueEntry;
  } catch (error) {
    console.error(
      `[STREAM QUEUE ERROR] Failed to queue asset ${assetId}:`,
      (error as Error).message
    );
    throw error;
  }
}



/**
 * Queue a video for Cloudflare Stream upload (uncompressed files ≤ 25GB)
//  */
// export async function queueStreamUpload(videoId, r2Key, priority = "NORMAL") {
//   try {
//     // Check if already queued
//     const existing = await prisma.streamQueue.findUnique({
//       where: { videoId },
//     });

//     if (existing) {
//       console.log(`[STREAM QUEUE] Video ${videoId} already queued`);
//       return existing;
//     }

//     // Create queue entry
//     const queueEntry = await prisma.streamQueue.create({
//       data: {
//         videoId,
//         r2Key,
//         status: "PENDING",
//         priority,
//         attempts: 0,
//         maxAttempts: 3,
//       },
//     });

//     console.log(`[STREAM QUEUE] Video ${videoId} queued successfully with priority ${priority}`);

//     // Trigger immediate processing for HIGH priority
//     if (priority === "HIGH") {
//       setImmediate(() => processNextQueueItem());
//     }

//     return queueEntry;
//   } catch (error) {
//     console.error(`[STREAM QUEUE ERROR] Failed to queue video ${videoId}:`, error);
//     throw error;
//   }
// }

// /**
//  * Queue a COMPRESSED video for Cloudflare Stream upload (files > 25GB after compression)
//  * This is called AFTER compression is complete
//  */
// export async function queueStreamAfterCompression(videoId, compressedR2Key, priority = "HIGH") {
//   try {
//     console.log(`[STREAM QUEUE] Queueing compressed video ${videoId} for Stream upload`);

//     // Check if already queued
//     const existing = await prisma.streamQueue.findUnique({
//       where: { videoId },
//     });

//     if (existing) {
//       console.log(`[STREAM QUEUE] Video ${videoId} already queued, updating with compressed key`);
      
//       // Update with compressed file key
//       const updated = await prisma.streamQueue.update({
//         where: { videoId },
//         data: {
//           r2Key: compressedR2Key, // ✅ Use compressed file instead
//           status: "PENDING",
//           priority,
//           attempts: 0, // Reset attempts
//           lastError: null, // Clear previous errors
//         },
//       });

//       // Trigger immediate processing
//       setImmediate(() => processNextQueueItem());

//       return updated;
//     }

//     // Create new queue entry with compressed file
//     const queueEntry = await prisma.streamQueue.create({
//       data: {
//         videoId,
//         r2Key: compressedR2Key, // ✅ Use compressed file
//         status: "PENDING",
//         priority,
//         attempts: 0,
//         maxAttempts: 3,
//       },
//     });

//     console.log(`[STREAM QUEUE] Compressed video ${videoId} queued successfully with priority ${priority}`);

//     // Trigger immediate processing for HIGH priority
//     setImmediate(() => processNextQueueItem());

//     return queueEntry;
//   } catch (error) {
//     console.error(`[STREAM QUEUE ERROR] Failed to queue compressed video ${videoId}:`, error);
//     throw error;
//   }
// }

// /**
//  * Get queue statistics
//  */
// export async function getQueueStats() {
//   const stats = await prisma.streamQueue.groupBy({
//     by: ["status"],
//     _count: true,
//   });

//   const statsMap = stats.reduce((acc, stat) => {
//     acc[stat.status] = stat._count;
//     return acc;
//   }, {});

//   return {
//     pending: statsMap.PENDING || 0,
//     processing: statsMap.PROCESSING || 0,
//     completed: statsMap.COMPLETED || 0,
//     failed: statsMap.FAILED || 0,
//     total: Object.values(statsMap).reduce((sum, count) => sum + count, 0),
//   };
// }

// /**
//  * Retry failed queue items
//  */
// export async function retryFailedItems() {
//   const failedItems = await prisma.streamQueue.findMany({
//     where: {
//       status: "FAILED",
//       attempts: {
//         lt: prisma.streamQueue.fields.maxAttempts,
//       },
//     },
//   });

//   console.log(`[STREAM QUEUE] Retrying ${failedItems.length} failed items`);

//   for (const item of failedItems) {
//     await prisma.streamQueue.update({
//       where: { id: item.id },
//       data: {
//         status: "PENDING",
//         lastError: null,
//       },
//     });
//   }

//   return failedItems.length;
// }

// export async function pollStreamStatus() {
//   try {
//     // Get all videos waiting for Stream processing
//     const processingVideos = await prisma.video.findMany({
//       where: {
//         streamId: { not: null },
//         status: { in: ["processing", "ready"] },
//         playbackUrl: null, // Not yet processed by Stream
//       },
//       take: 20, // Process 20 at a time
//     });

//     if (processingVideos.length === 0) {
//       console.log("[STREAM POLL] No videos to check");
//       return { checked: 0, updated: 0 };
//     }

//     console.log(`[STREAM POLL] Checking ${processingVideos.length} videos`);

//     let updatedCount = 0;

//     for (const video of processingVideos) {
//       try {
//         // Check status in Cloudflare Stream
//         const response = await fetch(
//           `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${video.streamId}`,
//           {
//             headers: {
//               Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
//             },
//           }
//         );

//         if (!response.ok) {
//           console.error(`[STREAM POLL] API error for ${video.id}:`, response.status);
//           continue;
//         }

//         const data = await response.json();
//         const streamVideo = data.result;

//         console.log(`[STREAM POLL] Video ${video.id}: readyToStream=${streamVideo.readyToStream}`);

//         // Update if ready
//         if (streamVideo.readyToStream) {
//           await prisma.video.update({
//             where: { id: video.id },
//             data: {
//               status: "ready",
//               playbackUrl: streamVideo.playback?.hls || streamVideo.playback?.dash,
//               thumbnailUrl: streamVideo.thumbnail,
//               duration: streamVideo.duration || null,
//             },
//           });

//           // Update StreamQueue
//           await prisma.streamQueue.updateMany({
//             where: { videoId: video.id },
//             data: {
//               status: "COMPLETED",
//               completedAt: new Date(),
//             },
//           });

//           updatedCount++;
//           console.log(`✅ Video ${video.id} (${video.title}) is ready for playback`);
//         }
//       } catch (error) {
//         console.error(`❌ Failed to check video ${video.id}:`, error.message);
//       }
//     }

//     return { checked: processingVideos.length, updated: updatedCount };
//   } catch (error) {
//     console.error("[STREAM POLL] Error:", error);
//     throw error;
//   }
// }
