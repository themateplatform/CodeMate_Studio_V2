import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function AuthDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"sign-in" | "sign-up" | "reset">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Signed in" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Sign in failed", description: e?.message || "Please try again" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast({ title: "Check your email", description: "Confirm your address to finish signup" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Sign up failed", description: e?.message || "Please try again" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast({ title: "Reset email sent", description: "Check your inbox for the reset link" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Reset failed", description: e?.message || "Please try again" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="bg-[#0B0B15] text-white border-gray-800">
        <DialogHeader>
          <DialogTitle>Welcome to CodeMate Studio</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 bg-gray-900">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
            <TabsTrigger value="reset">Reset</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in" className="space-y-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-gray-900 border-gray-800 text-white" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="bg-gray-900 border-gray-800 text-white" />
            <Button onClick={handleSignIn} disabled={loading} className="w-full bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF]">Sign In</Button>
          </TabsContent>
          <TabsContent value="sign-up" className="space-y-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-gray-900 border-gray-800 text-white" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="bg-gray-900 border-gray-800 text-white" />
            <Button onClick={handleSignUp} disabled={loading} className="w-full bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF]">Create Account</Button>
          </TabsContent>
          <TabsContent value="reset" className="space-y-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-gray-900 border-gray-800 text-white" />
            <Button onClick={handleReset} disabled={loading} className="w-full bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF]">Send Reset Link</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
