import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus, FileText, Sparkles } from "lucide-react";

interface WorkflowAction {
  label: string;
  icon: React.ReactNode;
  href: string;
  description: string;
}

interface QuickActionsProps {
  context?: "project" | "spec" | "generator";
  projectId?: string;
  specId?: string;
}

export function QuickActions({ context, projectId, specId }: QuickActionsProps) {
  const [, setLocation] = useLocation();

  const actions: WorkflowAction[] = [];

  // Context-based actions
  if (context === "project" && projectId) {
    actions.push({
      label: "Create Spec",
      icon: <FileText className="h-4 w-4" />,
      href: `/spec-editor?projectId=${projectId}`,
      description: "Add a new specification to this project",
    });
    actions.push({
      label: "Generate Code",
      icon: <Sparkles className="h-4 w-4" />,
      href: `/admin/generator?projectId=${projectId}`,
      description: "Generate code for this project",
    });
  }

  if (context === "spec" && specId) {
    actions.push({
      label: "Generate App",
      icon: <Sparkles className="h-4 w-4" />,
      href: `/admin/generator?specId=${specId}`,
      description: "Generate code from this specification",
    });
  }

  if (context === "generator") {
    actions.push({
      label: "New Project",
      icon: <Plus className="h-4 w-4" />,
      href: "/projects",
      description: "Create a new project",
    });
    actions.push({
      label: "View Specs",
      icon: <FileText className="h-4 w-4" />,
      href: "/spec-editor",
      description: "Manage specifications",
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <Button
          key={action.href}
          variant="outline"
          size="sm"
          onClick={() => setLocation(action.href)}
          className="gap-2"
          title={action.description}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
