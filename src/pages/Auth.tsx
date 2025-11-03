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
import { Loader2, Star } from "lucide-react";
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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
      if (showForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        
        if (error) throw error;
        
        toast({
          title: "Password reset email sent",
          description: "Check your email for the password reset link.",
        });
        setShowForgotPassword(false);
        reset();
      } else {
        await attemptAuth(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/10 p-4">
      <div className="w-full max-w-md">
        <AuthStatusBanner isOffline={isOffline} />
        
        {/* Crystal Ball and Welcome Text */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="w-28 h-28 mx-auto mb-4 relative">
            {/* Outer glow with elegant pulse */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
            
            {/* Middle glow layer */}
            <div className="absolute inset-3 bg-gradient-to-br from-emerald-300/40 to-emerald-500/30 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite]" />
            
            {/* Crystal ball container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25 backdrop-blur-sm flex items-center justify-center border border-emerald-400/20 shadow-2xl animate-[pulse_3.5s_ease-in-out_infinite]">
              {/* Inner sphere with light reflection */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/30 blur-md" />
                <div className="absolute bottom-4 left-4 w-8 h-8 rounded-full bg-emerald-200/20 blur-lg" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-light tracking-wide mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome to Naru
          </h1>
          <p className="text-sm text-muted-foreground/90 max-w-xs mx-auto leading-relaxed font-light">
            The world&apos;s first database of human potential.
          </p>
          <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto mt-1 font-light">
            Become who you&apos;re meant to be.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-muted/30 shadow-2xl backdrop-blur-sm bg-card/50">
          <CardContent className="pt-6 pb-6 px-6">
            {/* Rating Section - Inside Card */}
            <div className="text-center mb-6">
              <p className="text-xs text-muted-foreground/70 mb-2 font-light">Our customers rated us</p>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                ))}
              </div>
              <p className="text-sm font-light text-foreground/90">4.8 out of 5</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                className="h-11 bg-background/50 border-muted/40 focus-visible:border-emerald-400/50 transition-colors"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}

              {!showForgotPassword && (
                <>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    className="h-11 bg-background/50 border-muted/40 focus-visible:border-emerald-400/50 transition-colors"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 text-sm font-light tracking-wide bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {showForgotPassword 
                  ? "Send Reset Link" 
                  : isSignUp 
                    ? "Begin Your Journey" 
                    : "Continue Your Journey"}
              </Button>

              <div className="text-center pt-1 space-y-1">
                {!isSignUp && !showForgotPassword && (
                  <Button
                    type="button"
                    variant="link"
                    className="text-muted-foreground/70 hover:text-muted-foreground font-light text-xs h-auto p-0"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                )}
                
                {showForgotPassword ? (
                  <Button
                    type="button"
                    variant="link"
                    className="text-muted-foreground/70 hover:text-muted-foreground font-light text-xs h-auto p-0"
                    onClick={() => {
                      setShowForgotPassword(false);
                      reset();
                    }}
                    disabled={isLoading}
                  >
                    Back to sign in
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="text-muted-foreground/70 hover:text-muted-foreground font-light text-xs h-auto p-0"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      reset();
                    }}
                    disabled={isLoading}
                  >
                    {isSignUp
                      ? "Already have an account? Sign in"
                      : "New to Naru? Create account"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
