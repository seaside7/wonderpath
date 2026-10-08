import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!filename || !filename.endsWith(".mp3")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const res = await fetch(`${API_BASE}/tts/${filename}`, {
      headers: {
        Authorization: request.headers.get("Authorization") ?? "",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
