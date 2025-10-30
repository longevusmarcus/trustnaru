import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center animate-pulse">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-foreground/20 to-foreground/10" />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight">
            Ready to see your future self?
          </h1>
          
          <p className="text-muted-foreground text-lg">
            In just a few minutes, discover who you're becoming
          </p>
        </div>

        <Button 
          onClick={onStart}
          className="w-full h-12 text-base font-medium"
        >
          Start Your Journey
        </Button>
      </div>
    </div>
  );
};
