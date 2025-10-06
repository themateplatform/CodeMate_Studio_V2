import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { GlobalShell } from "@/components/layout/GlobalShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lazy load pages for better code splitting
const LandingPage = lazy(() => import("@/pages/landing"));
const IDEPage = lazy(() => import("@/pages/ide"));
const ProjectsPageSimplified = lazy(() => import("./pages/projects-simplified"));
const AppBuilderPage = lazy(() => import("./pages/app-builder"));
const TemplatesPage = lazy(() => import("./pages/templates"));
const ComponentsPage = lazy(() => import("./pages/components"));
const AIAssistantPage = lazy(() => import("./pages/ai-assistant"));
const DeployPage = lazy(() => import("./pages/deploy"));
const SettingsPage = lazy(() => import("./pages/settings"));
const SecretsPage = lazy(() => import("./pages/secrets"));
const PricingPage = lazy(() => import("./pages/pricing"));
const DocsPage = lazy(() => import("./pages/docs"));
const AboutPage = lazy(() => import("./pages/about"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-4">
      <LoadingSpinner size="lg" className="text-primary" />
      <p className="text-sm text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

// No authentication - direct access to all routes
function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        )}
      </Route>
      <Route path="/projects">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <ProjectsPageSimplified />
          </Suspense>
        )}
      </Route>
      <Route path="/app-builder">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <AppBuilderPage />
          </Suspense>
        )}
      </Route>
      <Route path="/ide/:projectId">
        {() => (
          <GlobalShell>
            <Suspense fallback={<PageLoader />}>
              <IDEPage />
            </Suspense>
          </GlobalShell>
        )}
      </Route>
      <Route path="/templates">
        {() => (
          <GlobalShell>
            <Suspense fallback={<PageLoader />}>
              <TemplatesPage />
            </Suspense>
          </GlobalShell>
        )}
      </Route>
      <Route path="/components">
        {() => (
          <GlobalShell>
            <Suspense fallback={<PageLoader />}>
              <ComponentsPage />
            </Suspense>
          </GlobalShell>
        )}
      </Route>
      <Route path="/ai">
        {() => (
          <GlobalShell>
            <Suspense fallback={<PageLoader />}>
              <AIAssistantPage />
            </Suspense>
          </GlobalShell>
        )}
      </Route>
      <Route path="/deploy">
        {() => (
          <GlobalShell>
            <Suspense fallback={<PageLoader />}>
              <DeployPage />
            </Suspense>
          </GlobalShell>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <GlobalShell>
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          </GlobalShell>
        )}
      </Route>
      <Route path="/secrets">
        {() => (
          <GlobalShell>
            <Suspense fallback={<PageLoader />}>
              <SecretsPage />
            </Suspense>
          </GlobalShell>
        )}
      </Route>
      <Route path="/pricing">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <PricingPage />
          </Suspense>
        )}
      </Route>
      <Route path="/docs">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <DocsPage />
          </Suspense>
        )}
      </Route>
      <Route path="/about">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <AboutPage />
          </Suspense>
        )}
      </Route>
      <Route>
        {() => (
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
