import type { Request, Response, Express, RequestHandler } from "express";
import { db } from "../db";
import { specs, specVersions, projects } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import "../types/session"; // Import session type declarations

interface SpecRequestBody {
  projectId?: string;
  title: string;
  description?: string;
  purpose: string;
  audience: string;
  problemStatement?: string;
  solutionOverview?: string;
  successMetrics?: Array<{
    name: string;
    target: string;
    measurement: string;
  }>;
  acceptanceCriteria?: string[];
  userJourneys?: any[];
  dataModels?: any[];
  roles?: any[];
}

export function registerSpecRoutes(app: Express, csrfProtection: RequestHandler): void {
  /**
   * GET /api/specs - List all specs for a user
   */
  app.get("/api/specs", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { projectId } = req.query;

      let query = db
        .select()
        .from(specs)
        .where(eq(specs.isActive, true))
        .orderBy(desc(specs.updatedAt));

      if (projectId) {
        const projectSpecs = await db
          .select()
          .from(specs)
          .where(and(eq(specs.projectId, projectId as string), eq(specs.isActive, true)))
          .orderBy(desc(specs.updatedAt));
        return res.json(projectSpecs);
      }

      const allSpecs = await query;
      res.json(allSpecs);
    } catch (error) {
      console.error("Error fetching specs:", error);
      res.status(500).json({ message: "Failed to fetch specifications" });
    }
  });

  /**
   * GET /api/specs/:id - Get a single spec by ID
   */
  app.get("/api/specs/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const [spec] = await db
        .select()
        .from(specs)
        .where(and(eq(specs.id, id), eq(specs.isActive, true)));

      if (!spec) {
        return res.status(404).json({ message: "Specification not found" });
      }

      res.json(spec);
    } catch (error) {
      console.error("Error fetching spec:", error);
      res.status(500).json({ message: "Failed to fetch specification" });
    }
  });

  /**
   * POST /api/specs - Create a new spec
   */
  app.post("/api/specs", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const body = req.body as SpecRequestBody;

      // Validate required fields
      if (!body.title || !body.purpose || !body.audience) {
        return res.status(400).json({
          message: "Title, purpose, and audience are required"
        });
      }

      // Ensure project exists or create one
      let projectId = body.projectId;
      if (!projectId) {
        // Create a default project for this spec
        const [newProject] = await db
          .insert(projects)
          .values({
            name: body.title,
            description: body.description,
            userId: userId,
          })
          .returning();
        projectId = newProject.id;
      }

      // Create the spec
      const [newSpec] = await db
        .insert(specs)
        .values({
          projectId,
          title: body.title,
          description: body.description,
          purpose: body.purpose,
          audience: body.audience,
          problemStatement: body.problemStatement,
          solutionOverview: body.solutionOverview,
          successMetrics: body.successMetrics || [],
          acceptanceCriteria: body.acceptanceCriteria || [],
          createdBy: userId,
          status: "draft",
          version: 1,
        })
        .returning();

      // Create initial version snapshot
      await db.insert(specVersions).values({
        specId: newSpec.id,
        version: 1,
        title: newSpec.title,
        content: {
          ...body,
          createdAt: newSpec.createdAt,
        },
        changeSummary: "Initial version",
        changedBy: userId,
      });

      res.status(201).json(newSpec);
    } catch (error) {
      console.error("Error creating spec:", error);
      res.status(500).json({ message: "Failed to create specification" });
    }
  });

  /**
   * PUT /api/specs/:id - Update an existing spec
   */
  app.put("/api/specs/:id", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const body = req.body as SpecRequestBody;

      // Fetch existing spec
      const [existingSpec] = await db
        .select()
        .from(specs)
        .where(and(eq(specs.id, id), eq(specs.isActive, true)));

      if (!existingSpec) {
        return res.status(404).json({ message: "Specification not found" });
      }

      // Increment version
      const newVersion = (existingSpec.version || 1) + 1;

      // Update the spec
      const [updatedSpec] = await db
        .update(specs)
        .set({
          title: body.title,
          description: body.description,
          purpose: body.purpose,
          audience: body.audience,
          problemStatement: body.problemStatement,
          solutionOverview: body.solutionOverview,
          successMetrics: body.successMetrics || [],
          acceptanceCriteria: body.acceptanceCriteria || [],
          version: newVersion,
          updatedAt: new Date(),
        })
        .where(eq(specs.id, id))
        .returning();

      // Create version snapshot
      await db.insert(specVersions).values({
        specId: id,
        version: newVersion,
        title: updatedSpec.title,
        content: {
          ...body,
          updatedAt: updatedSpec.updatedAt,
        },
        changeSummary: `Updated to version ${newVersion}`,
        changedBy: userId,
      });

      res.json(updatedSpec);
    } catch (error) {
      console.error("Error updating spec:", error);
      res.status(500).json({ message: "Failed to update specification" });
    }
  });

  /**
   * DELETE /api/specs/:id - Soft delete a spec
   */
  app.delete("/api/specs/:id", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      const [deletedSpec] = await db
        .update(specs)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(specs.id, id))
        .returning();

      if (!deletedSpec) {
        return res.status(404).json({ message: "Specification not found" });
      }

      res.json({ message: "Specification deleted successfully" });
    } catch (error) {
      console.error("Error deleting spec:", error);
      res.status(500).json({ message: "Failed to delete specification" });
    }
  });

  /**
   * GET /api/specs/:id/versions - Get version history
   */
  app.get("/api/specs/:id/versions", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      const versions = await db
        .select()
        .from(specVersions)
        .where(eq(specVersions.specId, id))
        .orderBy(desc(specVersions.version));

      res.json(versions);
    } catch (error) {
      console.error("Error fetching spec versions:", error);
      res.status(500).json({ message: "Failed to fetch version history" });
    }
  });

  /**
   * POST /api/specs/:id/generate - Generate code from spec
   */
  app.post("/api/specs/:id/generate", csrfProtection, async (req: Request, res: Response) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;

      // Fetch the spec
      const [spec] = await db
        .select()
        .from(specs)
        .where(and(eq(specs.id, id), eq(specs.isActive, true)));

      if (!spec) {
        return res.status(404).json({ message: "Specification not found" });
      }

      // Convert spec to generator prompt
      const prompt = `
${spec.title}

Purpose: ${spec.purpose}
Audience: ${spec.audience}

${spec.problemStatement ? `Problem: ${spec.problemStatement}` : ''}
${spec.solutionOverview ? `Solution: ${spec.solutionOverview}` : ''}

Features needed:
${Array.isArray(spec.acceptanceCriteria) ? spec.acceptanceCriteria.join('\n') : 'No specific features defined'}
      `.trim();

      // Return the prompt - actual generation will be handled by frontend calling /api/generate
      res.json({
        prompt,
        specId: id,
        projectName: spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        suggestion: "Use this prompt with the Generator to create your application"
      });
    } catch (error) {
      console.error("Error generating from spec:", error);
      res.status(500).json({ message: "Failed to generate from specification" });
    }
  });
}
