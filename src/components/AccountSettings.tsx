import { ArrowLeft, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";

interface AccountSettingsProps {
  onBack: () => void;
}

export const AccountSettings = ({ onBack }: AccountSettingsProps) => {
  const { theme, setTheme } = useTheme();
  
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
        </div>
      </div>
    </div>
  );
};
