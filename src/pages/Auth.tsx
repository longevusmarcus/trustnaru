import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { AuthStatusBanner } from "@/components/AuthStatusBanner";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const attemptAuth = async (data: AuthFormData, attempt = 0): Promise<void> => {
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          // Check for 503 backend errors
          if (error.message.includes('503') || error.message.includes('upstream')) {
            setIsOffline(true);
            setRetryCount(attempt + 1);
            
            // Exponential backoff: 2s, 4s, 8s, 16s, max 16s
            const delay = Math.min(2000 * Math.pow(2, attempt), 16000);
            
            if (attempt < 5) {
              setTimeout(() => {
                attemptAuth(data, attempt + 1);
              }, delay);
              return;
            }
          }
          throw error;
        }

        setIsOffline(false);
        toast({
          title: "Account created successfully!",
          description: "You can now sign in with your credentials.",
        });
        setIsSignUp(false);
        reset();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          // Check for 503 backend errors
          if (error.message.includes('503') || error.message.includes('upstream')) {
            setIsOffline(true);
            setRetryCount(attempt + 1);
            
            const delay = Math.min(2000 * Math.pow(2, attempt), 16000);
            
            if (attempt < 5) {
              setTimeout(() => {
                attemptAuth(data, attempt + 1);
              }, delay);
              return;
            }
          }
          throw error;
        }

        setIsOffline(false);
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      setIsOffline(false);
      toast({
        title: isSignUp ? "Sign up failed" : "Sign in failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      await attemptAuth(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <AuthStatusBanner isOffline={isOffline} />
        
        {/* Crystal Ball and Welcome Text */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-32 h-32 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-500/30 backdrop-blur-sm flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400/40 to-emerald-600/30 backdrop-blur-md" />
            </div>
          </div>
          
          <h1 className="text-4xl font-serif italic mb-2">Welcome to Naru</h1>
          <p className="text-muted-foreground">
            Learn to trust your gut and make decisions that feel right.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-muted/50 shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                className="h-12 bg-background/50"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}

              <Input
                id="password"
                type="password"
                placeholder="Password"
                className="h-12 bg-background/50"
                {...register("password")}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}

              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? "Sign up" : "Sign in"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    reset();
                  }}
                  disabled={isLoading}
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
