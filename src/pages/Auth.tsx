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

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);
import { AuthStatusBanner } from "@/components/AuthStatusBanner";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(true);
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const attemptAuth = async (data: AuthFormData, attempt = 0): Promise<void> => {
    try {
      if (isSignUp) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          // Check for 503 backend errors
          if (error.message.includes("503") || error.message.includes("upstream")) {
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

        // Track access code usage after successful signup
        const accessCode = localStorage.getItem("access_code");
        if (accessCode && signUpData.user) {
          // Log code usage for analytics
          await supabase
            .from("code_usage_log")
            .insert({
              code: accessCode,
              user_id: signUpData.user.id,
              email: signUpData.user.email,
              used_at: new Date().toISOString(),
            });

          // Mark VIP codes as used (non-"become" codes)
          if (accessCode !== "become") {
            await supabase
              .from("access_codes")
              .update({
                used: true,
                used_by: signUpData.user.id,
                used_at: new Date().toISOString(),
              })
              .eq("code", accessCode)
              .eq("used", false);
          }

          // Clear the code from localStorage
          localStorage.removeItem("access_code");
        }

        setIsOffline(false);
        toast({
          title: "Account created successfully!",
          description: "You can now sign in with your credentials.",
        });
        setIsSignUp(false);
        reset();
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          // Check for 503 backend errors
          if (error.message.includes("503") || error.message.includes("upstream")) {
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

        // Track access code usage after successful sign in as well
        const accessCode = localStorage.getItem("access_code");
        if (accessCode && signInData?.user) {
          // Log code usage for analytics
          await supabase
            .from("code_usage_log")
            .insert({
              code: accessCode,
              user_id: signInData.user.id,
              email: signInData.user.email,
              used_at: new Date().toISOString(),
            });

          // Mark VIP codes as used (non-"become" codes)
          if (accessCode !== "become") {
            await supabase
              .from("access_codes")
              .update({
                used: true,
                used_by: signInData.user.id,
                used_at: new Date().toISOString(),
              })
              .eq("code", accessCode)
              .eq("used", false);
          }

          localStorage.removeItem("access_code");
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
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
            The Career Dreamer & Copilot for your next era.
          </p>
          <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto mt-1 font-light">
            See your future self. Become it.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-muted/30 shadow-2xl backdrop-blur-sm bg-card/50 mb-6">
          <CardContent className="pt-6 pb-6 px-6">
            {/* Rating Section - Inside Card */}
            <div className="text-center mb-6">
              <p className="text-xs text-muted-foreground/70 mb-2 font-light">My creators rated me</p>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                ))}
              </div>
              <p className="text-sm font-light text-foreground/90">4.8 out of 5</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                className="h-11 bg-background/50 border-muted/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted/40 transition-colors"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}

              {!showForgotPassword && (
                <>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    className="h-11 bg-background/50 border-muted/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted/40 transition-colors"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-sm font-light tracking-wide bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {showForgotPassword ? "Send Reset Link" : isSignUp ? "Begin Your Journey" : "Continue Your Journey"}
              </Button>

              {!showForgotPassword && (
                <>
                  <div className="relative py-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted/30"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground/50 font-light">or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 text-sm font-light tracking-wide bg-background/50 border-muted/40 hover:bg-background/70 transition-all duration-300"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <GoogleIcon />
                    <span className="ml-2">Continue with Google</span>
                  </Button>
                </>
              )}

              <div className="text-center pt-1 space-y-3">
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
                  <>
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
                      {isSignUp ? "Already have an account? Sign in" : "New to Naru? Create account"}
                    </Button>

                    {!isSignUp && (
                      <div className="w-full flex justify-center">
                        <Button
                          type="button"
                          variant="link"
                          className="text-muted-foreground/70 hover:text-muted-foreground font-light text-xs h-auto p-0"
                          onClick={() => setShowForgotPassword(true)}
                          disabled={isLoading}
                        >
                          Forgot password?
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Terms and Privacy - Outside Card */}
        <p className="text-xs text-center text-muted-foreground/60 font-light px-4">
          By continuing, you agree to Naru&apos;s{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2"
          >
            Terms of Service
          </a>
          {", "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2"
          >
            Privacy Policy
          </a>
          {" and "}
          <a
            href="/cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2"
          >
            Cookie Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default Auth;
