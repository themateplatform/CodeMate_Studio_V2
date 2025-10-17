import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Code2,
  Github,
  Layers,
  Link as LinkIcon,
  MessageSquare,
  Paperclip,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

type PlanSummary = {
  goal: string;
  sections: string[];
  actions: string[];
  niceToHaves: string[];
  needsClarification: boolean;
  question: string;
  combinedBrief: string;
};

const galleryProjects = [
  {
    id: "atelier-nova",
    name: "Atelier Nova",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=960&q=75",
    link: "https://atelier-nova.example.com",
  },
  {
    id: "grain-and-grit",
    name: "Grain & Grit Coffee",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=960&q=75",
    link: "https://grainandgrit.example.com",
  },
  {
    id: "cobalt-labs",
    name: "Cobalt Labs",
    image:
      "https://images.unsplash.com/photo-1487611459768-bd414656ea10?auto=format&fit=crop&w=960&q=75",
    link: "https://cobalt-labs.example.com",
  },
  {
    id: "aurora-retreats",
    name: "Aurora Retreats",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=960&q=75",
    link: "https://aurora-retreats.example.com",
  },
  {
    id: "wayfinder",
    name: "Wayfinder Tours",
    image:
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=960&q=75",
    link: "https://wayfinder.example.com",
  },
  {
    id: "studio-mosaic",
    name: "Studio Mosaic",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=960&q=75",
    link: "https://studio-mosaic.example.com",
  },
];

const whyCards = [
  {
    title: "Briefs, not guesses",
    description: "We turn your idea into a clear plan before code starts.",
    icon: Sparkles,
  },
  {
    title: "An AI Design Partner",
    description:
      "Meet Jesse. Shape the brief. Decide fast. Then build.",
    icon: MessageSquare,
  },
  {
    title: "Ownable code",
    description: "Your repo, your rules. We raise clean PRs.",
    icon: Workflow,
  },
  {
    title: "No demo fluff",
    description: "Production settings from day one. No fake data.",
    icon: ShieldCheck,
  },
  {
    title: "Small, honest changes",
    description: "Tidy diffs with the why spelled out.",
    icon: Layers,
  },
  {
    title: "Fast preview, real feedback",
    description: "Share a link, get sign-off, ship.",
    icon: PlayCircle,
  },
];

