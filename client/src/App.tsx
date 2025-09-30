import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { GlobalShell } from "@/components/layout/GlobalShell";
import LandingPage from "@/pages/landing";
import IDEPage from "@/pages/ide";
import ProjectsPageSimplified from "./pages/projects-simplified";
import AppBuilderPage from "./pages/app-builder";
import TemplatesPage from "./pages/templates";
import ComponentsPage from "./pages/components";
import AIAssistantPage from "./pages/ai-assistant";
import DeployPage from "./pages/deploy";
import SettingsPage from "./pages/settings";
import SecretsPage from "./pages/secrets";
import NotFound from "@/pages/not-found";

// No authentication - direct access to all routes
function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/projects" component={ProjectsPageSimplified} />
      <Route path="/app-builder" component={AppBuilderPage} />
      <Route path="/ide/:projectId">
        {(params) => (
          <GlobalShell>
            <IDEPage params={params} />
          </GlobalShell>
        )}
      </Route>
      <Route path="/templates">
        {() => (
          <GlobalShell>
            <TemplatesPage />
          </GlobalShell>
        )}
      </Route>
      <Route path="/components">
        {() => (
          <GlobalShell>
            <ComponentsPage />
          </GlobalShell>
        )}
      </Route>
      <Route path="/ai">
        {() => (
          <GlobalShell>
            <AIAssistantPage />
          </GlobalShell>
        )}
      </Route>
      <Route path="/deploy">
        {() => (
          <GlobalShell>
            <DeployPage />
          </GlobalShell>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <GlobalShell>
            <SettingsPage />
          </GlobalShell>
        )}
      </Route>
      <Route path="/secrets">
        {() => (
          <GlobalShell>
            <SecretsPage />
          </GlobalShell>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <Toaster />
          <Router />
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
