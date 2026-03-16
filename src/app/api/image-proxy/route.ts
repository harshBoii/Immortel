import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "Missing `url` query parameter" },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(url);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch upstream image",
          status: upstream.status,
        },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("image-proxy error:", err);
    return NextResponse.json(
      { success: false, error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

