import { Smile, Lightbulb, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

const timelineData = [
  {
    time: "17:06",
    type: "mood",
    title: "Mood Check-in",
    content: "You felt good",
    icon: Smile,
  },
  {
    time: "17:05", 
    type: "mood",
    title: "Mood Check-in",
    content: "You felt good",
    icon: Smile,
  },
  {
    time: "08:40",
    type: "reflection",
    title: "Morning Reflection",
    content: "Have you got a clear picture of what you want to accomplish today?",
    response: "Más o menos",
    tags: ["Sleep 4/5", "Motivation 3/5", "Work"],
    icon: Lightbulb,
  },
  {
    time: "08:39",
    type: "mood",
    title: "Mood Check-in", 
    content: "You felt good",
    icon: Smile,
  },
];

export const TimelinePage = () => {
  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button className="text-sm font-medium">Day</button>
          <button className="text-sm text-muted-foreground">Week</button>
          <button className="text-sm text-muted-foreground">Month</button>
          <button className="text-sm text-muted-foreground">Year</button>
        </div>

        {/* Today Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Today <span className="text-muted-foreground font-normal">10 Aug</span></h2>
          
          <div className="space-y-3">
            {timelineData.slice(0, 2).map((item, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="text-sm font-medium">{item.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Earlier Section */}
        <div className="mb-6">
          <div className="space-y-3">
            {timelineData.slice(2).map((item, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.content}</p>
                    {item.response && (
                      <p className="text-sm font-medium mb-2">{item.response}</p>
                    )}
                    {item.tags && (
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 text-xs bg-secondary rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Previous Days */}
        <div>
          <h2 className="text-xl font-bold mb-4">Monday <span className="text-muted-foreground font-normal">08 Aug</span></h2>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Smile className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mood Check-in</p>
                  <span className="text-xs text-muted-foreground">17:26</span>
                </div>
                <p className="text-sm font-medium">You felt nervous, annoyed, jealous.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
