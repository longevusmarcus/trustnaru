import { ArrowLeft, Moon, Sun, Database, Crown, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";

interface AccountSettingsProps {
  onBack: () => void;
}

export const AccountSettings = ({ onBack }: AccountSettingsProps) => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { isSubscribed, isLoading: subscriptionLoading, subscriptionEnd } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription portal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleBatchProcessCVs = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("batch-parse-cvs", {
        body: {},
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Batch Processing Complete",
        description: `Processed ${data.processed} CV(s). Check logs for details.`,
      });
    } catch (error) {
      console.error("Batch processing error:", error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process CVs",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Account Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pb-24 pt-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Subscription Section */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Subscription
            </h2>
            <Card>
              <CardContent className="p-6">
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : isSubscribed ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center">
                        <Crown className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Early Founder</div>
                        <div className="text-xs text-muted-foreground">
                          Career Development ID
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-foreground/10 text-foreground">
                        Active
                      </div>
                    </div>
                    
                    {subscriptionEnd && (
                      <div className="text-sm text-muted-foreground border-t border-border pt-4">
                        Renews on {format(new Date(subscriptionEnd), 'MMMM d, yyyy')}
                      </div>
                    )}
                    
                    <Button
                      onClick={handleOpenPortal}
                      disabled={isOpeningPortal}
                      variant="outline"
                      className="w-full"
                    >
                      {isOpeningPortal ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Manage Subscription
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Crown className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Free Plan</div>
                        <div className="text-xs text-muted-foreground">
                          Limited features
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Early Founder for $29/year to unlock all features including CV analysis, personalized paths, and AI coaching.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Appearance Section */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Appearance
            </h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Theme</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose your preferred theme
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-accent/5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <Sun className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Light Mode</div>
                          <div className="text-xs text-muted-foreground">
                            Bright and clear
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={theme === "light"}
                        onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-accent/5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <Moon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Dark Mode</div>
                          <div className="text-xs text-muted-foreground">
                            Easy on the eyes
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={theme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Preview
            </h2>
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Primary Text</span>
                  <div className="w-16 h-4 bg-foreground rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Secondary Text</span>
                  <div className="w-16 h-4 bg-muted-foreground rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Background</span>
                  <div className="w-16 h-4 bg-background border border-border rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Card</span>
                  <div className="w-16 h-4 bg-card border border-border rounded" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Tools Section */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Admin Tools
            </h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Batch CV Processing</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manually trigger batch processing of unparsed CVs
                    </p>
                  </div>

                  <Button
                    onClick={handleBatchProcessCVs}
                    disabled={isProcessing}
                    className="w-full"
                    variant="outline"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing CVs..." : "Process All Unparsed CVs"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
