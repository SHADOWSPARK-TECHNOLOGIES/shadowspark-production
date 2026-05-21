/**
 * SovereignNode — Minimalist geometric "S" logo
 *
 * Obsidian HUD Edition. Emerald/Gold palette.
 * Represents the "Sovereign Node" brandmark for Project Shadowspark.
 * Pure SVG, no external deps. Renders a sharp, faceted 'S' composed
 * of interconnected polygons, evoking a blockchain node / data vertex.
 */

type SovereignLogoProps = {
  className?: string;
  size?: number;
  animated?: boolean;
  variant?: "emerald" | "gold";
};

export function SovereignLogo({
  className = "",
  size = 48,
  animated = true,
  variant = "emerald",
}: SovereignLogoProps) {
  const primaryColor = variant === "gold" ? "#c9922a" : "#10956a";
  const secondaryColor = variant === "gold" ? "#dba33b" : "#14b87a";
  const dimColor = variant === "gold" ? "rgba(201,146,42,0.2)" : "rgba(16,149,106,0.2)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Sovereign Node"
    >
      {/* Outer hexagon / shield border */}
      <polygon
        points="24,2 44,13 44,35 24,46 4,35 4,13"
        stroke={dimColor}
        strokeWidth="1.5"
        fill="none"
        {...(animated
          ? { style: { animation: "sovereign-pulse 4s ease-in-out infinite" } }
          : {})}
      />

      {/* Inner geometric "S" — three connected facets */}
      <path
        d="M16 16 L24 10 L32 16 L28 24 L20 24 L16 32 L24 38 L32 32"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Central node dot — the "spark" */}
      <circle
        cx="24"
        cy="24"
        r="2.5"
        fill={secondaryColor}
        {...(animated
          ? {
              style: {
                animation: "sovereign-glow 2s ease-in-out infinite",
              },
            }
          : {})}
      />

      {/* Orbital data vertices */}
      <circle cx="24" cy="10" r="1.5" fill={primaryColor} />
      <circle cx="32" cy="16" r="1.5" fill={primaryColor} />
      <circle cx="32" cy="32" r="1.5" fill={primaryColor} />
      <circle cx="24" cy="38" r="1.5" fill={primaryColor} />
      <circle cx="16" cy="32" r="1.5" fill={primaryColor} />
      <circle cx="16" cy="16" r="1.5" fill={primaryColor} />

      {/* Style tag for animations (minimal, self-contained) */}
      {animated && (
        <style>{`
          @keyframes sovereign-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
          @keyframes sovereign-glow {
            0%, 100% { r: 2.5; opacity: 1; }
            50% { r: 4; opacity: 0.6; }
          }
        `}</style>
      )}
    </svg>
  );
}

export default SovereignLogo;
