import type { Request, Response, Express, RequestHandler } from "express";
import { db } from "../db";
import { projects, specs } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import "../types/session"; // Import session type declarations

interface ProjectRequestBody {
  name: string;
  description?: string;
  isPublic?: boolean;
  autonomyLevel?: "ask_everything" | "ask_some" | "ask_none";
  techStack?: any;
  requirements?: any;
  briefResponses?: any;
  githubRepoUrl?: string;
  githubBranch?: string;
  organizationId?: string;
}

export function registerProjectRoutes(app: Express, csrfProtection: RequestHandler): void {
  /**
   * GET /api/projects - List all projects for current user
   */
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));

      res.json({ projects: userProjects });
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  /**
   * GET /api/projects/:id - Get a single project by ID
   */
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get associated specs count
      const projectSpecs = await db
        .select()
        .from(specs)
        .where(eq(specs.projectId, id));

      res.json({
        project,
        specsCount: projectSpecs.length,
      });
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  /**
   * POST /api/projects - Create a new project
   */
  app.post("/api/projects", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const body = req.body as ProjectRequestBody;

      // Validate required fields
      if (!body.name || body.name.trim().length === 0) {
        return res.status(400).json({ message: "Project name is required" });
      }

      // Create project
      const [newProject] = await db
        .insert(projects)
        .values({
          userId,
          organizationId: body.organizationId || null,
          name: body.name.trim(),
          description: body.description || null,
          isPublic: body.isPublic ?? false,
          autonomyLevel: body.autonomyLevel || "ask_some",
          techStack: body.techStack || null,
          requirements: body.requirements || null,
          briefResponses: body.briefResponses || null,
          githubRepoUrl: body.githubRepoUrl || null,
          githubBranch: body.githubBranch || "main",
          provisioningStatus: "not_provisioned",
        })
        .returning();

      res.status(201).json({ project: newProject });
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  /**
   * PUT /api/projects/:id - Update an existing project
   */
  app.put("/api/projects/:id", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const body = req.body as ProjectRequestBody;

      // Verify ownership
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);

      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Build update object
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined && body.name.trim().length > 0) {
        updateData.name = body.name.trim();
      }
      if (body.description !== undefined) updateData.description = body.description;
      if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
      if (body.autonomyLevel !== undefined) updateData.autonomyLevel = body.autonomyLevel;
      if (body.techStack !== undefined) updateData.techStack = body.techStack;
      if (body.requirements !== undefined) updateData.requirements = body.requirements;
      if (body.briefResponses !== undefined) updateData.briefResponses = body.briefResponses;
      if (body.githubRepoUrl !== undefined) updateData.githubRepoUrl = body.githubRepoUrl;
      if (body.githubBranch !== undefined) updateData.githubBranch = body.githubBranch;

      const [updatedProject] = await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, id))
        .returning();

      res.json({ project: updatedProject });
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  /**
   * DELETE /api/projects/:id - Delete a project
   */
  app.delete("/api/projects/:id", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      // Verify ownership
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);

      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Delete project (cascade will handle related records)
      await db.delete(projects).where(eq(projects.id, id));

      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  /**
   * GET /api/projects/:id/specs - Get all specs for a project
   */
  app.get("/api/projects/:id/specs", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      // Verify project ownership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get specs for project
      const projectSpecs = await db
        .select()
        .from(specs)
        .where(eq(specs.projectId, id))
        .orderBy(desc(specs.updatedAt));

      res.json({ specs: projectSpecs });
    } catch (error) {
      console.error("Get project specs error:", error);
      res.status(500).json({ message: "Failed to fetch project specs" });
    }
  });

  /**
   * POST /api/projects/:id/duplicate - Duplicate a project
   */
  app.post("/api/projects/:id/duplicate", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      // Get original project
      const [originalProject] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);

      if (!originalProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Create duplicate
      const [duplicatedProject] = await db
        .insert(projects)
        .values({
          userId,
          organizationId: originalProject.organizationId,
          name: `${originalProject.name} (Copy)`,
          description: originalProject.description,
          isPublic: false, // Duplicates are private by default
          autonomyLevel: originalProject.autonomyLevel,
          techStack: originalProject.techStack,
          requirements: originalProject.requirements,
          briefResponses: originalProject.briefResponses,
          githubBranch: originalProject.githubBranch,
          provisioningStatus: "not_provisioned",
        })
        .returning();

      res.status(201).json({ project: duplicatedProject });
    } catch (error) {
      console.error("Duplicate project error:", error);
      res.status(500).json({ message: "Failed to duplicate project" });
    }
  });

  /**
   * PATCH /api/projects/:id/github-sync - Toggle GitHub sync
   */
  app.patch("/api/projects/:id/github-sync", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }

      // Verify ownership
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);

      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (enabled && !existingProject.githubRepoUrl) {
        return res.status(400).json({
          message: "Cannot enable GitHub sync without a repository URL"
        });
      }

      const [updatedProject] = await db
        .update(projects)
        .set({
          githubSyncEnabled: enabled,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      res.json({ project: updatedProject });
    } catch (error) {
      console.error("Toggle GitHub sync error:", error);
      res.status(500).json({ message: "Failed to toggle GitHub sync" });
    }
  });

  /**
   * GET /api/projects/stats - Get user's project statistics
   */
  app.get("/api/projects/stats", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId));

      const stats = {
        totalProjects: userProjects.length,
        publicProjects: userProjects.filter(p => p.isPublic).length,
        privateProjects: userProjects.filter(p => !p.isPublic).length,
        githubSyncEnabled: userProjects.filter(p => p.githubSyncEnabled).length,
        provisionedProjects: userProjects.filter(p => p.provisioningStatus === "provisioned").length,
      };

      res.json({ stats });
    } catch (error) {
      console.error("Get project stats error:", error);
      res.status(500).json({ message: "Failed to fetch project stats" });
    }
  });
}
