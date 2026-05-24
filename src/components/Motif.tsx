import motif from "@/assets/motif.png";

export function MotifBg({ className = "", opacity = 0.07 }: { className?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `url(${motif})`,
        backgroundRepeat: "repeat",
        backgroundSize: "220px",
        opacity,
        mixBlendMode: "multiply",
      }}
    />
  );
}

export function MotifBand({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-3 w-full ${className}`}
      style={{
        backgroundImage: `url(${motif})`,
        backgroundRepeat: "repeat-x",
        backgroundSize: "auto 100%",
        opacity: 0.5,
      }}
    />
  );
}
