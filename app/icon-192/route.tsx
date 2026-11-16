import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 42, background: "#286653", color: "white", fontFamily: "Arial, sans-serif", fontSize: 120, fontWeight: 600, letterSpacing: -12, paddingRight: 10 }}
    >
      m
    </div>,
    { width: 192, height: 192 },
  );
}
