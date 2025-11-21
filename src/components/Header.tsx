import { User, Star, Globe, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  title: string;
  onNavigate: (page: string) => void;
}

const sections = [
  { id: "home", label: "Dashboard" },
  { id: "future", label: "Futures" },
  { id: "copilot", label: "Copilot" },
  { id: "insights", label: "Insights" },
  { id: "mentors", label: "Journeys" },
  { id: "community", label: "Community" },
  { id: "profile", label: "Profile" },
];

export const Header = ({ title, onNavigate }: HeaderProps) => {
  const [exploredSections, setExploredSections] = useState<string[]>([]);

  useEffect(() => {
    const explored = JSON.parse(localStorage.getItem("explored_sections") || "[]");
    setExploredSections(explored);
  }, [title]);

  useEffect(() => {
    // Map title to section id
    const sectionMap: Record<string, string> = {
      "dashboard": "home",
      "your futures": "future",
      "copilot": "copilot",
      "insights": "insights",
      "journeys": "mentors",
      "community": "community",
      "profile": "profile",
    };

    const currentSection = sectionMap[title.toLowerCase()];
    if (currentSection && !exploredSections.includes(currentSection)) {
      const updated = [...exploredSections, currentSection];
      setExploredSections(updated);
      localStorage.setItem("explored_sections", JSON.stringify(updated));
    }
  }, [title]);

  const progress = exploredSections.length;
  const total = sections.length;

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        <h1 className="text-sm font-medium">{title}</h1>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full relative">
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary-foreground">{progress}</span>
                </div>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Exploration</p>
                  <p className="text-xs text-muted-foreground">{progress}/{total}</p>
                </div>
                <div className="space-y-1">
                  {sections.map((section) => (
                    <div key={section.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-1 h-1 rounded-full ${exploredSections.includes(section.id) ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      <span className={exploredSections.includes(section.id) ? "text-foreground" : "text-muted-foreground"}>
                        {section.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onNavigate("community")}>
            <Globe className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onNavigate("mentors")}>
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onNavigate("profile")}>
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
