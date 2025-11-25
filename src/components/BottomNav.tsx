import { Home, Lightbulb, Plus, Eye, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavProps {
  active: string;
  onNavigate: (page: string) => void;
  isVisible?: boolean;
}

export const BottomNav = ({ active, onNavigate, isVisible = true }: BottomNavProps) => {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 pb-safe pointer-events-none transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-full shadow-lg pointer-events-auto">
          <div className="flex items-center justify-around h-16 px-6 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("home")}
              className={`flex flex-col items-center gap-1 h-auto py-2 hover:bg-transparent hover:text-foreground ${
                active === "home" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">Today</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("future")}
              className={`flex flex-col items-center gap-1 h-auto py-2 hover:bg-transparent hover:text-foreground ${
                active === "future" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Eye className="h-5 w-5" />
              <span className="text-[10px] font-medium">Futures</span>
            </Button>

            <Button
              variant="default"
              size="icon"
              className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg -mt-8 relative"
              onClick={() => onNavigate("add")}
            >
              <Plus className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("insights")}
              className={`flex flex-col items-center gap-1 h-auto py-2 hover:bg-transparent hover:text-foreground ${
                active === "insights" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Lightbulb className="h-5 w-5" />
              <span className="text-[10px] font-medium">Insights</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("copilot")}
              className={`flex flex-col items-center gap-1 h-auto py-2 hover:bg-transparent hover:text-foreground ${
                active === "copilot" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Target className="h-5 w-5" />
              <span className="text-[10px] font-medium">Copilot</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
