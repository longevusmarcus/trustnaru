import { User, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  onNavigate: (page: string) => void;
}

export const Header = ({ title, onNavigate }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        <h1 className="text-sm font-medium">{title}</h1>
        <div className="flex items-center gap-2">
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
