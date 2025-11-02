import { Search, CheckCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const pathsLibrary = [
  {
    id: "path-1",
    name: "The Mindful Leader",
    description: "Balance ambition with inner peace",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=200&fit=crop",
    tags: ["Leadership", "Wellness"],
    salary: "$120K - $180K/year",
    routine: "Morning meditation, deep work blocks, evening walks",
    lifestyle: "Hybrid work, 4-day week, focus on wellbeing",
    tasks: ["Team strategy", "Mindful meetings", "Coaching sessions"],
    impact: "Build teams that thrive emotionally and professionally"
  },
  {
    id: "path-2",
    name: "The Digital Nomad",
    description: "Work from anywhere, live everywhere",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&h=200&fit=crop",
    tags: ["Freedom", "Tech"],
    salary: "$80K - $150K/year",
    routine: "Flexible hours, coworking spaces, weekly travel",
    lifestyle: "Remote-first, slow travel, digital minimalism",
    tasks: ["Client projects", "Content creation", "Network building"],
    impact: "Prove location independence creates better work-life harmony"
  },
  {
    id: "path-3",
    name: "The Creative Visionary",
    description: "Turn ideas into reality",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop",
    tags: ["Creativity", "Innovation"],
    salary: "$100K - $160K/year",
    routine: "Creative mornings, collaborative afternoons, inspiration time",
    lifestyle: "Studio culture, art scenes, continuous learning",
    tasks: ["Concept development", "Team direction", "Client pitches"],
    impact: "Create work that makes people feel something meaningful"
  },
  {
    id: "path-4",
    name: "The Tech Entrepreneur",
    description: "Build products that scale",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=200&fit=crop",
    tags: ["Startup", "Innovation"],
    salary: "$150K+ equity",
    routine: "Product sprints, investor meetings, team building",
    lifestyle: "High intensity, high reward, mission-driven",
    tasks: ["Product roadmap", "Fundraising", "Scaling team"],
    impact: "Build solutions that improve millions of lives"
  }
];

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

const futureLibrary = [
  {
    name: "Creative Strategist",
    description: "Leading wellness ventures in major European cities",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
    traits: "Creative • Strategic • Wellness-focused"
  },
  {
    name: "Tech Entrepreneur",
    description: "Building AI-powered platforms that scale globally",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=400&fit=crop",
    traits: "Innovative • Technical • Visionary"
  },
  {
    name: "Design Director",
    description: "Leading creative teams at top design studios",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=400&fit=crop",
    traits: "Creative • Leadership • Design"
  },
  {
    name: "Wellness Coach",
    description: "Helping professionals find balance and purpose",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=400&fit=crop",
    traits: "Empathetic • Holistic • Inspiring"
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
            placeholder="Search mentors..."
            className="pl-10 bg-card"
          />
        </div>

        {/* Mentor Profiles Database */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mentors</p>
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
                    alt={item.name}
                    className="w-full h-full object-cover opacity-80"
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
