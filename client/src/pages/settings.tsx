import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Github, Users, Key, History, Shield, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [githubPat, setGithubPat] = useState('');
  const [showPat, setShowPat] = useState(false);

  // Load current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
  });

  // Load organization members (if admin/owner)
  const { data: orgMembers = [] } = useQuery({
    queryKey: ['/api/organizations/members'],
    queryFn: async () => {
      const response = await fetch('/api/organizations/members');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner')
  });

  // Load audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['/api/audit-logs'],
    queryFn: async () => {
      const response = await fetch('/api/audit-logs');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser
  });

  // GitHub connection status
  const { data: githubConnection } = useQuery({
    queryKey: ['/api/github/connection'],
    queryFn: async () => {
      const response = await fetch('/api/github/connection');
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser
  });

  // GitHub PAT status
  const { data: storedPat, isLoading: patLoading } = useQuery({
    queryKey: ['/api/github/pat'],
    queryFn: async () => {
      const response = await fetch('/api/github/pat');
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser
  });

  const disconnectGitHubMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/github/disconnect', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to disconnect GitHub');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/connection'] });
      toast({
        title: 'GitHub disconnected',
        description: 'Your GitHub account has been disconnected',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error disconnecting GitHub',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const saveGitHubPatMutation = useMutation({
    mutationFn: async (pat: string) => {
      return apiRequest('POST', '/api/github/pat', { pat });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/pat'] });
      setGithubPat('');
      toast({
        title: 'GitHub PAT saved',
        description: 'Your Personal Access Token has been saved securely',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error saving GitHub PAT',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteGitHubPatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/github/pat');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/pat'] });
      toast({
        title: 'GitHub PAT removed',
        description: 'Your Personal Access Token has been removed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing GitHub PAT',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Redirect to login if not authenticated
  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    setLocation('/login');
    return null;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'owner';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/projects')}
              data-testid="button-back-projects"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
            {isAdmin && <TabsTrigger value="organization" data-testid="tab-organization">Organization</TabsTrigger>}
            {isAdmin && <TabsTrigger value="secrets" data-testid="tab-secrets">
              <Shield className="h-4 w-4 mr-2" />
              Secrets
            </TabsTrigger>}
            <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>
                  Manage your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={currentUser.username} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={currentUser.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div>
                      <Badge variant={currentUser.role === 'owner' ? 'default' : 'secondary'}>
                        {currentUser.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <Input 
                      value={new Date(currentUser.createdAt).toLocaleDateString()} 
                      disabled 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Github className="w-5 h-5" />
                  <span>GitHub Integration</span>
                </CardTitle>
                <CardDescription>
                  Connect your GitHub account to import and sync repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {githubConnection ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Connected as {githubConnection.username}</p>
                      <p className="text-sm text-muted-foreground">
                        Connected {new Date(githubConnection.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => disconnectGitHubMutation.mutate()}
                      disabled={disconnectGitHubMutation.isPending}
                      data-testid="button-disconnect-github"
                    >
                      {disconnectGitHubMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Github className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">GitHub account not connected</p>
                    <Button 
                      onClick={() => window.location.href = '/api/auth/github'}
                      data-testid="button-connect-github"
                    >
                      <Github className="w-4 h-4 mr-2" />
                      Connect GitHub
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GitHub Personal Access Token */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>GitHub Personal Access Token</span>
                </CardTitle>
                <CardDescription>
                  Use your personal access token for direct GitHub control and private repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {storedPat ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100">
                            GitHub PAT configured
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Created {new Date(storedPat.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGitHubPatMutation.mutate()}
                        disabled={deleteGitHubPatMutation.isPending}
                        data-testid="button-remove-github-pat"
                        className="border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        {deleteGitHubPatMutation.isPending ? 'Removing...' : 'Remove PAT'}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">
                        <strong>Benefits of using GitHub PAT:</strong>
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Access to private repositories</li>
                        <li>Fine-grained permissions control</li>
                        <li>No OAuth dependency</li>
                        <li>Manual push/pull control</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="github-pat">Personal Access Token</Label>
                      <div className="relative">
                        <Input
                          id="github-pat"
                          type={showPat ? "text" : "password"}
                          value={githubPat}
                          onChange={(e) => setGithubPat(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          data-testid="input-github-pat"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPat(!showPat)}
                          data-testid="button-toggle-pat-visibility"
                        >
                          {showPat ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Generate a PAT at{' '}
                        <a 
                          href="https://github.com/settings/personal-access-tokens/new" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          GitHub Settings
                        </a>
                        {' '}with "Contents" and "Metadata" permissions
                      </p>
                    </div>
                    <Button 
                      onClick={() => githubPat.trim() && saveGitHubPatMutation.mutate(githubPat.trim())}
                      disabled={!githubPat.trim() || saveGitHubPatMutation.isPending}
                      data-testid="button-save-github-pat"
                      className="w-full"
                    >
                      {saveGitHubPatMutation.isPending ? 'Saving...' : 'Save GitHub PAT'}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">
                        <strong>Why use a Personal Access Token?</strong>
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Access private repositories that OAuth can't reach</li>
                        <li>Fine-grained control over repository permissions</li>
                        <li>Manual push/pull operations for precise Git control</li>
                        <li>Works independently of OAuth connections</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="organization" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Organization Members</span>
                  </CardTitle>
                  <CardDescription>
                    Manage members and their roles in your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {orgMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No organization members found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orgMembers.map((member: any) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.username}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                                {member.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={member.isActive ? 'default' : 'secondary'}>
                                {member.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="secrets" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Secrets Management</span>
                  </CardTitle>
                  <CardDescription>
                    Manage encrypted secrets and access tokens for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <Button 
                    onClick={() => setLocation('/secrets')}
                    data-testid="button-secrets-page"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Open Secrets Management
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    Comprehensive secrets management with encryption, rotation, and audit trails
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="audit" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-5 h-5" />
                  <span>Audit Log</span>
                </CardTitle>
                <CardDescription>
                  View recent activity and security events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No audit logs found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.slice(0, 20).map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell>{log.resource || 'N/A'}</TableCell>
                          <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-sm">{log.ipAddress || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}