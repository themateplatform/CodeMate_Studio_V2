import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Target,
  Users,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Save,
  Eye,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  Rocket
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AISpecAnalysis } from "@/components/ai/AISpecAnalysis";
import { AISuggestions } from "@/components/ai/AISuggestions";
import { AITextImprover } from "@/components/ai/AITextImprover";
import { AIUserStories } from "@/components/ai/AIUserStories";
import { JourneyList } from "@/components/journeys/JourneyList";

interface SpecData {
  title: string;
  description: string;
  purpose: string;
  audience: string;
  problemStatement: string;
  solutionOverview: string;
  successMetrics: Array<{
    name: string;
    target: string;
    measurement: string;
  }>;
  acceptanceCriteria: string[];
}

interface UserJourney {
  id: string;
  name: string;
  description: string;
  userType: string;
  steps: Array<{
    step: string;
    description: string;
  }>;
  successCriteria: string[];
}

interface DataModel {
  id: string;
  name: string;
  description: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

export default function SpecEditorPage() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [generatingApp, setGeneratingApp] = useState(false);

  // Extract project ID from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const projectId = urlParams.get('projectId');

  const [specData, setSpecData] = useState<SpecData>({
    title: "",
    description: "",
    purpose: "",
    audience: "",
    problemStatement: "",
    solutionOverview: "",
    successMetrics: [],
    acceptanceCriteria: []
  });

  const [userJourneys, setUserJourneys] = useState<UserJourney[]>([]);
  const [dataModels, setDataModels] = useState<DataModel[]>([]);

  type LoadedSpec = (SpecData & { id: string }) & {
    userJourneys?: UserJourney[];
    dataModels?: DataModel[];
  };

  // Load existing spec if editing
  const { data: existingSpec, isLoading } = useQuery<LoadedSpec | null>({
    queryKey: ["/api/specs", projectId],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (existingSpec) {
      const {
        userJourneys: loadedJourneys = [],
        dataModels: loadedDataModels = [],
        ...rest
      } = existingSpec;

      setSpecData({
        title: rest.title,
        description: rest.description,
        purpose: rest.purpose,
        audience: rest.audience,
        problemStatement: rest.problemStatement,
        solutionOverview: rest.solutionOverview,
        successMetrics: rest.successMetrics ?? [],
        acceptanceCriteria: rest.acceptanceCriteria ?? [],
      });

      setUserJourneys(loadedJourneys);
      setDataModels(loadedDataModels);
    }
  }, [existingSpec]);

  const saveSpecMutation = useMutation({
    mutationFn: async (data: SpecData) => {
      const method = existingSpec ? "PUT" : "POST";
      const url = existingSpec ? `/api/specs/${existingSpec.id}` : "/api/specs";

      return apiRequest(method, url, { ...data, projectId });
    },
    onSuccess: () => {
      toast({
        title: "Specification saved",
        description: "Your living specification has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/specs"] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error saving specification",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (!specData.title.trim() || !specData.purpose.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and purpose are required fields.",
        variant: "destructive"
      });
      return;
    }
    saveSpecMutation.mutate(specData);
  };

  const addSuccessMetric = () => {
    setSpecData(prev => ({
      ...prev,
      successMetrics: [...prev.successMetrics, { name: "", target: "", measurement: "" }]
    }));
  };

  const updateSuccessMetric = (index: number, field: string, value: string) => {
    setSpecData(prev => ({
      ...prev,
      successMetrics: prev.successMetrics.map((metric, i) =>
        i === index ? { ...metric, [field]: value } : metric
      )
    }));
  };

  const removeSuccessMetric = (index: number) => {
    setSpecData(prev => ({
      ...prev,
      successMetrics: prev.successMetrics.filter((_, i) => i !== index)
    }));
  };

