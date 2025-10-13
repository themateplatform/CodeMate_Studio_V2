import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Copy, Trash2, Edit, ExternalLink, ArrowRight } from "lucide-react";
import { JourneyEditor } from "./JourneyEditor";
import { useToast } from "@/hooks/use-toast";

interface JourneyStep {
  step: string;
  description: string;
  touchpoints?: string[];
  expectations?: string;
}

interface UserJourney {
  id: string;
  name: string;
  description: string;
  userType: string;
  steps: JourneyStep[];
  successCriteria?: string[];
  painPoints?: string[];
  priority: "high" | "medium" | "low";
  status: "draft" | "reviewed" | "implemented";
  createdAt: string;
  updatedAt: string;
}

interface JourneyListProps {
  specId: string;
}

interface JourneyStats {
  total: number;
  byStatus?: {
    draft?: number;
    reviewed?: number;
    implemented?: number;
  };
  byPriority?: {
    high?: number;
    medium?: number;
    low?: number;
  };
  userTypes?: string[];
  avgStepsPerJourney?: number;
}

export function JourneyList({ specId }: JourneyListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [editingJourney, setEditingJourney] = useState<UserJourney | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [journeyToDelete, setJourneyToDelete] = useState<string | null>(null);

  // Fetch journeys
  const { data: journeys = [], isLoading } = useQuery<UserJourney[]>({
    queryKey: [`/api/specs/${specId}/journeys`],
  });

  // Fetch stats
  const { data: stats } = useQuery<JourneyStats>({
    queryKey: [`/api/specs/${specId}/journeys/stats`],
  });

  // Create journey mutation
  const createJourneyMutation = useMutation({
    mutationFn: async (journey: Omit<UserJourney, "id" | "createdAt" | "updatedAt">) => {
      const res = await fetch(`/api/specs/${specId}/journeys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journey),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys`] });
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys/stats`] });
      setIsCreating(false);
      toast({
        title: "Journey created",
        description: "User journey has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update journey mutation
  const updateJourneyMutation = useMutation({
    mutationFn: async ({
      id,
      journey,
    }: {
      id: string;
      journey: Partial<Omit<UserJourney, "id" | "createdAt" | "updatedAt">>;
    }) => {
      const res = await fetch(`/api/journeys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journey),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys`] });
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys/stats`] });
      setEditingJourney(null);
      toast({
        title: "Journey updated",
        description: "User journey has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete journey mutation
  const deleteJourneyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/journeys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys`] });
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys/stats`] });
      setJourneyToDelete(null);
      toast({
        title: "Journey deleted",
        description: "User journey has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate journey mutation
  const duplicateJourneyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/journeys/${id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys`] });
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/journeys/stats`] });
      toast({
        title: "Journey duplicated",
        description: "User journey has been duplicated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export journey
  const handleExport = async (id: string) => {
    try {
      const res = await fetch(`/api/journeys/${id}/export/user-stories`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({
        title: "Exported",
        description: "Journey exported and copied to clipboard",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter journeys
  const filteredJourneys = journeys.filter((journey) => {
    const matchesSearch =
      searchQuery === "" ||
      journey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journey.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journey.userType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || journey.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || journey.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

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

  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create User Journey</h3>
          <Button variant="outline" onClick={() => setIsCreating(false)}>
            Back to List
          </Button>
        </div>
        <JourneyEditor
          onSave={(journey) => createJourneyMutation.mutate(journey)}
          onCancel={() => setIsCreating(false)}
        />
      </div>
    );
  }

  if (editingJourney) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit User Journey</h3>
          <Button variant="outline" onClick={() => setEditingJourney(null)}>
            Back to List
          </Button>
        </div>
        <JourneyEditor
          journey={editingJourney}
          onSave={(journey) =>
            updateJourneyMutation.mutate({ id: editingJourney.id, journey })
          }
          onCancel={() => setEditingJourney(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Journeys</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Implemented</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.byStatus?.implemented || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {stats.byStatus?.reviewed || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-600">
                {stats.byStatus?.draft || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search journeys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="implemented">Implemented</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Journey
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Journey List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading journeys...</div>
      ) : filteredJourneys.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <p className="mb-4">No user journeys found</p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Journey
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJourneys.map((journey) => (
            <Card key={journey.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{journey.name}</CardTitle>
                      <Badge variant="outline" className={getPriorityColor(journey.priority)}>
                        {journey.priority}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(journey.status)}>
                        {journey.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">{journey.description}</CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>User Type: {journey.userType}</span>
                      <span>•</span>
                      <span>{journey.steps.length} steps</span>
                      {journey.successCriteria && journey.successCriteria.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{journey.successCriteria.length} success criteria</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingJourney(journey)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateJourneyMutation.mutate(journey.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport(journey.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setJourneyToDelete(journey.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {journey.steps.length > 0 && (
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {journey.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {step.step}
                        </Badge>
                        {index < journey.steps.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!journeyToDelete} onOpenChange={() => setJourneyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user journey. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => journeyToDelete && deleteJourneyMutation.mutate(journeyToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
