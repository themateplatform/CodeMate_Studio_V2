import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit, CheckCircle2, Database } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  name: string;
  description?: string;
  type: string;
  fields: DataModelField[];
  relationships?: DataModelRelationship[];
  businessRules?: BusinessRule[];
  status: "draft" | "reviewed" | "implemented";
}

interface DataModelEditorProps {
  model?: DataModel;
  onSave: (model: Omit<DataModel, "id">) => void;
  onCancel: () => void;
  existingModels?: string[]; // For relationship targeting
}

export function DataModelEditor({ model, onSave, onCancel, existingModels = [] }: DataModelEditorProps) {
  const [formData, setFormData] = useState<Omit<DataModel, "id">>({
    name: model?.name || "",
    description: model?.description || "",
    type: model?.type || "entity",
    fields: model?.fields || [],
    relationships: model?.relationships || [],
    businessRules: model?.businessRules || [],
    status: model?.status || "draft",
  });

  const [currentField, setCurrentField] = useState<DataModelField>({
    name: "",
    type: "string",
    required: false,
    unique: false,
    defaultValue: "",
    description: "",
  });

  const [isAddingField, setIsAddingField] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  const [currentRelationship, setCurrentRelationship] = useState<DataModelRelationship>({
    type: "one-to-many",
    targetModel: "",
    foreignKey: "",
    description: "",
    cascadeDelete: false,
  });

  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [editingRelationshipIndex, setEditingRelationshipIndex] = useState<number | null>(null);

  const fieldTypes = [
    "string",
    "text",
    "number",
    "integer",
    "decimal",
    "boolean",
    "date",
    "datetime",
    "timestamp",
    "json",
    "uuid",
  ];

  const modelTypes = [
    { value: "entity", label: "Entity" },
    { value: "value_object", label: "Value Object" },
    { value: "aggregate", label: "Aggregate Root" },
    { value: "service", label: "Service" },
    { value: "dto", label: "DTO" },
  ];

  const handleAddField = () => {
    if (!currentField.name || !currentField.type) return;

    if (editingFieldIndex !== null) {
      const updatedFields = [...formData.fields];
      updatedFields[editingFieldIndex] = currentField;
      setFormData({ ...formData, fields: updatedFields });
      setEditingFieldIndex(null);
    } else {
      setFormData({ ...formData, fields: [...formData.fields, currentField] });
    }

    setCurrentField({
      name: "",
      type: "string",
      required: false,
      unique: false,
      defaultValue: "",
      description: "",
    });
    setIsAddingField(false);
  };

  const handleEditField = (index: number) => {
    setCurrentField(formData.fields[index]);
    setEditingFieldIndex(index);
    setIsAddingField(true);
  };

  const handleDeleteField = (index: number) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index),
    });
  };

  const handleAddRelationship = () => {
    if (!currentRelationship.targetModel) return;

    if (editingRelationshipIndex !== null) {
      const updatedRels = [...(formData.relationships || [])];
      updatedRels[editingRelationshipIndex] = currentRelationship;
      setFormData({ ...formData, relationships: updatedRels });
      setEditingRelationshipIndex(null);
    } else {
      setFormData({
        ...formData,
        relationships: [...(formData.relationships || []), currentRelationship],
      });
    }

    setCurrentRelationship({
      type: "one-to-many",
      targetModel: "",
      foreignKey: "",
      description: "",
      cascadeDelete: false,
    });
    setIsAddingRelationship(false);
  };

  const handleEditRelationship = (index: number) => {
    if (formData.relationships) {
      setCurrentRelationship(formData.relationships[index]);
      setEditingRelationshipIndex(index);
      setIsAddingRelationship(true);
    }
  };

  const handleDeleteRelationship = (index: number) => {
    setFormData({
      ...formData,
      relationships: formData.relationships?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.type || formData.fields.length === 0) {
      return;
    }
    onSave(formData);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "entity":
        return "📦";
      case "value_object":
        return "💎";
      case "aggregate":
        return "🎯";
      case "service":
        return "⚙️";
      case "dto":
        return "📄";
      default:
        return "📝";
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Model Information</CardTitle>
          <CardDescription>Define the basic properties of this data model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Model Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., User, Order, Product"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Model Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: string) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {getTypeIcon(type.value)} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this model represents and its purpose"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "draft" | "reviewed" | "implemented") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="implemented">Implemented</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fields</CardTitle>
              <CardDescription>Define the properties of this data model</CardDescription>
            </div>
            <Dialog open={isAddingField} onOpenChange={setIsAddingField}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingFieldIndex !== null ? "Edit Field" : "Add Field"}
                  </DialogTitle>
                  <DialogDescription>
                    Define the field properties and validation rules
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fieldName">Field Name *</Label>
                      <Input
                        id="fieldName"
                        value={currentField.name}
                        onChange={(e) =>
                          setCurrentField({ ...currentField, name: e.target.value })
                        }
                        placeholder="e.g., email, firstName, age"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fieldType">Field Type *</Label>
                      <Select
                        value={currentField.type}
                        onValueChange={(value) =>
                          setCurrentField({ ...currentField, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fieldDescription">Description</Label>
                    <Textarea
                      id="fieldDescription"
                      value={currentField.description}
                      onChange={(e) =>
                        setCurrentField({ ...currentField, description: e.target.value })
                      }
                      placeholder="Describe this field's purpose"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultValue">Default Value</Label>
                      <Input
                        id="defaultValue"
                        value={currentField.defaultValue}
                        onChange={(e) =>
                          setCurrentField({ ...currentField, defaultValue: e.target.value })
                        }
                        placeholder="Optional default value"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="required"
                        checked={currentField.required}
                        onCheckedChange={(checked) =>
                          setCurrentField({ ...currentField, required: checked as boolean })
                        }
                      />
                      <Label htmlFor="required" className="cursor-pointer">
                        Required
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="unique"
                        checked={currentField.unique}
                        onCheckedChange={(checked) =>
                          setCurrentField({ ...currentField, unique: checked as boolean })
                        }
                      />
                      <Label htmlFor="unique" className="cursor-pointer">
                        Unique
                      </Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingField(false);
                        setEditingFieldIndex(null);
                        setCurrentField({
                          name: "",
                          type: "string",
                          required: false,
                          unique: false,
                          defaultValue: "",
                          description: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddField}>
                      {editingFieldIndex !== null ? "Update Field" : "Add Field"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {formData.fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No fields defined yet. Click "Add Field" to begin.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formData.fields.map((field, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{field.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="secondary" className="text-xs">
                            required
                          </Badge>
                        )}
                        {field.unique && (
                          <Badge variant="secondary" className="text-xs">
                            unique
                          </Badge>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-xs text-gray-600">{field.description}</p>
                      )}
                      {field.defaultValue && (
                        <p className="text-xs text-gray-500 mt-1">
                          Default: {field.defaultValue}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEditField(index)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteField(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relationships */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Relationships</CardTitle>
              <CardDescription>Define how this model relates to others</CardDescription>
            </div>
            <Dialog open={isAddingRelationship} onOpenChange={setIsAddingRelationship}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Relationship
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingRelationshipIndex !== null ? "Edit Relationship" : "Add Relationship"}
                  </DialogTitle>
                  <DialogDescription>
                    Define how this model connects to other models
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="relationType">Relationship Type *</Label>
                    <Select
                      value={currentRelationship.type}
                      onValueChange={(value: any) =>
                        setCurrentRelationship({ ...currentRelationship, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-to-one">One-to-One</SelectItem>
                        <SelectItem value="one-to-many">One-to-Many</SelectItem>
                        <SelectItem value="many-to-one">Many-to-One</SelectItem>
                        <SelectItem value="many-to-many">Many-to-Many</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetModel">Target Model *</Label>
                    <Input
                      id="targetModel"
                      value={currentRelationship.targetModel}
                      onChange={(e) =>
                        setCurrentRelationship({
                          ...currentRelationship,
                          targetModel: e.target.value,
                        })
                      }
                      placeholder="e.g., Order, Customer, Product"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relDescription">Description</Label>
                    <Textarea
                      id="relDescription"
                      value={currentRelationship.description}
                      onChange={(e) =>
                        setCurrentRelationship({
                          ...currentRelationship,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe this relationship"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cascadeDelete"
                      checked={currentRelationship.cascadeDelete}
                      onCheckedChange={(checked) =>
                        setCurrentRelationship({
                          ...currentRelationship,
                          cascadeDelete: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="cascadeDelete" className="cursor-pointer">
                      Cascade Delete
                    </Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingRelationship(false);
                        setEditingRelationshipIndex(null);
                        setCurrentRelationship({
                          type: "one-to-many",
                          targetModel: "",
                          foreignKey: "",
                          description: "",
                          cascadeDelete: false,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddRelationship}>
                      {editingRelationshipIndex !== null
                        ? "Update Relationship"
                        : "Add Relationship"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!formData.relationships || formData.relationships.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No relationships defined</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formData.relationships.map((rel, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {rel.type}
                        </Badge>
                        <span className="text-sm font-medium">→ {rel.targetModel}</span>
                        {rel.cascadeDelete && (
                          <Badge variant="destructive" className="text-xs">
                            cascade
                          </Badge>
                        )}
                      </div>
                      {rel.description && (
                        <p className="text-xs text-gray-600">{rel.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEditRelationship(index)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteRelationship(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {model ? "Update Model" : "Create Model"}
        </Button>
      </div>
    </div>
  );
}
