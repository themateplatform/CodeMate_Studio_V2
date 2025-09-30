import { useState } from "react";
import { Database, Table, Columns, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Project } from "@/types";
import { cn } from "@/lib/utils";

interface DatabaseSchemaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
}

interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    foreignKey?: string;
  }>;
}

export function DatabaseSchemaViewer({ isOpen, onClose, currentProject }: DatabaseSchemaViewerProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock schema data - replace with actual Supabase integration
  const mockTables: TableSchema[] = [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primaryKey: true },
        { name: 'email', type: 'text', nullable: false, primaryKey: false },
        { name: 'username', type: 'text', nullable: false, primaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false },
      ]
    },
    {
      name: 'projects',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primaryKey: true },
        { name: 'user_id', type: 'uuid', nullable: false, primaryKey: false, foreignKey: 'users.id' },
        { name: 'name', type: 'text', nullable: false, primaryKey: false },
        { name: 'description', type: 'text', nullable: true, primaryKey: false },
        { name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false },
      ]
    }
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    // TODO: Implement actual Supabase schema fetching
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose}>
      <div 
        className="absolute inset-4 bg-card border border-border rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Database Schema</h2>
            {currentProject?.supabaseProjectId && (
              <Badge variant="outline">{currentProject.supabaseProjectId}</Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Tables List */}
          <div className="w-80 border-r border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Tables</h3>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {mockTables.map((table) => (
                  <div
                    key={table.name}
                    className={cn(
                      "p-3 rounded-md cursor-pointer transition-colors",
                      selectedTable === table.name ? "bg-secondary" : "bg-secondary/50 hover:bg-secondary/70"
                    )}
                    onClick={() => setSelectedTable(table.name)}
                    data-testid={`table-${table.name}`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Table className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{table.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {table.columns.length} columns
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Schema Visualization */}
          <div className="flex-1 p-4">
            {selectedTable ? (
              <div className="h-full">
                <div className="flex items-center space-x-2 mb-4">
                  <Columns className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-semibold">{selectedTable}</h3>
                </div>

                <div className="space-y-2">
                  {mockTables.find(t => t.name === selectedTable)?.columns.map((column) => (
                    <div
                      key={column.name}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-sm">{column.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {column.type}
                        </Badge>
                        {column.primaryKey && (
                          <Badge variant="default" className="text-xs bg-primary">
                            PK
                          </Badge>
                        )}
                        {column.foreignKey && (
                          <Badge variant="secondary" className="text-xs">
                            FK → {column.foreignKey}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {column.nullable ? 'nullable' : 'not null'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
