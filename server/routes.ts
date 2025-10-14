import type { Express, RequestHandler } from "express";
import { registerGenerateRoutes } from "./routes/generate";
import { registerSpecRoutes } from "./routes/specs";
import { registerAuthRoutes } from "./routes/auth";
import { registerProjectRoutes } from "./routes/projects";
import { registerWorkflowRoutes } from "./routes/workflows";
import { registerAISuggestionsRoutes } from "./routes/ai-suggestions";
import { registerUserJourneysRoutes } from "./routes/user-journeys";
import { registerDataModelsRoutes } from "./routes/data-models";

// Simple CSRF bypass for MVP - in production this should be properly implemented
const csrfProtection: RequestHandler = (req, res, next) => {
  // For now, just pass through - MVP mode
  // TODO: Implement proper CSRF protection
  next();
};

export function registerRoutes(app: Express): void {
  registerAuthRoutes(app, csrfProtection);
  registerProjectRoutes(app, csrfProtection);
  registerWorkflowRoutes(app, csrfProtection);
  registerAISuggestionsRoutes(app, csrfProtection);
  registerUserJourneysRoutes(app, csrfProtection);
  registerDataModelsRoutes(app, csrfProtection);
  registerGenerateRoutes(app, csrfProtection);
  registerSpecRoutes(app, csrfProtection);
}
