import type { Request, Response, Express, RequestHandler } from "express";
import { db } from "../db";
import { projects, specs, specVersions } from "@shared/schema";
import { eq } from "drizzle-orm";
import "../types/session";

interface WorkflowRequestBody {
  projectName: string;
  projectDescription?: string;
  specTitle: string;
  specPurpose: string;
  specAudience: string;
  autonomyLevel?: "ask_everything" | "ask_some" | "ask_none";
}

export function registerWorkflowRoutes(app: Express, csrfProtection: RequestHandler): void {
  /**
   * POST /api/workflows/create-project-with-spec - Create project and initial spec atomically
   */
  app.post("/api/workflows/create-project-with-spec", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const body = req.body as WorkflowRequestBody;

      // Validate required fields
      if (!body.projectName?.trim()) {
        return res.status(400).json({ message: "Project name is required" });
      }
      if (!body.specTitle?.trim()) {
        return res.status(400).json({ message: "Spec title is required" });
      }
      if (!body.specPurpose?.trim()) {
        return res.status(400).json({ message: "Spec purpose is required" });
      }
      if (!body.specAudience?.trim()) {
        return res.status(400).json({ message: "Spec audience is required" });
      }

      // Create project first
      const [newProject] = await db
        .insert(projects)
        .values({
          userId,
          name: body.projectName.trim(),
          description: body.projectDescription || null,
          autonomyLevel: body.autonomyLevel || "ask_some",
          isPublic: false,
          provisioningStatus: "not_provisioned",
        })
        .returning();

      // Create spec linked to project
      const [newSpec] = await db
        .insert(specs)
        .values({
          projectId: newProject.id,
          title: body.specTitle.trim(),
          purpose: body.specPurpose.trim(),
          audience: body.specAudience.trim(),
          description: "Initial specification created via workflow",
          isActive: true,
          version: 1,
          createdBy: userId,
        })
        .returning();

      // Create initial version snapshot
      await db.insert(specVersions).values({
        specId: newSpec.id,
        version: 1,
        title: newSpec.title,
        content: JSON.stringify({
          purpose: newSpec.purpose,
          audience: newSpec.audience,
        }),
        changeSummary: "Initial version",
        changedBy: userId,
      });

      res.status(201).json({
        project: newProject,
        spec: newSpec,
        message: "Project and specification created successfully",
      });
    } catch (error) {
      console.error("Workflow creation error:", error);
      res.status(500).json({ message: "Failed to create project and specification" });
    }
  });

  /**
   * GET /api/workflows/project-spec-tree/:projectId - Get project with all specs
   */
  app.get("/api/workflows/project-spec-tree/:projectId", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { projectId } = req.params;

      // Get project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify ownership
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all specs for project
      const projectSpecs = await db
        .select()
        .from(specs)
        .where(eq(specs.projectId, projectId));

      res.json({
        project,
        specs: projectSpecs,
        totalSpecs: projectSpecs.length,
      });
    } catch (error) {
      console.error("Get project spec tree error:", error);
      res.status(500).json({ message: "Failed to fetch project spec tree" });
    }
  });
}
