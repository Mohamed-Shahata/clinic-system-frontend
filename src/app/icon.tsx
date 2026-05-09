import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1565C0",
        borderRadius: 7,
      }}
    >
      {/* Medical Cross SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="9" y="2" width="6" height="20" rx="2" fill="white" />
        <rect x="2" y="9" width="20" height="6" rx="2" fill="white" />
      </svg>
    </div>,
    size,
  );
}
