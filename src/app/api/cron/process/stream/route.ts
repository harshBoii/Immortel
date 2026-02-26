// app/api/cron/process-stream-queue/route.js
import { NextResponse } from "next/server";
import { processQueue } from "@/lib/stream";

export async function GET(request: Request) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await processQueue(10); // Process 10 items per cron run

    return NextResponse.json({
      success: true,
      processed: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
