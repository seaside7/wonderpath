import type { BookTheme } from "@/components/marketing/content";

export const COVER_BG: Record<BookTheme, string> = {
  space: "bg-gradient-to-br from-[#1b1446] via-[#3b2a8f] to-[#e2557a]",
  flag: "bg-gradient-to-br from-[#b3202c] via-[#e0303c] to-[#f6b44a]",
  tree: "bg-gradient-to-br from-[#2e7d4a] via-[#45a35e] to-[#c9e86b]",
  letter: "bg-gradient-to-br from-[#7a3e9d] via-[#b05fb5] to-[#f2b7c6]",
  ocean: "bg-gradient-to-br from-[#0b4f7a] via-[#1288b4] to-[#5fd6d0]",
  plane: "bg-gradient-to-br from-[#2a5bd7] via-[#4f8cf0] to-[#bfe3ff]",
};

export function CoverArt({ theme }: { theme: BookTheme }) {
  switch (theme) {
    case "space":
      return (
        <svg viewBox="0 0 200 140" aria-hidden="true" className="h-full w-full">
          <circle cx="132" cy="68" r="34" fill="#ff7a59" />
          <circle cx="122" cy="58" r="7" fill="#e2553a" />
          <circle cx="146" cy="80" r="5" fill="#e2553a" />
          <ellipse cx="132" cy="70" rx="58" ry="12" fill="none" stroke="#ffd36e" strokeWidth="4" />
          <path d="M40 104 l14 -40 l14 40 Z" fill="#f4f4ff" />
          <rect x="47" y="104" width="14" height="8" rx="2" fill="#ffb347" />
          {[[20, 20], [70, 30], [180, 24], [168, 118], [30, 70], [100, 18]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#fff" />
          ))}
        </svg>
      );
    case "flag":
      return (
        <svg viewBox="0 0 200 140" aria-hidden="true" className="h-full w-full">
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M100 150 L${-20 + i * 30} -10 L${-5 + i * 30} -10 Z`} fill="#ffffff" opacity="0.1" />
          ))}
          <rect x="62" y="22" width="4" height="108" rx="2" fill="#fff6e0" />
          <path d="M66 26 C 96 18, 116 36, 146 28 L146 52 C 116 60, 96 42, 66 50 Z" fill="#ffffff" />
          <path d="M66 26 C 96 18, 116 36, 146 28 L146 40 C 116 48, 96 30, 66 38 Z" fill="#c8102e" />
          <circle cx="64" cy="20" r="5" fill="#ffd36e" />
        </svg>
      );
    case "tree":
      return (
        <svg viewBox="0 0 200 140" aria-hidden="true" className="h-full w-full">
          <rect x="88" y="70" width="24" height="64" rx="6" fill="#7a4a24" />
          <path d="M92 134 q-20 -6 -34 6 M108 134 q20 -6 34 6" stroke="#7a4a24" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="52" r="36" fill="#1f6e3a" />
          <circle cx="68" cy="66" r="24" fill="#2b8a47" />
          <circle cx="132" cy="66" r="24" fill="#2b8a47" />
          <circle cx="100" cy="36" r="22" fill="#38a85a" />
          <circle cx="160" cy="26" r="10" fill="#fff3a8" />
        </svg>
      );
    case "letter":
      return (
        <svg viewBox="0 0 200 140" aria-hidden="true" className="h-full w-full">
          <rect x="44" y="44" width="96" height="66" rx="6" fill="#fff8ef" transform="rotate(-6 92 77)" />
          <path d="M48 52 L92 84 L136 48" stroke="#d7a2c2" strokeWidth="4" fill="none" transform="rotate(-6 92 77)" />
          <path d="M150 22 C 170 40, 150 70, 118 96" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M150 22 C 128 30, 122 50, 126 70 C 140 56, 152 40, 150 22 Z" fill="#ffe2ec" />
          <circle cx="40" cy="28" r="4" fill="#fff" opacity="0.8" />
          <circle cx="170" cy="112" r="5" fill="#fff" opacity="0.6" />
        </svg>
      );
    case "ocean":
      return (
        <svg viewBox="0 0 200 140" aria-hidden="true" className="h-full w-full">
          <path d="M0 40 q25 -12 50 0 t50 0 t50 0 t50 0 V0 H0 Z" fill="#ffffff" opacity="0.18" />
          <path d="M70 70 q20 -16 40 0 q-20 16 -40 0 Z" fill="#ffb347" />
          <path d="M110 70 l14 -10 v20 Z" fill="#ffb347" />
          <circle cx="80" cy="67" r="2.5" fill="#1b1446" />
          <path d="M30 140 q8 -40 4 -60 M44 140 q-6 -30 6 -50" stroke="#ff7a8a" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M150 140 q-4 -30 10 -46 M166 140 q2 -24 -6 -38" stroke="#ffd36e" strokeWidth="7" fill="none" strokeLinecap="round" />
          {[[120, 30], [130, 44], [116, 50]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="none" stroke="#fff" strokeWidth="2" />
          ))}
        </svg>
      );
    case "plane":
      return (
        <svg viewBox="0 0 200 140" aria-hidden="true" className="h-full w-full">
          <ellipse cx="48" cy="104" rx="34" ry="12" fill="#ffffff" opacity="0.85" />
          <ellipse cx="160" cy="40" rx="26" ry="9" fill="#ffffff" opacity="0.7" />
          <g transform="rotate(-18 100 70)">
            <rect x="52" y="62" width="104" height="16" rx="8" fill="#ffffff" />
            <path d="M92 64 L74 30 L86 30 L112 64 Z" fill="#e8f1ff" />
            <path d="M92 76 L74 110 L86 110 L112 76 Z" fill="#e8f1ff" />
            <path d="M58 64 L48 46 L56 46 L68 64 Z" fill="#e8f1ff" />
            <circle cx="140" cy="70" r="3" fill="#2a5bd7" />
            <circle cx="128" cy="70" r="3" fill="#2a5bd7" />
            <circle cx="116" cy="70" r="3" fill="#2a5bd7" />
          </g>
        </svg>
      );
  }
}

const FALLBACK_THEMES: BookTheme[] = ["space", "tree", "ocean", "plane", "letter", "flag"];

// Sample books keep their art theme here; anything else (e.g. a generated
// book without a cover) gets a stable theme from its reading level.
const THEME_BY_BOOK_ID: Record<string, BookTheme> = {
  "story-misi-planet-merah": "space",
  "story-pohon-beringin": "tree",
  "story-penjaga-terumbu": "ocean",
  "story-soekarno": "flag",
  "story-kartini": "letter",
  "story-habibie": "plane",
};

export function themeForBook(bookId: string, trailStop: number): BookTheme {
  return (
    THEME_BY_BOOK_ID[bookId] ??
    FALLBACK_THEMES[Math.abs(trailStop) % FALLBACK_THEMES.length]
  );
}
