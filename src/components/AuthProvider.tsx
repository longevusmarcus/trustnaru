import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Session, User } from "@supabase/supabase-js";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Auth init failed:', err);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
        toast({ title: "Success! You can now sign in." });
        setIsSignUp(false);
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Signed in successfully!" });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({ 
        title: "Authentication failed", 
        description: error.message || "Network error. Please check your connection.", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Please wait..." : (isSignUp ? "Sign Up" : "Sign In")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
