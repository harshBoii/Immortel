// lib/r2.js
import { S3Client , GetObjectCommand} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto" as string  ,
  endpoint: process.env.R2_ENDPOINT as string , // e.g., https://abc123.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export async function generatePresignedUrl(r2Key: string, r2Bucket: string, expiresIn = 86400) {
  try {
    // Remove r2 parameter, use the exported r2 client instead
    const command = new GetObjectCommand({
      Bucket: r2Bucket,
      Key: r2Key,
    });

    const signedUrl = await getSignedUrl(r2, command, { 
      expiresIn // 24 hours default
    });

    console.log(`✅ Generated presigned URL for ${r2Key} (expires in ${expiresIn}s)`);
    return signedUrl;

  } catch (error) {
    console.error('❌ Failed to generate presigned URL:', (error as Error).message);
    console.error('Error details:', (error as Error).message);
    throw new Error('Failed to generate secure video URL');
  }
}