  const addAcceptanceCriteria = () => {
    setSpecData(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, ""]
    }));
  };

  const updateAcceptanceCriteria = (index: number, value: string) => {
    setSpecData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.map((criteria, i) =>
        i === index ? value : criteria
      )
    }));
  };

  const removeAcceptanceCriteria = (index: number) => {
    setSpecData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index)
    }));
  };

  const handleGenerateApp = async () => {
    if (!existingSpec) {
      toast({
        title: "Save specification first",
        description: "Please save your specification before generating an app.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingApp(true);
    try {
      const response = await apiRequest("POST", `/api/specs/${existingSpec.id}/generate`, {});
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Ready to generate!",
          description: "Redirecting to generator with your spec..."
        });
        
        // Navigate to generator with pre-filled prompt
        setTimeout(() => {
          navigate(`/generator?prompt=${encodeURIComponent(data.prompt)}&name=${encodeURIComponent(data.projectName)}`);
        }, 1000);
      } else {
        throw new Error(data.message || "Failed to generate");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingApp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {existingSpec ? "Edit Specification" : "Create Living Specification"}
              </h1>
              <p className="text-sm text-slate-600">
                Define your product vision as a single source of truth
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {existingSpec && !isEditing && (
              <Button onClick={handleGenerateApp} disabled={generatingApp}>
                <Rocket className="w-4 h-4 mr-2" />
                {generatingApp ? "Preparing..." : "Generate App"}
              </Button>
            )}
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={handleSave} disabled={saveSpecMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {saveSpecMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="journeys">User Journeys</TabsTrigger>
            <TabsTrigger value="data">Data Models</TabsTrigger>
            <TabsTrigger value="success">Success</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* AI Spec Analysis - Shown when not editing */}
            {!isEditing && specData.title && (
              <AISpecAnalysis specData={specData} />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Product Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Specification Title *
                    </label>
                    {isEditing ? (
                      <Input
                        value={specData.title}
                        onChange={(e) => setSpecData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Task Management Platform"
                      />
                    ) : (
                      <p className="text-slate-900 p-2 bg-slate-50 rounded">
                        {specData.title || "No title provided"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Target Audience *
                    </label>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            value={specData.audience}
                            onChange={(e) => setSpecData(prev => ({ ...prev, audience: e.target.value }))}
                            placeholder="e.g., Small business teams, freelancers"
                            className="flex-1"
                          />
                          <AISuggestions
                            context="audience"
                            label="Audience"
                            relatedContent={{
                              title: specData.title,
                              purpose: specData.purpose,
                            }}
                            onSelect={(suggestion) => setSpecData(prev => ({ ...prev, audience: suggestion }))}
                          />
                        </>
                      ) : (
                        <p className="text-slate-900 p-2 bg-slate-50 rounded flex-1">
                          {specData.audience || "No audience defined"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Purpose Statement *
                    </label>
                    {isEditing && specData.purpose && (
                      <AITextImprover
                        text={specData.purpose}
                        onSelect={(improvedText) => setSpecData(prev => ({ ...prev, purpose: improvedText }))}
                      />
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={specData.purpose}
                        onChange={(e) => setSpecData(prev => ({ ...prev, purpose: e.target.value }))}
                        placeholder="Why does this product exist? What value does it provide?"
                        rows={3}
                      />
                      {!specData.purpose && (
                        <AISuggestions
                          context="purpose"
                          label="Purpose"
                          relatedContent={{
                            title: specData.title,
                            audience: specData.audience,
                          }}
                          onSelect={(suggestion) => setSpecData(prev => ({ ...prev, purpose: suggestion }))}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-900 p-3 bg-slate-50 rounded whitespace-pre-wrap">
                      {specData.purpose || "No purpose defined"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Problem Statement
                    </label>
                    {isEditing && specData.problemStatement && (
                      <AITextImprover
                        text={specData.problemStatement}
                        onSelect={(improvedText) => setSpecData(prev => ({ ...prev, problemStatement: improvedText }))}
                      />
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={specData.problemStatement}
                        onChange={(e) => setSpecData(prev => ({ ...prev, problemStatement: e.target.value }))}
                        placeholder="What problem are you solving? What pain points exist today?"
                        rows={3}
                      />
                      {!specData.problemStatement && (
                        <AISuggestions
                          context="problem"
                          label="Problem"
                          relatedContent={{
                            title: specData.title,
                            purpose: specData.purpose,
                            audience: specData.audience,
                          }}
                          onSelect={(suggestion) => setSpecData(prev => ({ ...prev, problemStatement: suggestion }))}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-900 p-3 bg-slate-50 rounded whitespace-pre-wrap">
                      {specData.problemStatement || "No problem statement defined"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Solution Overview
                    </label>
                    {isEditing && specData.solutionOverview && (
                      <AITextImprover
                        text={specData.solutionOverview}
                        onSelect={(improvedText) => setSpecData(prev => ({ ...prev, solutionOverview: improvedText }))}
                      />
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={specData.solutionOverview}
                        onChange={(e) => setSpecData(prev => ({ ...prev, solutionOverview: e.target.value }))}
                        placeholder="How does your solution address the problem? What makes it unique?"
                        rows={3}
                      />
                      {!specData.solutionOverview && (
                        <AISuggestions
                          context="solution"
                          label="Solution"
                          relatedContent={{
                            title: specData.title,
                            purpose: specData.purpose,
                            audience: specData.audience,
                          }}
                          onSelect={(suggestion) => setSpecData(prev => ({ ...prev, solutionOverview: suggestion }))}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-900 p-3 bg-slate-50 rounded whitespace-pre-wrap">
                      {specData.solutionOverview || "No solution overview provided"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Acceptance Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addAcceptanceCriteria}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Acceptance Criteria
                  </Button>
                )}

                <div className="space-y-2">
                  {specData.acceptanceCriteria.map((criteria, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            value={criteria}
                            onChange={(e) => updateAcceptanceCriteria(index, e.target.value)}
                            placeholder="e.g., Users can create and manage tasks"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAcceptanceCriteria(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-slate-900">{criteria || "Empty criteria"}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {specData.acceptanceCriteria.length === 0 && !isEditing && (
                    <p className="text-slate-500 italic">No acceptance criteria defined</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="journeys" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User Journeys
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Define the core user experiences and journeys your product supports
                    </p>
                  </div>
                  <AIUserStories
                    specData={{
                      title: specData.title,
                      purpose: specData.purpose,
                      audience: specData.audience,
                      problemStatement: specData.problemStatement,
                      proposedSolution: specData.solutionOverview,
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {projectId ? (
                  <JourneyList specId={projectId} />
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Please save the specification first to create user journeys</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Data Models
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Define the data structures and entities your application will manage
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Data modeling coming soon...</p>
                  <p className="text-sm mt-2">This will help generate database schemas and APIs</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="success" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Success Metrics
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Define how you'll measure the success of your product
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSuccessMetric}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Success Metric
                  </Button>
                )}

                <div className="space-y-3">
                  {specData.successMetrics.map((metric, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Metric Name</label>
                          {isEditing ? (
                            <Input
                              value={metric.name}
                              onChange={(e) => updateSuccessMetric(index, 'name', e.target.value)}
                              placeholder="e.g., User Retention"
                            />
                          ) : (
                            <p className="text-slate-900 p-2 bg-slate-50 rounded">
                              {metric.name || "No name"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Target</label>
                          {isEditing ? (
                            <Input
                              value={metric.target}
                              onChange={(e) => updateSuccessMetric(index, 'target', e.target.value)}
                              placeholder="e.g., 70% after 30 days"
                            />
                          ) : (
                            <p className="text-slate-900 p-2 bg-slate-50 rounded">
                              {metric.target || "No target"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Measurement</label>
                          {isEditing ? (
                            <Input
                              value={metric.measurement}
                              onChange={(e) => updateSuccessMetric(index, 'measurement', e.target.value)}
                              placeholder="e.g., Analytics events"
                            />
                          ) : (
                            <p className="text-slate-900 p-2 bg-slate-50 rounded">
                              {metric.measurement || "No measurement"}
                            </p>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex justify-end mt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSuccessMetric(index)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}

                  {specData.successMetrics.length === 0 && !isEditing && (
                    <p className="text-slate-500 italic text-center py-4">No success metrics defined</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}