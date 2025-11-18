import { Search, CheckCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const profilesLibrary = [
  {
    id: "profile-1",
    name: "Sarah Chen",
    description: "VP Product at Tech Unicorn",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=200&fit=crop",
    tags: ["Product", "Leadership"],
    journey: "Designer → PM → Senior PM → Director → VP Product (8 years)",
    routine: "6am exercise, 9-5 focused work, family evenings",
    lifestyle: "San Francisco, family-focused, mentorship-driven",
    tasks: ["Product strategy", "Stakeholder alignment", "Team growth"],
    impact: "Shaped products used by 50M+ people daily"
  },
  {
    id: "profile-2",
    name: "Marcus Rodriguez",
    description: "Founder & CEO of Design Studio",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=200&fit=crop",
    tags: ["Design", "Entrepreneurship"],
    journey: "Freelancer → Agency → Founder → Award-winning studio (10 years)",
    routine: "Creative mornings, client calls, evening portfolio reviews",
    lifestyle: "Brooklyn studio, art community, work-life balance",
    tasks: ["Creative direction", "Business development", "Team culture"],
    impact: "Elevated 100+ brands through thoughtful design"
  },
  {
    id: "profile-3",
    name: "Elena Popov",
    description: "AI Research Lead at OpenAI",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=200&fit=crop",
    tags: ["AI", "Research"],
    journey: "PhD Research → PostDoc → Research Scientist → Lead (12 years)",
    routine: "Deep research mornings, collaboration afternoons, reading nights",
    lifestyle: "Academic-tech hybrid, conference travel, continuous learning",
    tasks: ["Research direction", "Paper reviews", "Model development"],
    impact: "Published work cited 10K+ times, advancing AI safety"
  },
  {
    id: "profile-4",
    name: "James Park",
    description: "Creative Director at Nike",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=200&fit=crop",
    tags: ["Creative", "Brand"],
    journey: "Junior Designer → Art Director → Senior AD → Creative Director (9 years)",
    routine: "Inspiration hunting, creative reviews, sports activities",
    lifestyle: "Portland, active lifestyle, brand immersion",
    tasks: ["Campaign concepts", "Brand evolution", "Creative leadership"],
    impact: "Created campaigns that defined modern athletic culture"
  }
];

export const SearchPage = () => {
  const [approvedPaths, setApprovedPaths] = useState<string[]>([]);
  const [rejectedPaths, setRejectedPaths] = useState<string[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setApprovedPaths([...approvedPaths, id]);
    setRejectedPaths(rejectedPaths.filter(rid => rid !== id));
  };

  const handleReject = (id: string) => {
    setRejectedPaths([...rejectedPaths, id]);
    setApprovedPaths(approvedPaths.filter(aid => aid !== id));
  };
  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search library..."
            className="pl-10 bg-card"
          />
        </div>

        {/* Mentor Profiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mentor Profiles</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {profilesLibrary.map((item) => (
              <Card 
                key={item.id}
                className="overflow-hidden flex-shrink-0 w-64 border-border/50"
              >
                <div 
                  className="relative h-32 cursor-pointer"
                  onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                >
                  <img 
                    src={item.image} 
                    alt={`${item.name} - Career mentor profile and journey`}
                    className="w-full h-full object-cover opacity-80"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <CardContent className="p-3 space-y-2">
                  <div 
                    className="cursor-pointer"
                    onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                  >
                    <h4 className="text-sm font-medium">{item.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  </div>
                  
                  {expandedCard === item.id && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Career Journey</p>
                        <p className="text-xs">{item.journey}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Routine</p>
                        <p className="text-xs">{item.routine}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lifestyle</p>
                        <p className="text-xs">{item.lifestyle}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Key Tasks</p>
                        <ul className="text-xs space-y-1">
                          {item.tasks.map((task, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-muted-foreground">•</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Impact</p>
                        <p className="text-xs italic">{item.impact}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={approvedPaths.includes(item.id) ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-7 px-2"
                      onClick={() => handleApprove(item.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={rejectedPaths.includes(item.id) ? "destructive" : "outline"}
                      size="sm"
                      className="flex-1 h-7 px-2"
                      onClick={() => handleReject(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
