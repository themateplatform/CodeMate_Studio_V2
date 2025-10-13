import { Request, Response } from "express";
import { db } from "../db";
import { specUserJourneys, specs } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * User Journeys API Routes
 * Manages visual user journey mapping for specifications
 */

export function registerUserJourneysRoutes(app: any, csrfProtection: any) {
  /**
   * GET /api/specs/:specId/journeys
   * List all user journeys for a specification
   */
  app.get("/api/specs/:specId/journeys", async (req: Request, res: Response) => {
    try {
      const { specId } = req.params;

      // Verify spec exists and user has access
      const [spec] = await db.select()
        .from(specs)
        .where(eq(specs.id, specId))
        .limit(1);

      if (!spec) {
        return res.status(404).json({ message: "Specification not found" });
      }

      // Get all journeys for this spec
      const journeys = await db.select()
        .from(specUserJourneys)
        .where(eq(specUserJourneys.specId, specId))
        .orderBy(desc(specUserJourneys.createdAt));

      res.json({ journeys });
    } catch (error: any) {
      console.error("Error fetching user journeys:", error);
      res.status(500).json({ message: "Failed to fetch user journeys" });
    }
  });

  /**
   * GET /api/journeys/:journeyId
   * Get a specific user journey by ID
   */
  app.get("/api/journeys/:journeyId", async (req: Request, res: Response) => {
    try {
      const { journeyId } = req.params;

      const [journey] = await db.select()
        .from(specUserJourneys)
        .where(eq(specUserJourneys.id, journeyId))
        .limit(1);

      if (!journey) {
        return res.status(404).json({ message: "User journey not found" });
      }

      res.json({ journey });
    } catch (error: any) {
      console.error("Error fetching user journey:", error);
      res.status(500).json({ message: "Failed to fetch user journey" });
    }
  });

  /**
   * POST /api/specs/:specId/journeys
   * Create a new user journey
   */
  app.post("/api/specs/:specId/journeys", csrfProtection, async (req: Request, res: Response) => {
    try {
      if (!(req.session as any)?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { specId } = req.params;
      const { 
        name, 
        description, 
        userType, 
        steps, 
        successCriteria, 
        painPoints, 
        priority,
        status 
      } = req.body;

      // Validate required fields
      if (!name || !description || !userType || !steps) {
        return res.status(400).json({ 
          message: "Name, description, user type, and steps are required" 
        });
      }

      // Verify spec exists
      const [spec] = await db.select()
        .from(specs)
        .where(eq(specs.id, specId))
        .limit(1);

      if (!spec) {
        return res.status(404).json({ message: "Specification not found" });
      }

      // Create journey
      const [journey] = await db.insert(specUserJourneys)
        .values({
          specId,
          name,
          description,
          userType,
          steps: steps || [],
          successCriteria: successCriteria || [],
          painPoints: painPoints || [],
          priority: priority || "medium",
          status: status || "draft",
        })
        .returning();

      res.status(201).json({ 
        journey,
        message: "User journey created successfully" 
      });
    } catch (error: any) {
      console.error("Error creating user journey:", error);
      res.status(500).json({ message: "Failed to create user journey" });
    }
  });

  /**
   * PUT /api/journeys/:journeyId
   * Update an existing user journey
   */
  app.put("/api/journeys/:journeyId", csrfProtection, async (req: Request, res: Response) => {
    try {
      if (!(req.session as any)?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { journeyId } = req.params;
      const { 
        name, 
        description, 
        userType, 
        steps, 
        successCriteria, 
        painPoints, 
        priority,
        status 
      } = req.body;

      // Check if journey exists
      const [existingJourney] = await db.select()
        .from(specUserJourneys)
        .where(eq(specUserJourneys.id, journeyId))
        .limit(1);

      if (!existingJourney) {
        return res.status(404).json({ message: "User journey not found" });
      }

      // Update journey
      const [updatedJourney] = await db.update(specUserJourneys)
        .set({
          ...(name && { name }),
          ...(description && { description }),
          ...(userType && { userType }),
          ...(steps && { steps }),
          ...(successCriteria !== undefined && { successCriteria }),
          ...(painPoints !== undefined && { painPoints }),
          ...(priority && { priority }),
          ...(status && { status }),
          updatedAt: new Date(),
        })
        .where(eq(specUserJourneys.id, journeyId))
        .returning();

      res.json({ 
        journey: updatedJourney,
        message: "User journey updated successfully" 
      });
    } catch (error: any) {
      console.error("Error updating user journey:", error);
      res.status(500).json({ message: "Failed to update user journey" });
    }
  });

  /**
   * DELETE /api/journeys/:journeyId
   * Delete a user journey
   */
  app.delete("/api/journeys/:journeyId", csrfProtection, async (req: Request, res: Response) => {
    try {
      if (!(req.session as any)?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { journeyId } = req.params;

      // Check if journey exists
      const [existingJourney] = await db.select()
        .from(specUserJourneys)
        .where(eq(specUserJourneys.id, journeyId))
        .limit(1);

      if (!existingJourney) {
        return res.status(404).json({ message: "User journey not found" });
      }

      // Delete journey
      await db.delete(specUserJourneys)
        .where(eq(specUserJourneys.id, journeyId));

      res.json({ message: "User journey deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user journey:", error);
      res.status(500).json({ message: "Failed to delete user journey" });
    }
  });

  /**
   * POST /api/journeys/:journeyId/duplicate
   * Duplicate a user journey
   */
  app.post("/api/journeys/:journeyId/duplicate", csrfProtection, async (req: Request, res: Response) => {
    try {
      if (!(req.session as any)?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { journeyId } = req.params;

      // Get original journey
      const [original] = await db.select()
        .from(specUserJourneys)
        .where(eq(specUserJourneys.id, journeyId))
        .limit(1);

      if (!original) {
        return res.status(404).json({ message: "User journey not found" });
      }

      // Create duplicate
      const [duplicate] = await db.insert(specUserJourneys)
        .values({
          specId: original.specId,
          name: `${original.name} (Copy)`,
          description: original.description,
          userType: original.userType,
          steps: original.steps,
          successCriteria: original.successCriteria,
          painPoints: original.painPoints,
          priority: original.priority,
          status: "draft", // Reset to draft
        })
        .returning();

      res.status(201).json({ 
        journey: duplicate,
        message: "User journey duplicated successfully" 
      });
    } catch (error: any) {
      console.error("Error duplicating user journey:", error);
      res.status(500).json({ message: "Failed to duplicate user journey" });
    }
  });

  /**
   * GET /api/journeys/:journeyId/export/user-stories
   * Export journey to AI-generated user stories format
   */
  app.get("/api/journeys/:journeyId/export/user-stories", async (req: Request, res: Response) => {
    try {
      const { journeyId } = req.params;

      // Get journey
      const [journey] = await db.select()
        .from(specUserJourneys)
        .where(eq(specUserJourneys.id, journeyId))
        .limit(1);

      if (!journey) {
        return res.status(404).json({ message: "User journey not found" });
      }

      // Get spec for context
      const [spec] = await db.select()
        .from(specs)
        .where(eq(specs.id, journey.specId))
        .limit(1);

      // Format for AI user stories generator
      const exportData = {
        title: `${spec?.title || "Untitled Spec"} - ${journey.name}`,
        purpose: spec?.purpose || "",
        audience: journey.userType,
        problemStatement: Array.isArray(journey.painPoints) 
          ? (journey.painPoints as any[]).join(", ") 
          : "",
        proposedSolution: journey.description,
        userJourney: {
          name: journey.name,
          steps: journey.steps,
          successCriteria: journey.successCriteria,
        },
      };

      res.json({ exportData });
    } catch (error: any) {
      console.error("Error exporting user journey:", error);
      res.status(500).json({ message: "Failed to export user journey" });
    }
  });

  /**
   * GET /api/specs/:specId/journeys/stats
   * Get statistics about user journeys for a spec
   */
  app.get("/api/specs/:specId/journeys/stats", async (req: Request, res: Response) => {
    try {
      const { specId } = req.params;

      const journeys = await db.select()
        .from(specUserJourneys)
        .where(eq(specUserJourneys.specId, specId));

      const stats = {
        total: journeys.length,
        byStatus: {
          draft: journeys.filter(j => j.status === "draft").length,
          reviewed: journeys.filter(j => j.status === "reviewed").length,
          implemented: journeys.filter(j => j.status === "implemented").length,
        },
        byPriority: {
          high: journeys.filter(j => j.priority === "high").length,
          medium: journeys.filter(j => j.priority === "medium").length,
          low: journeys.filter(j => j.priority === "low").length,
        },
        userTypes: [...new Set(journeys.map(j => j.userType))],
        totalSteps: journeys.reduce((sum, j) => 
          sum + (Array.isArray(j.steps) ? j.steps.length : 0), 0
        ),
      };

      res.json({ stats });
    } catch (error: any) {
      console.error("Error fetching journey stats:", error);
      res.status(500).json({ message: "Failed to fetch journey stats" });
    }
  });
}
