import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { LiveSpec } from "@/lib/consultation-flow";

interface SpecSidebarProps {
  spec: LiveSpec;
  phase: number;
  onClose?: () => void;
  className?: string;
}

export function SpecSidebar({ spec, phase, onClose, className }: SpecSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    goal: true,
    audience: true,
    success: true,
  });

  const toggle = (section: string) => {
    setExpanded((e) => ({ ...e, [section]: !e[section] }));
  };

  return (
    <div className={cn(
      "bg-white/5 border-l border-white/10 overflow-y-auto",
      className
    )}>
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div>
          <h3 className="text-sm font-semibold text-white">Spec Builder</h3>
          <p className="text-xs text-white/60">Phase {phase}/6</p>
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Goal */}
        {spec.goal && (
          <div className="space-y-2">
            <button
              onClick={() => toggle("goal")}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-xs font-semibold text-white/70 uppercase">Goal</span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-white/50 transition-transform",
                  expanded.goal && "rotate-180"
                )}
              />
            </button>
            {expanded.goal && (
              <p className="text-sm text-white/80 leading-relaxed">{spec.goal}</p>
            )}
          </div>
        )}

        {/* Audience */}
        {spec.audience.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => toggle("audience")}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-xs font-semibold text-white/70 uppercase">Audience</span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-white/50 transition-transform",
                  expanded.audience && "rotate-180"
                )}
              />
            </button>
            {expanded.audience && (
              <div className="space-y-1">
                {spec.audience.map((aud, i) => (
                  <div key={i} className="text-sm text-white/70 flex items-start gap-2">
                    <span className="text-white/40">•</span>
                    <span>{aud}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Success Metric */}
        {spec.successMetric && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-white/70 uppercase block">Success Metric</span>
            <p className="text-sm text-white/80">{spec.successMetric}</p>
          </div>
        )}

        {/* Pages */}
        {spec.pages.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-white/70 uppercase block">Pages</span>
            <div className="flex flex-wrap gap-2">
              {spec.pages.map((page, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white/80 text-xs"
                >
                  {page}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Integrations */}
        {spec.integrations.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-white/70 uppercase block">Integrations</span>
            <div className="flex flex-wrap gap-2">
              {spec.integrations.map((int, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white/80 text-xs"
                >
                  {int}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tech Level & Vibe */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {spec.techLevel !== "intermediate" && (
            <div>
              <span className="text-white/60">Tech Level</span>
              <div className="text-white/80 font-medium capitalize">{spec.techLevel}</div>
            </div>
          )}
          {spec.designVibe !== "elegant" && (
            <div>
              <span className="text-white/60">Design Vibe</span>
              <div className="text-white/80 font-medium capitalize">{spec.designVibe}</div>
            </div>
          )}
        </div>

        {/* Notes */}
        {spec.notes.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/10">
            <span className="text-xs font-semibold text-white/70 uppercase block">Notes</span>
            <div className="space-y-1">
              {spec.notes.map((note, i) => (
                <p key={i} className="text-xs text-white/60 italic">{note}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="px-4 py-3 border-t border-white/10 mt-3">
        <div className="w-full bg-white/10 rounded-full h-1">
          <div
            className="bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] h-1 rounded-full transition-all duration-300"
            style={{ width: `${(phase / 6) * 100}%` }}
          />
        </div>
        <p className="text-xs text-white/60 mt-2 text-center">{phase}/6 Complete</p>
      </div>
    </div>
  );
}