const createPlanSummary = (text: string, attachments: string[]): PlanSummary => {
  const trimmed = text.trim();
  const sentences = trimmed
    .split(/[\n\.]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const needsClarification = trimmed.length < 40;
  const goal = trimmed
    ? sentences[0]
    : "Launch a ready-to-share experience that reflects the brand.";

  const words = trimmed.split(/\s+/).filter(Boolean);
  const inferredPages = sentences
    .slice(1, 5)
    .map((sentence) => sentence.replace(/^[-•\d\s]+/, ""))
    .filter(Boolean);

  const fallbackPages = [
    "Homepage hero with clear value prop",
    "How it works section",
    "Pricing or offer breakdown",
    "Contact or booking CTA",
  ];

  const actions = [
    "Gather brand assets and tone in one place",
    "Draft user journey and approvals",
    "Hook up authentication and primary CTA",
    "Stage a shareable preview for sign-off",
  ];

  const niceToHaves = [
    "Integrate CMS for fast edits",
    "Add analytics to track engagement",
    "Polish responsive states for launch devices",
  ];

  if (attachments.length) {
    actions.unshift("Review uploaded references before finalizing copy");
  }

  const combinedBrief = [goal, ...sentences.slice(1)].join(". ").trim();

  return {
    goal,
    sections: inferredPages.length ? inferredPages.slice(0, 6) : fallbackPages,
    actions: actions.slice(0, 4),
    niceToHaves: niceToHaves.slice(0, 3),
    needsClarification,
    question: needsClarification
      ? "What is the one outcome you need a visitor to achieve on day one?"
      : "",
    combinedBrief: combinedBrief || goal,
  };
};

const LOGO_SRC = "https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2Fd0552b1fb2604d9eb8dac79cd27b4993?format=webp&width=800";

function LogoLockup({ condensed }: { condensed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full px-4 py-2 transition-all motion-safe:duration-500 motion-reduce:transition-none",
        condensed ? "scale-90" : "scale-[1.2]"
      )}
      aria-label="CodeMate Studio"
    >
      <img
        src={LOGO_SRC}
        alt="CodeMate Studio"
        className={cn(
          "block object-contain",
          condensed ? "h-8 w-auto" : "h-20 w-auto md:h-24",
          "transition-all duration-500"
        )}
      />
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [idea, setIdea] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const [isPreBriefOpen, setIsPreBriefOpen] = useState(false);
  const [clarifyingAnswer, setClarifyingAnswer] = useState("");
  const [clarifyTouched, setClarifyTouched] = useState(false);
  const [attachmentLabels, setAttachmentLabels] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderCondensed(window.scrollY > 48);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const plan = useMemo(() => createPlanSummary(idea, attachmentLabels), [idea, attachmentLabels]);

  const handleLaunch = () => {
    setClarifyingAnswer("");
    setClarifyTouched(false);
    setIsPreBriefOpen(true);
  };

  const handleMeetJesse = () => {
    setIsPreBriefOpen(false);
    const params = new URLSearchParams();
    params.set("source", "pre-brief");
    if (plan.combinedBrief) {
      params.set("brief", plan.combinedBrief);
    }
    setLocation(`/ai-assistant?${params.toString()}`);
  };

  const handleJustBuild = () => {
    if (plan.needsClarification && !clarifyingAnswer.trim()) {
      setClarifyTouched(true);
      return;
    }

    const params = new URLSearchParams();
    params.set("mode", "auto");
    params.set("prompt", plan.combinedBrief);
    if (clarifyingAnswer.trim()) {
      params.set("clarification", clarifyingAnswer.trim());
    }
    setIsPreBriefOpen(false);
    setLocation(`/app-builder?${params.toString()}`);
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files).map((file) => file.name);
    setAttachmentLabels((current) => Array.from(new Set([...current, ...files])));
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-[color:var(--deep-navy)] text-foreground">
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all motion-safe:duration-500 motion-reduce:transition-none",
          "border-b border-border/30 backdrop-blur-md"
        )}
        style={{
          backgroundColor: isHeaderCondensed
            ? "color-mix(in srgb, var(--surfaces-background) 85%, transparent)"
            : "transparent",
        }}
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {isHeaderCondensed ? <LogoLockup condensed={true} /> : <div className="w-36" aria-hidden="true" /> }
          <div className="flex items-center gap-6 text-sm">
            <a className="text-white transition-colors" href="#why">
              Why CodeMate
            </a>
            <a className="text-white transition-colors" href="#gallery">
              Gallery
            </a>
            <a className="text-white transition-colors" href="#github-connect">
              GitHub
            </a>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="text-white transition-colors focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </button>
          </div>
        </div>
      </nav>

      <AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />

      <main className="pt-24">
        <section
          className="relative flex min-h-screen flex-col justify-center px-4 pb-24 pt-16"
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(140deg, var(--hotter-pink) 0%, var(--electric-purple) 65%, transparent 100%)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[color:var(--deep-navy)]/30" aria-hidden="true" />

          <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center text-center">
            <LogoLockup condensed={isHeaderCondensed} />
            <div className="mt-10 space-y-6">
              <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl md:text-6xl">
                Your Design Agency
                <br />
                On-Demand
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-white/80 sm:text-xl">
                Design Studio power. Instant build.
              </p>
            </div>

            <div className="mt-10 w-full max-w-3xl">
              <label htmlFor="idea-textarea" className="sr-only">
                Design brief prompt
              </label>
              <Textarea
                id="idea-textarea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="Tell us what you want to build… paste links or drop files."
                rows={isInputFocused ? 6 : 4}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className="min-h-[10rem] resize-none rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-base text-white shadow-lg backdrop-blur-md placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-semantic-primary"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                  aria-hidden="true"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAttachmentClick}
                  className="flex items-center gap-2 border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10"
                >
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  Attach file
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIdea((current) => `${current}\nLink: `)}
                  className="flex items-center gap-2 border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10"
                >
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  Paste reference
                </Button>
                <div className="ml-auto flex items-center gap-3">
                  <Button
                    size="lg"
                    onClick={handleLaunch}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] px-8 py-6 text-lg font-semibold text-white shadow-lg transition-transform motion-safe:hover:scale-105"
                  >
                    Launch
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              {attachmentLabels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/70">
                  {attachmentLabels.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-6 text-sm text-white/70">
              Launch creates a fast brief. Attachments stay private to your project.
            </p>
          </div>
        </section>

        <section
          id="github-connect"
          className="relative border-t border-white/10 bg-[color:var(--surfaces-background)]/60 px-4 py-16"
        >
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[2fr_1fr] md:items-center">
            <div className="space-y-4 text-white">
              <p className="text-sm uppercase tracking-wide text-white/60">
                Or connect an existing repository
              </p>
              <h2 className="text-3xl font-semibold">Connect GitHub</h2>
              <p className="text-white/70">
                Bring in your live repository, sync to CodeMate Studio, and keep your workflow intact. We branch
                as <span className="font-semibold">feat/auto-build-{"{slug}"}</span>, open human-readable PRs, and attach an instant preview.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  onClick={() => setLocation("/app-builder?connect=github")}
                  className="flex items-center gap-2 rounded-full bg-[color:var(--surfaces-card)] px-6 py-4 text-white hover:bg-[color:var(--surfaces-card)]/80"
                >
                  <Github className="h-5 w-5" aria-hidden="true" />
                  Connect GitHub
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/projects")}
                  className="text-white/70 hover:text-white"
                >
                  Open in CodeMate Studio
                </Button>
              </div>
            </div>
            <Card className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold">What happens next</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-white/70">
                <li>Authenticate with GitHub and pick a repo.</li>
                <li>We scaffold in a feature branch with clean commits.</li>
                <li>Preview links update with every push for faster reviews.</li>
              </ul>
            </Card>
          </div>
        </section>

        <section id="why" className="px-4 py-20">
          <div className="mx-auto max-w-6xl text-white">
            <Badge className="bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] text-white">
              Why CodeMate Studio is different
            </Badge>
            <h2 className="mt-6 text-4xl font-semibold">Why CodeMate Studio is different</h2>
            <p className="mt-3 max-w-2xl text-white/70">
              Plain-language plans. Honest automation. Software that earns trust with every deploy.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {whyCards.map(({ icon: Icon, title, description }) => (
                <Card
                  key={title}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-lg transition-transform motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)]">
                      <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                  </div>
                  <p className="text-white/70">{description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="border-t border-white/10 bg-[color:var(--surfaces-background)]/50 px-4 py-20">
          <div className="mx-auto max-w-6xl text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-4xl font-semibold">Built with CodeMate Studio</h2>
                <p className="mt-2 max-w-2xl text-white/70">
                  Real teams ship these live experiences with CodeMate Studio. Hover to see project details.
                </p>
              </div>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {galleryProjects.map((project) => (
                <a
                  key={project.id}
                  href={project.link}
                  className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={project.image}
                    alt={`${project.name} website preview`}
                    loading="lazy"
                    className="h-56 w-full object-cover transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--deep-navy)]/80 via-transparent to-transparent opacity-0 transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-6 opacity-0 transition-all motion-safe:duration-300 motion-safe:group-hover:translate-y-0 motion-safe:group-hover:opacity-100">
                    <p className="text-lg font-semibold text-white">{project.name}</p>
                    <span className="text-sm text-white/70">View</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Dialog open={isPreBriefOpen} onOpenChange={setIsPreBriefOpen}>
        <DialogContent className="max-w-2xl border border-white/10 bg-[color:var(--surfaces-card)] text-white">
          <DialogHeader>
            <DialogTitle>Here’s your quick plan.</DialogTitle>
            <DialogDescription className="text-white/70">
              A concise outline based on what you shared. Tweak it with Jesse or jump straight into build mode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="text-base font-semibold text-white">Goal</h3>
              <p className="mt-1 text-white/70">{plan.goal}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-white">Pages/Sections</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                  {plan.sections.map((section) => (
                    <li key={section}>{section}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Key actions</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                  {plan.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Nice-to-haves</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                {plan.niceToHaves.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {plan.needsClarification && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">{plan.question}</p>
                <Textarea
                  value={clarifyingAnswer}
                  onChange={(event) => {
                    setClarifyingAnswer(event.target.value);
                    setClarifyTouched(false);
                  }}
                  placeholder="Add one line to keep us pointed at the right goal."
                  className={cn(
                    "min-h-[96px] rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/60 focus-visible:ring-semantic-primary",
                    clarifyTouched && !clarifyingAnswer.trim() ? "ring-2 ring-feedback-destructive" : undefined
                  )}
                />
                {clarifyTouched && !clarifyingAnswer.trim() && (
                  <p className="text-xs text-feedback-destructive">Please answer before building so we stay aligned.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={handleMeetJesse}
                className="flex-1 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                Meet Jesse (AI Design Help)
              </Button>
              <Button
                type="button"
                onClick={handleJustBuild}
                className="flex-1 rounded-full bg-gradient-to-r from-[color:var(--core-brand-primary)] to-[color:var(--core-brand-secondary)] text-white"
              >
                Just Build
              </Button>
            </div>
            <a
              href="#github-connect"
              className="text-center text-sm text-white/60 hover:text-white"
            >
              Connect GitHub instead
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
