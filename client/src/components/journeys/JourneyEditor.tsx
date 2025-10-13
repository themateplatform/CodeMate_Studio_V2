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
import { Plus, ArrowRight, Trash2, Edit, GripVertical, CheckCircle2 } from "lucide-react";

interface JourneyStep {
  step: string;
  description: string;
  touchpoints?: string[];
  expectations?: string;
}

interface UserJourney {
  id?: string;
  name: string;
  description: string;
  userType: string;
  steps: JourneyStep[];
  successCriteria?: string[];
  painPoints?: string[];
  priority: "high" | "medium" | "low";
  status: "draft" | "reviewed" | "implemented";
}

interface JourneyEditorProps {
  journey?: UserJourney;
  onSave: (journey: Omit<UserJourney, "id">) => void;
  onCancel: () => void;
}

export function JourneyEditor({ journey, onSave, onCancel }: JourneyEditorProps) {
  const [formData, setFormData] = useState<Omit<UserJourney, "id">>({
    name: journey?.name || "",
    description: journey?.description || "",
    userType: journey?.userType || "primary",
    steps: journey?.steps || [],
    successCriteria: journey?.successCriteria || [],
    painPoints: journey?.painPoints || [],
    priority: journey?.priority || "medium",
    status: journey?.status || "draft",
  });

  const [currentStep, setCurrentStep] = useState<JourneyStep>({
    step: "",
    description: "",
    touchpoints: [],
    expectations: "",
  });

  const [isAddingStep, setIsAddingStep] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  const handleAddStep = () => {
    if (!currentStep.step || !currentStep.description) return;

    if (editingStepIndex !== null) {
      // Update existing step
      const updatedSteps = [...formData.steps];
      updatedSteps[editingStepIndex] = currentStep;
      setFormData({ ...formData, steps: updatedSteps });
      setEditingStepIndex(null);
    } else {
      // Add new step
      setFormData({ ...formData, steps: [...formData.steps, currentStep] });
    }

    // Reset form
    setCurrentStep({
      step: "",
      description: "",
      touchpoints: [],
      expectations: "",
    });
    setIsAddingStep(false);
  };

  const handleEditStep = (index: number) => {
    setCurrentStep(formData.steps[index]);
    setEditingStepIndex(index);
    setIsAddingStep(true);
  };

  const handleDeleteStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...formData.steps];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newSteps.length) return;
    
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setFormData({ ...formData, steps: newSteps });
  };

  const addSuccessCriteria = () => {
    setFormData({
      ...formData,
      successCriteria: [...(formData.successCriteria || []), ""],
    });
  };

  const updateSuccessCriteria = (index: number, value: string) => {
    const updated = [...(formData.successCriteria || [])];
    updated[index] = value;
    setFormData({ ...formData, successCriteria: updated });
  };

  const removeSuccessCriteria = (index: number) => {
    setFormData({
      ...formData,
      successCriteria: formData.successCriteria?.filter((_, i) => i !== index),
    });
  };

  const addPainPoint = () => {
    setFormData({
      ...formData,
      painPoints: [...(formData.painPoints || []), ""],
    });
  };

  const updatePainPoint = (index: number, value: string) => {
    const updated = [...(formData.painPoints || [])];
    updated[index] = value;
    setFormData({ ...formData, painPoints: updated });
  };

  const removePainPoint = (index: number) => {
    setFormData({
      ...formData,
      painPoints: formData.painPoints?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.description || !formData.userType) {
      return;
    }
    onSave(formData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "implemented":
        return "bg-green-100 text-green-800 border-green-200";
      case "reviewed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Information</CardTitle>
          <CardDescription>Define the basic details of this user journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Journey Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New User Onboarding"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">User Type *</Label>
              <Input
                id="userType"
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                placeholder="e.g., Primary User, Admin, Guest"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this journey accomplishes and why it matters"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "high" | "medium" | "low") =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Journey Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Journey Steps</CardTitle>
              <CardDescription>Define the sequence of steps in this user journey</CardDescription>
            </div>
            <Dialog open={isAddingStep} onOpenChange={setIsAddingStep}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingStepIndex !== null ? "Edit Step" : "Add Journey Step"}
                  </DialogTitle>
                  <DialogDescription>
                    Define what the user does and experiences at this stage
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stepName">Step Name *</Label>
                    <Input
                      id="stepName"
                      value={currentStep.step}
                      onChange={(e) =>
                        setCurrentStep({ ...currentStep, step: e.target.value })
                      }
                      placeholder="e.g., Sign Up, Complete Profile, First Purchase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stepDescription">Description *</Label>
                    <Textarea
                      id="stepDescription"
                      value={currentStep.description}
                      onChange={(e) =>
                        setCurrentStep({ ...currentStep, description: e.target.value })
                      }
                      placeholder="Describe what happens in this step"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectations">User Expectations</Label>
                    <Textarea
                      id="expectations"
                      value={currentStep.expectations || ""}
                      onChange={(e) =>
                        setCurrentStep({ ...currentStep, expectations: e.target.value })
                      }
                      placeholder="What does the user expect to happen?"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingStep(false);
                        setEditingStepIndex(null);
                        setCurrentStep({
                          step: "",
                          description: "",
                          touchpoints: [],
                          expectations: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddStep}>
                      {editingStepIndex !== null ? "Update Step" : "Add Step"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {formData.steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No steps defined yet. Click "Add Step" to begin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.steps.map((step, index) => (
                <Card key={index} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 cursor-grab"
                          disabled
                        >
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm">{step.step}</h4>
                          <div className="flex gap-1 shrink-0">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleMoveStep(index, "up")}
                              >
                                ↑
                              </Button>
                            )}
                            {index < formData.steps.length - 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleMoveStep(index, "down")}
                              >
                                ↓
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEditStep(index)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteStep(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{step.description}</p>
                        {step.expectations && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            Expects: {step.expectations}
                          </p>
                        )}
                      </div>

                      {index < formData.steps.length - 1 && (
                        <div className="absolute left-8 -bottom-3 w-6 h-6 flex items-center justify-center bg-white">
                          <ArrowRight className="h-4 w-4 text-gray-400 rotate-90" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card>
        <CardHeader>
          <CardTitle>Pain Points</CardTitle>
          <CardDescription>Problems or frustrations this journey addresses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.painPoints && formData.painPoints.length > 0 ? (
            formData.painPoints.map((pain, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={pain}
                  onChange={(e) => updatePainPoint(index, e.target.value)}
                  placeholder="Describe a pain point"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePainPoint(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">No pain points defined</p>
          )}
          <Button variant="outline" size="sm" onClick={addPainPoint} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Pain Point
          </Button>
        </CardContent>
      </Card>

      {/* Success Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Success Criteria</CardTitle>
          <CardDescription>How to measure if this journey is successful</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.successCriteria && formData.successCriteria.length > 0 ? (
            formData.successCriteria.map((criteria, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={criteria}
                  onChange={(e) => updateSuccessCriteria(index, e.target.value)}
                  placeholder="e.g., 80% of users complete this journey"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSuccessCriteria(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">No success criteria defined</p>
          )}
          <Button variant="outline" size="sm" onClick={addSuccessCriteria} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Success Criteria
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {journey ? "Update Journey" : "Create Journey"}
        </Button>
      </div>
    </div>
  );
}
