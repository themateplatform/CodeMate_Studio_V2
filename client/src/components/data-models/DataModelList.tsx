import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Copy, Trash2, Edit, Database, Download } from "lucide-react";
import { DataModelEditor } from "./DataModelEditor";
import { useToast } from "@/hooks/use-toast";

interface DataModelField {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  defaultValue?: string;
  description?: string;
}

interface DataModel {
  id: string;
  name: string;
  description?: string;
  type: string;
  fields: DataModelField[];
  relationships?: any[];
  businessRules?: any[];
  status: "draft" | "reviewed" | "implemented";
  createdAt: string;
  updatedAt: string;
}

interface DataModelListProps {
  specId: string;
}

interface DataModelStats {
  total: number;
  byType?: Record<string, number>;
  byStatus?: Record<string, number>;
  totalFields: number;
  totalRelationships: number;
  avgFieldsPerModel: number;
}

export function DataModelList({ specId }: DataModelListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingModel, setEditingModel] = useState<DataModel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  const { data: models = [], isLoading } = useQuery<DataModel[]>({
    queryKey: [`/api/specs/${specId}/data-models`],
  });

  const { data: stats } = useQuery<DataModelStats>({
    queryKey: [`/api/specs/${specId}/data-models/stats`],
  });

  const createModelMutation = useMutation({
    mutationFn: async (model: Omit<DataModel, "id" | "createdAt" | "updatedAt">) => {
      const res = await fetch(`/api/specs/${specId}/data-models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(model),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/data-models`] });
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/data-models/stats`] });
      setIsCreating(false);
      toast({ title: "Model created", description: "Data model has been created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: async ({ id, model }: { id: string; model: Partial<Omit<DataModel, "id" | "createdAt" | "updatedAt">> }) => {
      const res = await fetch(`/api/data-models/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(model),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/data-models`] });
      setEditingModel(null);
      toast({ title: "Model updated", description: "Data model has been updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/data-models/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/data-models`] });
      setModelToDelete(null);
      toast({ title: "Model deleted", description: "Data model has been deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const duplicateModelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/data-models/${id}/duplicate`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/specs/${specId}/data-models`] });
      toast({ title: "Model duplicated", description: "Data model has been duplicated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleExportSQL = async (id: string) => {
    try {
      const res = await fetch(`/api/data-models/${id}/export/sql`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      await navigator.clipboard.writeText(data.sql);
      toast({ title: "Exported", description: "SQL schema copied to clipboard" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredModels = models.filter((model) => {
    const matchesSearch = searchQuery === "" || model.name.toLowerCase().includes(searchQuery.toLowerCase()) || model.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || model.status === statusFilter;
    const matchesType = typeFilter === "all" || model.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Data Model</h3>
          <Button variant="outline" onClick={() => setIsCreating(false)}>Back to List</Button>
        </div>
        <DataModelEditor onSave={(model) => createModelMutation.mutate(model)} onCancel={() => setIsCreating(false)} existingModels={models.map((m) => m.name)} />
      </div>
    );
  }

  if (editingModel) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit Data Model</h3>
          <Button variant="outline" onClick={() => setEditingModel(null)}>Back to List</Button>
        </div>
        <DataModelEditor model={editingModel} onSave={(model) => updateModelMutation.mutate({ id: editingModel.id, model })} onCancel={() => setEditingModel(null)} existingModels={models.map((m) => m.name)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Models</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Fields</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalFields}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Relationships</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalRelationships}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Avg Fields/Model</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.avgFieldsPerModel}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search models..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="implemented">Implemented</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="entity">Entity</SelectItem>
                <SelectItem value="value_object">Value Object</SelectItem>
                <SelectItem value="aggregate">Aggregate</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="dto">DTO</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreating(true)}><Plus className="w-4 h-4 mr-2" />New Model</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading models...</div>
      ) : filteredModels.length === 0 ? (
        <Card><CardContent className="py-12"><div className="text-center text-gray-500"><Database className="w-12 h-12 mx-auto mb-4 opacity-50" /><p className="mb-4">No data models found</p><Button onClick={() => setIsCreating(true)}><Plus className="w-4 h-4 mr-2" />Create Your First Model</Button></div></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredModels.map((model) => (
            <Card key={model.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <Badge variant="outline">{model.type.replace("_", " ")}</Badge>
                      <Badge variant="outline">{model.status}</Badge>
                    </div>
                    {model.description && <p className="text-sm text-gray-600">{model.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{model.fields.length} fields</span>
                      {model.relationships && model.relationships.length > 0 && <><span>•</span><span>{model.relationships.length} relationships</span></>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingModel(model)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => duplicateModelMutation.mutate(model.id)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleExportSQL(model.id)}><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setModelToDelete(model.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!modelToDelete} onOpenChange={() => setModelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this data model. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => modelToDelete && deleteModelMutation.mutate(modelToDelete)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
