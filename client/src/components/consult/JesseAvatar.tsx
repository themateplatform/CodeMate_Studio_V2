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
        {/* Sparkle icon */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={cn("w-1/2 h-1/2", size === "lg" && "w-2/3 h-2/3")}
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
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
