import { useLocation } from "wouter";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Code2, 
  Palette, 
  Package, 
  Settings, 
  FolderOpen,
  Play,
  Share2,
  Command,
  Search,
  Rocket,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PWAStatusIndicator } from "@/components/PWAStatusIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

interface GlobalShellProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    path: "/projects",
    icon: LayoutDashboard,
    label: "Projects",
    shortcut: "⌘1"
  },
  {
    path: "/app-builder",
    icon: Sparkles,
    label: "AI App Builder",
    shortcut: "⌘A",
    badge: "NEW"
  },
  {
    path: "/ide",
    icon: Code2,
    label: "Studio",
    shortcut: "⌘2",
    badge: "AI"
  },
  {
    path: "/templates",
    icon: Package,
    label: "Templates",
    shortcut: "⌘3"
  },
  {
    path: "/components",
    icon: Palette,
    label: "Components",
    shortcut: "⌘4"
  },
  {
    path: "/settings",
    icon: Settings,
    label: "Settings",
    shortcut: "⌘,"
  }
];

export function GlobalShell({ children }: GlobalShellProps) {
  const [location, navigate] = useLocation();
  
  // Fetch user projects for project switcher
  const { data: user } = useQuery<{ id: string; email: string }>({ 
    queryKey: ["/api/auth/user"] 
  });
  
  const { data: projects = [] } = useQuery<Array<{ id: string; name: string; githubRepoUrl?: string }>>({ 
    queryKey: ["/api/projects/user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/projects/user/${user.id}`);
      if (!response.ok) throw new Error('Failed to load projects');
      return response.json();
    },
    enabled: !!user?.id
  });

  const currentProject = projects.find(p => 
    location.includes(`/ide/${p.id}`) || location.includes(`/project/${p.id}`)
  );

  const isIDERoute = location.startsWith('/ide/');

  return (
    <div className="h-screen flex bg-background">
      {/* Left Navigation Sidebar */}
      <aside className="nav-shell w-64 flex flex-col border-r border-border">
        {/* Logo & Project Switcher */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <img src="https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2Fcf2bb14f9f634632acd8da085020bfdb?format=webp&width=800" alt="BuildMate Studio Logo" className="h-8 w-auto" />
            <div>
              <h1 className="font-heading font-semibold text-sm text-foreground">BuildMate Studio</h1>
              <p className="text-xs text-muted-foreground">Creative Coding Platform</p>
            </div>
          </div>
          
          {/* Project Switcher */}
          {projects.length > 0 && (
            <Select 
              value={currentProject?.id || ""} 
              onValueChange={(projectId) => {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                  navigate(`/ide/${projectId}`);
                }
              }}
            >
              <SelectTrigger className="w-full bg-secondary/50 border-border">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      <span className="truncate">{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map(({ path, icon: Icon, label, shortcut, badge }) => {
            const isActive = location === path || (path === "/ide" && isIDERoute) || (path === "/projects" && location === "/");
            const href = path === "/ide" && currentProject ? `/ide/${currentProject.id}` : path;
            const isDisabled = path === "/ide" && !currentProject;
            
            return (
              <div key={path}>
                {isDisabled ? (
                  <div 
                    className={`nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-not-allowed opacity-50`}
                    data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
                    title="Select a project to open the IDE"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{label}</span>
                    <div className="flex items-center gap-2">
                      {badge && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {badge}
                        </Badge>
                      )}
                      <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {shortcut}
                      </kbd>
                    </div>
                  </div>
                ) : (
                  <Link href={href}>
                    <div 
                      className={`nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer ${
                        isActive ? 'active' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1">{label}</span>
                      <div className="flex items-center gap-2">
                        {badge && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {badge}
                          </Badge>
                        )}
                        <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {shortcut}
                        </kbd>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <Separator className="mx-4" />
        
        {/* User Section */}
        <div className="p-4">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
              <p className="text-xs text-muted-foreground">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Action Bar */}
        <header className="action-bar h-12 px-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-4">
            {/* Quick Actions */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-command-palette"
            >
              <Command className="w-4 h-4" />
              <span className="hidden md:inline">Command Palette</span>
              <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-search-files"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search Files</span>
              <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded">⌘P</kbd>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* PWA Status and Install Prompt */}
            <PWAStatusIndicator />
            <PWAInstallPrompt />
            
            {/* Run/Deploy Actions - Show only in IDE */}
            {isIDERoute && (
              <>
                <Button 
                  size="sm" 
                  className="btn-secondary gap-2"
                  data-testid="button-run-project"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Run</span>
                  <kbd className="text-xs bg-black/20 px-1.5 py-0.5 rounded">⌘R</kbd>
                </Button>
                
                <Button 
                  size="sm" 
                  className="btn-primary gap-2"
                  data-testid="button-deploy-project"
                >
                  <Rocket className="w-4 h-4" />
                  <span className="hidden sm:inline">Deploy</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  data-testid="button-share-project"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </>
            )}

            {/* GitHub Integration Status */}
            {currentProject?.githubRepoUrl && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                GitHub Synced
              </Badge>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
