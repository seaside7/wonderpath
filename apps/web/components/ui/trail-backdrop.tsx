// A quiet, decorative trail winding behind a page's content - the one
// recurring visual texture tying every screen back to "WonderPath" /
// the existing waypoint/trail color tokens, instead of empty space.
// Deliberately low-contrast and `pointer-events-none`; never load-bearing
// for layout, safe to ignore for accessibility (aria-hidden).
export default function TrailBackdrop({
  variant = "calm",
}: {
  variant?: "calm" | "playful";
}) {
  const dotColor = variant === "playful" ? "var(--color-waypoint)" : "var(--color-trail)";

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      preserveAspectRatio="xMidYMin slice"
      viewBox="0 0 1280 1600"
      fill="none"
    >
      <path
        d="M -40 120 C 180 80, 260 40, 460 90 S 780 40, 1320 160"
        stroke="var(--color-ink)"
        strokeOpacity="0.11"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 18"
      />
      <path
        d="M -40 620 C 220 580, 340 760, 560 720 S 860 580, 980 740 S 1180 980, 1020 1100 S 640 1200, 680 1380 S 1060 1540, 940 1600"
        stroke="var(--color-ink)"
        strokeOpacity="0.11"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 18"
      />
      {[
        [460, 90],
        [1020, 1100],
        [680, 1380],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="8"
          fill={dotColor}
          opacity="0.3"
        />
      ))}
    </svg>
  );
}
