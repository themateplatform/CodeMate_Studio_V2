import type { Express } from "express";
import { db } from "../db";
import { specDataModels } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface DataModelField {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  defaultValue?: string;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

interface DataModelRelationship {
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  targetModel: string;
  foreignKey?: string;
  description?: string;
  cascadeDelete?: boolean;
}

interface BusinessRule {
  name: string;
  description: string;
  condition: string;
  action: string;
  severity: "error" | "warning" | "info";
}

interface DataModel {
  id?: string;
  specId: string;
  name: string;
  description?: string;
  type: string;
  fields: DataModelField[];
  relationships?: DataModelRelationship[];
  businessRules?: BusinessRule[];
  status: "draft" | "reviewed" | "implemented";
  createdAt?: Date;
  updatedAt?: Date;
}

export function registerDataModelsRoutes(app: Express, csrfProtection: any) {
  // List all data models for a spec
  app.get("/api/specs/:specId/data-models", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { specId } = req.params;

      const models = await db
        .select()
        .from(specDataModels)
        .where(eq(specDataModels.specId, specId))
        .orderBy(desc(specDataModels.createdAt));

      res.json(models);
    } catch (error: any) {
      console.error("Error fetching data models:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific data model
  app.get("/api/data-models/:modelId", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { modelId } = req.params;

      const [model] = await db
        .select()
        .from(specDataModels)
        .where(eq(specDataModels.id, modelId));

      if (!model) {
        return res.status(404).json({ message: "Data model not found" });
      }

      res.json(model);
    } catch (error: any) {
      console.error("Error fetching data model:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new data model
  app.post("/api/specs/:specId/data-models", csrfProtection, async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { specId } = req.params;
      const { name, description, type, fields, relationships, businessRules, status } = req.body;

      // Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Model name is required" });
      }

      if (name.length > 200) {
        return res.status(400).json({ message: "Model name must be 200 characters or less" });
      }

      if (!type || !["entity", "value_object", "aggregate", "service", "dto"].includes(type)) {
        return res.status(400).json({ message: "Valid model type is required" });
      }

      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ message: "At least one field is required" });
      }

      // Validate field structure
      for (const field of fields) {
        if (!field.name || !field.type) {
          return res.status(400).json({ message: "Each field must have a name and type" });
        }
      }

      if (!status || !["draft", "reviewed", "implemented"].includes(status)) {
        return res.status(400).json({ message: "Valid status is required" });
      }

      const [newModel] = await db
        .insert(specDataModels)
        .values({
          specId,
          name: name.trim(),
          description: description?.trim() || null,
          type,
          fields: fields as any,
          relationships: relationships || null,
          businessRules: businessRules || null,
          status,
        })
        .returning();

      res.status(201).json(newModel);
    } catch (error: any) {
      console.error("Error creating data model:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a data model
  app.put("/api/data-models/:modelId", csrfProtection, async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { modelId } = req.params;
      const updateData: any = {};

      // Build update object with only provided fields
      if (req.body.name !== undefined) {
        if (!req.body.name || req.body.name.trim().length === 0) {
          return res.status(400).json({ message: "Model name cannot be empty" });
        }
        if (req.body.name.length > 200) {
          return res.status(400).json({ message: "Model name must be 200 characters or less" });
        }
        updateData.name = req.body.name.trim();
      }

      if (req.body.description !== undefined) {
        updateData.description = req.body.description?.trim() || null;
      }

      if (req.body.type !== undefined) {
        if (!["entity", "value_object", "aggregate", "service", "dto"].includes(req.body.type)) {
          return res.status(400).json({ message: "Invalid model type" });
        }
        updateData.type = req.body.type;
      }

      if (req.body.fields !== undefined) {
        if (!Array.isArray(req.body.fields) || req.body.fields.length === 0) {
          return res.status(400).json({ message: "At least one field is required" });
        }
        for (const field of req.body.fields) {
          if (!field.name || !field.type) {
            return res.status(400).json({ message: "Each field must have a name and type" });
          }
        }
        updateData.fields = req.body.fields;
      }

      if (req.body.relationships !== undefined) {
        updateData.relationships = req.body.relationships;
      }

      if (req.body.businessRules !== undefined) {
        updateData.businessRules = req.body.businessRules;
      }

      if (req.body.status !== undefined) {
        if (!["draft", "reviewed", "implemented"].includes(req.body.status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        updateData.status = req.body.status;
      }

      updateData.updatedAt = new Date();

      const [updatedModel] = await db
        .update(specDataModels)
        .set(updateData)
        .where(eq(specDataModels.id, modelId))
        .returning();

      if (!updatedModel) {
        return res.status(404).json({ message: "Data model not found" });
      }

      res.json(updatedModel);
    } catch (error: any) {
      console.error("Error updating data model:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a data model
  app.delete("/api/data-models/:modelId", csrfProtection, async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { modelId } = req.params;

      const [deletedModel] = await db
        .delete(specDataModels)
        .where(eq(specDataModels.id, modelId))
        .returning();

      if (!deletedModel) {
        return res.status(404).json({ message: "Data model not found" });
      }

      res.json({ message: "Data model deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting data model:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Duplicate a data model
  app.post("/api/data-models/:modelId/duplicate", csrfProtection, async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { modelId } = req.params;

      const [originalModel] = await db
        .select()
        .from(specDataModels)
        .where(eq(specDataModels.id, modelId));

      if (!originalModel) {
        return res.status(404).json({ message: "Data model not found" });
      }

      const [duplicatedModel] = await db
        .insert(specDataModels)
        .values({
          specId: originalModel.specId,
          name: `${originalModel.name} (Copy)`,
          description: originalModel.description,
          type: originalModel.type,
          fields: originalModel.fields,
          relationships: originalModel.relationships,
          businessRules: originalModel.businessRules,
          status: "draft", // Always set duplicates to draft
        })
        .returning();

      res.status(201).json(duplicatedModel);
    } catch (error: any) {
      console.error("Error duplicating data model:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate SQL schema from data model
  app.get("/api/data-models/:modelId/export/sql", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { modelId } = req.params;

      const [model] = await db
        .select()
        .from(specDataModels)
        .where(eq(specDataModels.id, modelId));

      if (!model) {
        return res.status(404).json({ message: "Data model not found" });
      }

      const fields = model.fields as DataModelField[];
      const relationships = model.relationships as DataModelRelationship[] || [];

      // Generate SQL CREATE TABLE statement
      const tableName = model.name.toLowerCase().replace(/\s+/g, "_");
      let sql = `-- ${model.name}\n`;
      if (model.description) {
        sql += `-- ${model.description}\n`;
      }
      sql += `\nCREATE TABLE ${tableName} (\n`;

      // Add ID field
      sql += `  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),\n`;

      // Add custom fields
      fields.forEach((field, index) => {
        const fieldName = field.name.toLowerCase().replace(/\s+/g, "_");
        let fieldType = "TEXT";

        // Map types to SQL
        switch (field.type.toLowerCase()) {
          case "string":
          case "text":
            fieldType = "TEXT";
            break;
          case "number":
          case "integer":
            fieldType = "INTEGER";
            break;
          case "decimal":
          case "float":
            fieldType = "DECIMAL";
            break;
          case "boolean":
            fieldType = "BOOLEAN";
            break;
          case "date":
            fieldType = "DATE";
            break;
          case "datetime":
          case "timestamp":
            fieldType = "TIMESTAMP";
            break;
          case "json":
            fieldType = "JSONB";
            break;
          case "uuid":
            fieldType = "VARCHAR";
            break;
          default:
            fieldType = "TEXT";
        }

        sql += `  ${fieldName} ${fieldType}`;

        if (field.required) {
          sql += " NOT NULL";
        }

        if (field.unique) {
          sql += " UNIQUE";
        }

        if (field.defaultValue) {
          sql += ` DEFAULT '${field.defaultValue}'`;
        }

        sql += ",\n";
      });

      // Add timestamps
      sql += `  created_at TIMESTAMP DEFAULT NOW(),\n`;
      sql += `  updated_at TIMESTAMP DEFAULT NOW()\n`;
      sql += `);\n`;

      // Add indexes
      sql += `\n-- Indexes\n`;
      fields.forEach((field) => {
        if (field.unique) {
          const fieldName = field.name.toLowerCase().replace(/\s+/g, "_");
          sql += `CREATE UNIQUE INDEX idx_${tableName}_${fieldName} ON ${tableName}(${fieldName});\n`;
        }
      });

      // Add relationships as comments
      if (relationships.length > 0) {
        sql += `\n-- Relationships\n`;
        relationships.forEach((rel) => {
          sql += `-- ${rel.type}: ${model.name} -> ${rel.targetModel}\n`;
          if (rel.description) {
            sql += `--   ${rel.description}\n`;
          }
        });
      }

      res.json({
        modelName: model.name,
        tableName,
        sql,
        dialect: "postgresql",
      });
    } catch (error: any) {
      console.error("Error exporting SQL:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate TypeScript interface from data model
  app.get("/api/data-models/:modelId/export/typescript", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { modelId } = req.params;

      const [model] = await db
        .select()
        .from(specDataModels)
        .where(eq(specDataModels.id, modelId));

      if (!model) {
        return res.status(404).json({ message: "Data model not found" });
      }

      const fields = model.fields as DataModelField[];
      const relationships = model.relationships as DataModelRelationship[] || [];

      // Generate TypeScript interface
      const interfaceName = model.name.replace(/\s+/g, "");
      let ts = `// ${model.name}\n`;
      if (model.description) {
        ts += `// ${model.description}\n`;
      }
      ts += `\nexport interface ${interfaceName} {\n`;

      // Add ID field
      ts += `  id: string;\n`;

      // Add custom fields
      fields.forEach((field) => {
        const fieldName = field.name.replace(/\s+/g, "");
        const camelCaseName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
        let fieldType = "string";

        // Map types to TypeScript
        switch (field.type.toLowerCase()) {
          case "string":
          case "text":
          case "uuid":
            fieldType = "string";
            break;
          case "number":
          case "integer":
          case "decimal":
          case "float":
            fieldType = "number";
            break;
          case "boolean":
            fieldType = "boolean";
            break;
          case "date":
          case "datetime":
          case "timestamp":
            fieldType = "Date";
            break;
          case "json":
            fieldType = "any";
            break;
          default:
            fieldType = "string";
        }

        if (field.validation?.enum && field.validation.enum.length > 0) {
          fieldType = field.validation.enum.map((v) => `"${v}"`).join(" | ");
        }

        ts += `  ${camelCaseName}`;
        if (!field.required) {
          ts += "?";
        }
        ts += `: ${fieldType};`;

        if (field.description) {
          ts += ` // ${field.description}`;
        }
        ts += "\n";
      });

      // Add relationship fields
      relationships.forEach((rel) => {
        const targetName = rel.targetModel.replace(/\s+/g, "");
        const fieldName = targetName.charAt(0).toLowerCase() + targetName.slice(1);

        if (rel.type === "one-to-one" || rel.type === "many-to-one") {
          ts += `  ${fieldName}?: ${targetName};`;
        } else if (rel.type === "one-to-many" || rel.type === "many-to-many") {
          ts += `  ${fieldName}?: ${targetName}[];`;
        }

        if (rel.description) {
          ts += ` // ${rel.description}`;
        }
        ts += "\n";
      });

      // Add timestamps
      ts += `  createdAt: Date;\n`;
      ts += `  updatedAt: Date;\n`;
      ts += `}\n`;

      res.json({
        modelName: model.name,
        interfaceName,
        typescript: ts,
      });
    } catch (error: any) {
      console.error("Error exporting TypeScript:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get data model statistics
  app.get("/api/specs/:specId/data-models/stats", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { specId } = req.params;

      const models = await db
        .select()
        .from(specDataModels)
        .where(eq(specDataModels.specId, specId));

      const stats = {
        total: models.length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        totalFields: 0,
        totalRelationships: 0,
        avgFieldsPerModel: 0,
      };

      models.forEach((model) => {
        // Count by type
        stats.byType[model.type] = (stats.byType[model.type] || 0) + 1;

        // Count by status
        stats.byStatus[model.status || "draft"] = (stats.byStatus[model.status || "draft"] || 0) + 1;

        // Count fields
        const fields = model.fields as DataModelField[];
        stats.totalFields += fields.length;

        // Count relationships
        const relationships = model.relationships as DataModelRelationship[] || [];
        stats.totalRelationships += relationships.length;
      });

      stats.avgFieldsPerModel = models.length > 0
        ? Math.round((stats.totalFields / models.length) * 10) / 10
        : 0;

      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching data model stats:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
