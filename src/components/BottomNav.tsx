import { Home, Lightbulb, Plus, Eye, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavProps {
  active: string;
  onNavigate: (page: string) => void;
}

export const BottomNav = ({ active, onNavigate }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate("home")}
          className={active === "home" ? "text-foreground" : "text-muted-foreground"}
        >
          <Home className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate("insights")}
          className={active === "insights" ? "text-foreground" : "text-muted-foreground"}
        >
          <Lightbulb className="h-5 w-5" />
        </Button>
        
        <Button
          variant="default"
          size="icon"
          className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90"
          onClick={() => onNavigate("add")}
        >
          <Plus className="h-6 w-6" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate("future")}
          className={active === "future" ? "text-foreground" : "text-muted-foreground"}
        >
          <Eye className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate("action")}
          className={active === "action" ? "text-foreground" : "text-muted-foreground"}
        >
          <Target className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  );
};
