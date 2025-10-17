import { cn } from "@/lib/utils";

export type JesseState = "listening" | "thinking" | "excited" | "thoughtful" | "neutral";

interface JesseAvatarProps {
  state?: JesseState;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const stateConfig = {
  listening: { glow: "animate-pulse", label: "Listening" },
  thinking: { glow: "animate-bounce", label: "Thinking" },
  excited: { glow: "animate-pulse", label: "Excited" },
  thoughtful: { glow: "", label: "Thoughtful" },
  neutral: { glow: "", label: "Ready" },
};

const sizeConfig = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function JesseAvatar({ state = "neutral", size = "md", className }: JesseAvatarProps) {
  const config = stateConfig[state];
  const sizeClass = sizeConfig[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Glow ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)]",
          config.glow
        )}
        style={{ filter: "blur(8px)", opacity: 0.4 }}
      />

      {/* Avatar */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] text-white font-semibold",
          sizeClass
        )}
      >
        {/* Robot icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("w-1/2 h-1/2", size === "lg" && "w-2/3 h-2/3")}
        >
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      </div>

      {/* Status label (optional, for debugging) */}
      {size === "lg" && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/60 whitespace-nowrap">
          {config.label}
        </div>
      )}
    </div>
  );
}
