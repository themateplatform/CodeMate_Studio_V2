import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '../../../src/integrations/supabase/client';

interface AdminUser { id: string; email: string | null; }

export default function AdminPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in');
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load users');
      setUsers((json.users || []).map((u: any) => ({ id: u.id, email: u.email })));
    } catch (e: any) {
      toast({ title: 'Cannot load users', description: e?.message || 'Ensure server admin env vars and ADMIN_EMAILS are set' });
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password: password || undefined })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add user');
      toast({ title: 'User added' });
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (e: any) {
      toast({ title: 'Add failed', description: e?.message });
    }
  };

  const removeUser = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in');
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove');
      toast({ title: 'User removed' });
      fetchUsers();
    } catch (e: any) {
      toast({ title: 'Remove failed', description: e?.message });
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="min-h-screen bg-[#0B0B15] text-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Admin Portal</h1>
        <Card className="p-4 bg-gray-900 border-gray-800">
          <h2 className="font-semibold mb-3">Add User</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-gray-800 border-gray-700 text-white" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (optional)" type="password" className="bg-gray-800 border-gray-700 text-white" />
            <Button onClick={addUser} className="bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF]">Add</Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">If password is omitted, an invite email will be sent.</p>
        </Card>

        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Users</h2>
            <Button variant="secondary" onClick={fetchUsers} disabled={loading}>Refresh</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">Email</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-white">{u.email}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" onClick={() => removeUser(u.id)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">No users</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
