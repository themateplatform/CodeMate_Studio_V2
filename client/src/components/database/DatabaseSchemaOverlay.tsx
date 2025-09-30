import { useState } from 'react';
import { X, Database, Table, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
// import type { DatabaseSchema } from '@shared/schema';

interface DatabaseSchemaOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export default function DatabaseSchemaOverlay({ 
  isOpen, 
  onClose, 
  projectId 
}: DatabaseSchemaOverlayProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schemas = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'database/schema'],
    enabled: !!projectId && isOpen,
  });

  const syncSchemaMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/projects/${projectId}/database/sync`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'database/schema'] });
      toast({
        title: "Success",
        description: "Database schema synced successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync database schema",
        variant: "destructive",
      });
    }
  });

  const selectedSchema = schemas.find(s => s.tableName === selectedTable);

  const renderColumnType = (column: any) => {
    const typeColor = column.primary ? 'bg-primary/20 text-primary' 
                    : column.nullable ? 'bg-muted' 
                    : 'bg-accent/20 text-accent';
    
    return (
      <Badge variant="outline" className={typeColor}>
        {column.type}
        {column.primary && ' PK'}
        {!column.nullable && !column.primary && ' NOT NULL'}
      </Badge>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" data-testid="database-schema-overlay">
      <div className="absolute inset-4 bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Database Schema</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncSchemaMutation.mutate()}
              disabled={syncSchemaMutation.isPending}
              data-testid="button-sync-schema"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncSchemaMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Schema
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              data-testid="button-close-schema"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex h-full">
          {/* Tables List */}
          <div className="w-80 border-r border-border">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3">Tables</h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-2 bg-secondary/30 rounded animate-pulse h-12" />
                  ))}
                </div>
              ) : schemas.length === 0 ? (
                <div className="text-center text-muted-foreground py-8" data-testid="no-tables">
                  <Table className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tables found</p>
                  <p className="text-xs">Sync your database to view schema</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {schemas.map((schema) => (
                      <div
                        key={schema.id}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          selectedTable === schema.tableName
                            ? 'bg-secondary'
                            : 'bg-secondary/50 hover:bg-secondary/70'
                        }`}
                        onClick={() => setSelectedTable(schema.tableName)}
                        data-testid={`table-${schema.tableName}`}
                      >
                        <div className="flex items-center space-x-2">
                          <Table className="w-4 h-4 text-accent" />
                          <div>
                            <div className="font-medium text-sm">{schema.tableName}</div>
                            <div className="text-xs text-muted-foreground">
                              {Array.isArray(schema.columns) ? schema.columns.length : 0} columns
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
          
          {/* Schema Details */}
          <div className="flex-1 p-4">
            {selectedSchema ? (
              <div data-testid={`schema-details-${selectedSchema.tableName}`}>
                <div className="flex items-center space-x-2 mb-4">
                  <Table className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-semibold">{selectedSchema.tableName}</h3>
                </div>
                
                {Array.isArray(selectedSchema.columns) ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Columns</h4>
                    <div className="space-y-2">
                      {selectedSchema.columns.map((column: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                          data-testid={`column-${column.name}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{column.name}</span>
                            {renderColumnType(column)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <p>Column information not available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground" data-testid="no-table-selected">
                <div className="text-center">
                  <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a table to view its schema</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
