import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Nativelet - open-source React Native components with live previews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fafafa",
          padding: 72,
          color: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
          <span style={{ color: "#16a34a", marginRight: 12 }}>n.</span> nativelet
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            React Native components,
          </div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: "#16a34a" }}>
            with live previews.
          </div>
          <div style={{ fontSize: 32, color: "#525252", marginTop: 28 }}>
            12 open-source components. Try one, copy the source. MIT.
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#737373" }}>nativelet.netlify.app</div>
      </div>
    ),
    size,
  );
}
