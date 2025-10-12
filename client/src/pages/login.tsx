import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // on success redirect to projects
      setLocation('/projects');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // After sign up, redirect to projects (email confirm may be required)
      setLocation('/projects');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B15] text-white">
      <div className="w-full max-w-md bg-card p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Sign in to CodeMate Studio</h2>
        <div className="space-y-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          {error && <div className="text-destructive text-sm">{error}</div>}
          <div className="flex items-center justify-between">
            <Button onClick={signIn} disabled={loading}>Sign in</Button>
            <Button variant="ghost" onClick={signUp} disabled={loading}>Sign up</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
