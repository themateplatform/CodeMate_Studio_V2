import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  ArrowLeft, 
  Plus, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  Key, 
  Shield, 
  History, 
  RefreshCw, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Database,
  Settings
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form schemas
const secretSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-zA-Z0-9_-]+$/, "Key must contain only alphanumeric characters, underscores, and hyphens"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  value: z.string().min(1, "Value is required"),
  category: z.enum(["api", "database", "auth", "custom"]),
  environment: z.enum(["production", "staging", "development"]),
  rotationEnabled: z.boolean().default(false),
  rotationInterval: z.number().min(1).optional()
});

const tokenSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  expiryHours: z.number().min(1).max(168).default(24),
  maxUsages: z.number().min(1).optional(),
  scopedSecrets: z.array(z.string()).min(1, "At least one secret must be selected")
});

type SecretFormData = z.infer<typeof secretSchema>;
type TokenFormData = z.infer<typeof tokenSchema>;

export default function SecretsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedSecret, setSelectedSecret] = useState<string | null>(null);
  const [showSecretValue, setShowSecretValue] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  
  // Load current user to check admin access
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
  });

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  // Load secrets
  const { data: secrets = [], isLoading: secretsLoading } = useQuery({
    queryKey: ['/api/secrets', { category: categoryFilter, environment: environmentFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (environmentFilter !== 'all') params.append('environment', environmentFilter);
      
      const response = await fetch(`/api/secrets?${params}`);
      if (!response.ok) throw new Error('Failed to load secrets');
      return response.json();
    },
    enabled: isAdmin
  });

  // Load tokens
  const { data: tokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ['/api/secrets/tokens'],
    queryFn: async () => {
      const response = await fetch('/api/secrets/tokens');
      if (!response.ok) throw new Error('Failed to load tokens');
      return response.json();
    },
    enabled: isAdmin
  });

  // Secret mutations
  const createSecretMutation = useMutation({
    mutationFn: async (data: SecretFormData) => {
      return apiRequest('/api/secrets', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/secrets'] });
      toast({
        title: 'Secret created',
        description: 'The secret has been created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating secret',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const updateSecretMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: { value: string, reason?: string } }) => {
      return apiRequest(`/api/secrets/${id}`, {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/secrets'] });
      toast({
        title: 'Secret updated',
        description: 'The secret has been rotated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating secret',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const deleteSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/secrets/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/secrets'] });
      toast({
        title: 'Secret deleted',
        description: 'The secret has been deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting secret',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Token mutations
  const createTokenMutation = useMutation({
    mutationFn: async (data: TokenFormData) => {
      return apiRequest('/api/secrets/tokens', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/secrets/tokens'] });
      // Show the token in a dialog
      navigator.clipboard.writeText(data.token);
      toast({
        title: 'Token created',
        description: 'Token has been created and copied to clipboard',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating token',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      return apiRequest(`/api/secrets/tokens/${tokenId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/secrets/tokens'] });
      toast({
        title: 'Token revoked',
        description: 'The token has been revoked successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error revoking token',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Secret value query (only when requested)
  const { data: secretValue, isLoading: secretValueLoading } = useQuery({
    queryKey: ['/api/secrets', showSecretValue, 'value'],
    queryFn: async () => {
      const response = await fetch(`/api/secrets/${showSecretValue}/value`);
      if (!response.ok) throw new Error('Failed to load secret value');
      const data = await response.json();
      return data.value;
    },
    enabled: !!showSecretValue
  });

  // Audit trail query
  const { data: auditTrail = [] } = useQuery({
    queryKey: ['/api/secrets', selectedSecret, 'audit'],
    queryFn: async () => {
      const response = await fetch(`/api/secrets/${selectedSecret}/audit`);
      if (!response.ok) throw new Error('Failed to load audit trail');
      return response.json();
    },
    enabled: !!selectedSecret
  });

  // Forms
  const secretForm = useForm<SecretFormData>({
    resolver: zodResolver(secretSchema),
    defaultValues: {
      category: 'api',
      environment: 'production',
      rotationEnabled: false
    }
  });

  const tokenForm = useForm<TokenFormData>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      expiryHours: 24,
      scopedSecrets: []
    }
  });

  // Loading state
  if (userLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              You need admin privileges to access secrets management.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation('/projects')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleViewSecret = (secretId: string) => {
    setShowSecretValue(secretId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'The value has been copied to your clipboard',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/settings')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Secrets Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Securely manage API keys, tokens, and other sensitive configuration values
            </p>
          </div>
        </div>

        <Tabs defaultValue="secrets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="secrets" data-testid="tab-secrets">
              <Key className="h-4 w-4 mr-2" />
              Secrets
            </TabsTrigger>
            <TabsTrigger value="tokens" data-testid="tab-tokens">
              <Users className="h-4 w-4 mr-2" />
              Access Tokens
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <History className="h-4 w-4 mr-2" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          {/* Secrets Tab */}
          <TabsContent value="secrets" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organization Secrets</CardTitle>
                    <CardDescription>
                      Manage encrypted secrets for your organization
                    </CardDescription>
                  </div>
                  
                  {/* Create Secret Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-secret">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Secret
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Secret</DialogTitle>
                        <DialogDescription>
                          Add a new encrypted secret to your organization
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...secretForm}>
                        <form onSubmit={secretForm.handleSubmit((data) => createSecretMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={secretForm.control}
                            name="key"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Key</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="api_key_openai" data-testid="input-secret-key" />
                                </FormControl>
                                <FormDescription>Unique identifier for this secret</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={secretForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="OpenAI API Key" data-testid="input-secret-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={secretForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="API key for OpenAI integration" data-testid="input-secret-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={secretForm.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" placeholder="sk-..." data-testid="input-secret-value" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={secretForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-secret-category">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="api">API</SelectItem>
                                      <SelectItem value="database">Database</SelectItem>
                                      <SelectItem value="auth">Authentication</SelectItem>
                                      <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={secretForm.control}
                              name="environment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Environment</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-secret-environment">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="production">Production</SelectItem>
                                      <SelectItem value="staging">Staging</SelectItem>
                                      <SelectItem value="development">Development</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              disabled={createSecretMutation.isPending}
                              data-testid="button-submit-secret"
                            >
                              {createSecretMutation.isPending ? 'Creating...' : 'Create Secret'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="filter-category">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="auth">Authentication</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="filter-environment">
                      <SelectValue placeholder="Filter by environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Environments</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Secrets Table */}
                {secretsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading secrets...</p>
                  </div>
                ) : secrets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No secrets found</p>
                    <p className="text-sm">Create your first secret to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {secrets.map((secret: any) => (
                        <TableRow key={secret.id} data-testid={`row-secret-${secret.id}`}>
                          <TableCell className="font-mono font-medium">{secret.key}</TableCell>
                          <TableCell>{secret.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{secret.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={secret.environment === 'production' ? 'destructive' : 'outline'}>
                              {secret.environment}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {secret.isActive ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500 border-gray-500">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(secret.updatedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View Secret Value */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewSecret(secret.id)}
                                    data-testid={`button-view-${secret.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Secret Value - {secret.name}</DialogTitle>
                                    <DialogDescription>
                                      This action is logged for security auditing
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {secretValueLoading ? (
                                      <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                                        <p className="text-sm text-muted-foreground">Loading secret value...</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <Label>Secret Value</Label>
                                        <div className="flex items-center gap-2">
                                          <Input
                                            value={secretValue || ''}
                                            readOnly
                                            className="font-mono text-sm"
                                            data-testid={`text-secret-value-${secret.id}`}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(secretValue)}
                                            data-testid={`button-copy-${secret.id}`}
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {/* View Audit Trail */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedSecret(secret.id)}
                                    data-testid={`button-audit-${secret.id}`}
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Audit Trail - {secret.name}</DialogTitle>
                                    <DialogDescription>
                                      Complete access and modification history
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="max-h-96 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Timestamp</TableHead>
                                          <TableHead>User</TableHead>
                                          <TableHead>Action</TableHead>
                                          <TableHead>Method</TableHead>
                                          <TableHead>Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {auditTrail.map((entry: any) => (
                                          <TableRow key={entry.id}>
                                            <TableCell className="text-sm">
                                              {formatDate(entry.createdAt)}
                                            </TableCell>
                                            <TableCell>{entry.userId}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline">{entry.accessType}</Badge>
                                            </TableCell>
                                            <TableCell>{entry.accessMethod}</TableCell>
                                            <TableCell>
                                              {entry.success ? (
                                                <Badge variant="outline" className="text-green-600">Success</Badge>
                                              ) : (
                                                <Badge variant="destructive">Failed</Badge>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {/* Delete Secret */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`button-delete-${secret.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Secret</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{secret.name}"? This action cannot be undone and may break applications that depend on this secret.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteSecretMutation.mutate(secret.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      data-testid={`button-confirm-delete-${secret.id}`}
                                    >
                                      Delete Secret
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Tokens Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Service Access Tokens</CardTitle>
                    <CardDescription>
                      Short-lived tokens for service-to-service communication
                    </CardDescription>
                  </div>
                  
                  {/* Create Token Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-token">
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Token
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Access Token</DialogTitle>
                        <DialogDescription>
                          Create a short-lived token for service access
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...tokenForm}>
                        <form onSubmit={tokenForm.handleSubmit((data) => createTokenMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={tokenForm.control}
                            name="serviceId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Service ID</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="backend-api-v1" data-testid="input-service-id" />
                                </FormControl>
                                <FormDescription>Unique identifier for the requesting service</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={tokenForm.control}
                              name="expiryHours"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Expiry (Hours)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      min={1} 
                                      max={168}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      data-testid="input-expiry-hours" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={tokenForm.control}
                              name="maxUsages"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Max Uses (Optional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      min={1}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                      data-testid="input-max-uses" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={tokenForm.control}
                            name="scopedSecrets"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Accessible Secrets</FormLabel>
                                <FormDescription>Select which secrets this token can access</FormDescription>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {secrets.map((secret: any) => (
                                    <div key={secret.id} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`secret-${secret.id}`}
                                        checked={field.value?.includes(secret.key) || false}
                                        onChange={(e) => {
                                          const currentValue = field.value || [];
                                          if (e.target.checked) {
                                            field.onChange([...currentValue, secret.key]);
                                          } else {
                                            field.onChange(currentValue.filter((key: string) => key !== secret.key));
                                          }
                                        }}
                                        data-testid={`checkbox-secret-${secret.key}`}
                                        className="rounded border-gray-300"
                                      />
                                      <label htmlFor={`secret-${secret.id}`} className="text-sm">
                                        {secret.name} ({secret.key})
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              disabled={createTokenMutation.isPending}
                              data-testid="button-submit-token"
                            >
                              {createTokenMutation.isPending ? 'Generating...' : 'Generate Token'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent>
                {tokensLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading tokens...</p>
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No access tokens found</p>
                    <p className="text-sm">Generate tokens for service-to-service communication</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service ID</TableHead>
                        <TableHead>Scoped Secrets</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokens.map((token: any) => (
                        <TableRow key={token.id} data-testid={`row-token-${token.id}`}>
                          <TableCell className="font-mono">{token.serviceId}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {token.scopedSecrets.slice(0, 2).map((key: string) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}
                                </Badge>
                              ))}
                              {token.scopedSecrets.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{token.scopedSecrets.length - 2} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(token.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(token.expiresAt)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {token.usageCount || 0}
                              {token.maxUsages && ` / ${token.maxUsages}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            {token.isRevoked ? (
                              <Badge variant="destructive">Revoked</Badge>
                            ) : new Date(token.expiresAt) < new Date() ? (
                              <Badge variant="secondary">Expired</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!token.isRevoked && new Date(token.expiresAt) > new Date() && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`button-revoke-${token.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke Token</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to revoke this access token? Services using this token will lose access immediately.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => revokeTokenMutation.mutate(token.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      data-testid={`button-confirm-revoke-${token.id}`}
                                    >
                                      Revoke Token
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Audit Trail</CardTitle>
                <CardDescription>
                  Complete history of all secrets management activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>System-wide audit trail coming soon</p>
                  <p className="text-sm">Individual secret audit trails are available in the secrets tab</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}