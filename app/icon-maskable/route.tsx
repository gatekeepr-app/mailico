import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#286653", color: "white", fontFamily: "Arial, sans-serif", fontSize: 270, fontWeight: 600, letterSpacing: -27, paddingRight: 22 }}
    >
      m
    </div>,
    { width: 512, height: 512 },
  );
}
