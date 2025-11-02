import { ArrowRight, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const HomePage = () => {
  const { toast } = useToast();
  const [userName] = useState("Izzy"); // This could come from user profile later
  const [currentStreak] = useState(0);

  const getCurrentWeek = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    
    return days.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      return {
        day,
        date: date.getDate(),
        isToday: index === currentDay
      };
    });
  };

  const weekDays = getCurrentWeek();

  return (
    <div className="px-4 pb-24 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with Greeting and Streak */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif italic mb-1">Hey, {userName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-xl font-semibold">{currentStreak}</span>
            </div>
          </div>
        </div>

        {/* Today's Focus */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">TODAY'S FOCUS</p>
          <Card className="relative overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <p className="text-lg leading-relaxed flex-1">
                  return to your center — where gut-driven decisions are born
                </p>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted flex-shrink-0"
                  onClick={() => toast({ title: "Coming soon", description: "Focus mode will be available soon" })}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Week Calendar */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="text-xs text-muted-foreground mb-2">{item.day}</div>
                      <div className={`text-sm font-medium rounded-lg py-2 transition-colors ${
                        item.isToday 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}>
                        {item.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 hover:bg-card/80 transition-colors cursor-pointer">
            <div className="text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium">Daily Check-in</p>
            </div>
          </Card>
          
          <Card className="p-4 hover:bg-card/80 transition-colors cursor-pointer">
            <div className="text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p className="text-sm font-medium">Journal</p>
            </div>
          </Card>
        </div>

        {/* Reflection Prompt */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <h3 className="font-medium mb-2">Evening Reflection</h3>
          <p className="text-sm text-muted-foreground">
            What moment today reminded you of your true path?
          </p>
        </Card>
      </div>
    </div>
  );
};
