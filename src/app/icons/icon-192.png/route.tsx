import { ImageResponse } from "next/og";

export const runtime = "edge";
const iconSize = { width: 192, height: 192 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
          borderRadius: 42,
        }}
      >
        <svg width="112" height="112" viewBox="0 0 24 24" fill="white">
          <rect x="9" y="2" width="6" height="20" rx="1.6" />
          <rect x="2" y="9" width="20" height="6" rx="1.6" />
        </svg>
      </div>
    ),
    iconSize,
  );
}
