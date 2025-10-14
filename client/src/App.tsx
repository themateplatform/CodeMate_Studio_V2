import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { CollaborationProvider } from "@/lib/collaboration-context";
import { useAuth } from "@/hooks/useAuth";
import { GlobalShell } from "@/components/layout/GlobalShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAInstallPrompt, NetworkStatusBadge } from "@/components/pwa/PWAComponents";
import LandingPage from "@/pages/landing";
import IDEPage from "@/pages/ide";
import ProjectsPageSimplified from "./pages/projects-simplified";
import { ProjectsDashboard } from "./pages/projects-dashboard";
import AppBuilderPage from "./pages/app-builder";
import SpecEditorPage from "./pages/spec-editor";
import TemplatesPage from "./pages/templates";
import ComponentsPage from "./pages/components";
import AIAssistantPage from "./pages/ai-assistant";
import DeployPage from "./pages/deploy";
import SettingsPage from "./pages/settings";
import SecretsPage from "./pages/secrets";
import LoginPage from "./pages/login";
import PricingPage from "./pages/pricing";
import DocsPage from "./pages/docs";
import AboutPage from "./pages/about";
import GeneratorPage from "./pages/generator";
import AdminPage from "./pages/admin";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import NotFound from "@/pages/not-found";

// Authentication and public routes
function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/projects" component={ProjectsDashboard} />
      <Route path="/projects-old" component={ProjectsPageSimplified} />
      <Route path="/app-builder" component={AppBuilderPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/spec-editor" component={SpecEditorPage} />
      <Route path="/ide/:projectId">
        {() => (
          <GlobalShell>
            <IDEPage />
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
      <Route path="/admin/generator">
        {() => (
          <GlobalShell>
            <GeneratorPage />
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
      <Route path="/pricing" component={PricingPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log('[DEBUG] App component rendering...');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CollaborationProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
              <PWAInstallPrompt />
              <NetworkStatusBadge />
            </TooltipProvider>
          </CollaborationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
