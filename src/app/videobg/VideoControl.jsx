"use client"
import React, { useRef, useEffect } from "react";
import { useScroll, useTransform } from "framer-motion";
// import SampleVideo from "./testvideo.mp4";

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/**
 * Horizontal pan mapping (in pixels):
 *  - 0..settleStart: oscillate between -A..+A using sine (edge-to-edge swings).
 *  - settleStart..1: ease back to 0 (centered).
 */
function computeTranslateX(progress, viewportWidth, {
  settleStart = 0.9,   // start returning to center at 90% scroll
  panAmplitudeVW = 0.2, // 20% of viewport width to each side
  panCycles = 3         // number of full swings before settling
} = {}) {
  const p = clamp01(progress);
  const A = viewportWidth * panAmplitudeVW;

  if (p <= 0) return -A;
  if (p >= 1) return 0;

  if (p < settleStart) {
    const local = p / settleStart; // 0..1
    const x = Math.sin(local * Math.PI * 2 * panCycles) * A; // -A..A
    return x;
  } else {
    // Ease back to 0 in the final segment
    const local = (p - settleStart) / (1 - settleStart); // 0..1
    const startX = Math.sin(1 * Math.PI * 2 * panCycles) * A; // ~0
    const t = local < 0.5 ? 4 * local * local * local : 1 - Math.pow(-2 * local + 2, 3) / 2;
    return startX + (0 - startX) * t;
  }
}

const ScrollFixedVideo = ({
  src,
  start = 0,
  distance = 1500,
  controls = false,
  settleStart = 0.9,
  panAmplitudeVW = 0.2,
  panCycles = 3
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const { scrollY } = useScroll();

  // Map window scroll to progress [0..1]
  const progressMotion = useTransform(scrollY, [start, start + distance], [0, 1]);

  // Drive video currentTime from scroll progress
  useEffect(() => {
    const unsub = progressMotion.on("change", (p) => {
      const v = videoRef.current;
      if (!v) return;
      const d = v.duration;
      if (!isFinite(d) || d <= 0) return;
      v.currentTime = clamp01(p) * d;
      if (!v.paused) v.pause();
    });
    return () => unsub();
  }, [progressMotion]);

  // Apply horizontal translate to the container as scroll changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = (p) => {
      const vw = window.innerWidth || 1;
      const x = computeTranslateX(p, vw, { settleStart, panAmplitudeVW, panCycles });
      // Optional slight scale to avoid revealing edges at extreme pans
      el.style.transform = `translateX(${x}px)`;
    };

    const unsub = progressMotion.on("change", update);
    // Initialize position
    update(progressMotion.get ? progressMotion.get() : 0);

    // Keep in sync on resize (since amplitude depends on viewport width)
    const onResize = () => update(progressMotion.get ? progressMotion.get() : 0);
    window.addEventListener("resize", onResize);
    return () => {
      unsub && unsub();
      window.removeEventListener("resize", onResize);
    };
  }, [progressMotion, settleStart, panAmplitudeVW, panCycles]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (!isFinite(d) || d <= 0) return;
    const p = progressMotion.get ? progressMotion.get() : 0;
    v.currentTime = clamp01(p || 0) * d;
    v.pause();
  };

  return (
    <div style={{ position: "relative", minHeight: "200vh",backgroundColor:"black" }}>
      {/* Fullscreen fixed video background with horizontal pan applied */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: "#000",
          pointerEvents: "none",
          transformOrigin: "50% 50%",
          willChange: "transform",
        }}
      >
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          playsInline
          controls={controls}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onLoadedMetadata={onLoadedMetadata}
        />
      </div>

      {/* Scrollable content above the video */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 800,
          margin: "0 auto",
          padding: "24px",
          color: "white",
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ height: 80 }} />
        <h1 style={{ fontSize: 40, marginBottom: 16 }}>Scroll to Pan the Video</h1>
        <p style={{ marginBottom: 24 }}>
          As you scroll, the fullscreen video slides left and right, then returns to the centered position at the end.
        </p>

        <Section title="Intro" />
        <Section title="Chapter 1" />
        <Section title="Chapter 2" />
        <Section title="Chapter 3" />
        <Section title="Conclusion" />

        <div style={{ height: Math.max(0, distance - 600) }} />
      </div>
    </div>
  );
};

const Section = ({ title = "Section" }) => (
  <div style={{ marginBottom: 48 }}>
    <h2 style={{ fontSize: 28, marginBottom: 12 }}>{title}</h2>
    <p style={{ lineHeight: 1.8 }}>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer placerat, magna in dignissim finibus,
      libero nunc eleifend felis, sit amet consectetur metus nulla id eros. Vestibulum ante ipsum primis in
      faucibus orci luctus et ultrices posuere cubilia curae; Curabitur luctus, tortor sit amet dapibus eleifend,
      tortor massa semper nulla, ut pretium turpis urna non nisl. Cras venenatis orci at eros vehicula,
      a volutpat diam eleifend. Suspendisse potenti. Proin dapibus, enim id faucibus laoreet, risus lectus fermentum metus,
      quis interdum ante arcu non augue. Sed ac iaculis tellus.
    </p>
  </div>
);

export default function ScrollVideoComponent() {
  return (
    <ScrollFixedVideo
      // src={SampleVideo}
      src={"./testvideo.mp4"}

      start={0}
      distance={2000}
      controls={false}
      settleStart={0.9}   // start easing back to center at 90%
      panAmplitudeVW={0.2} // ±20% viewport width
      panCycles={3}       // increase for more swings
    />
  );
}