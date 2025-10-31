import { Search, Sparkles, Target, TrendingUp, Heart, Users, CheckCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const exercises = [
  { name: "Vision", icon: Sparkles, color: "from-violet-500 to-purple-600" },
  { name: "Goals", icon: Target, color: "from-blue-500 to-cyan-600" },
  { name: "Growth", icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
  { name: "Values", icon: Heart, color: "from-rose-500 to-pink-600" },
];

const categories = [
  "Career Path",
  "Personal Growth", 
  "Relationships",
  "Health & Energy",
  "Learning",
  "Purpose",
];

const pathsLibrary = [
  {
    id: "path-1",
    name: "The Mindful Leader",
    description: "Balance ambition with inner peace",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=200&fit=crop",
    tags: ["Leadership", "Wellness"]
  },
  {
    id: "path-2",
    name: "The Digital Nomad",
    description: "Work from anywhere, live everywhere",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&h=200&fit=crop",
    tags: ["Freedom", "Tech"]
  },
  {
    id: "path-3",
    name: "The Creative Visionary",
    description: "Turn ideas into reality",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop",
    tags: ["Creativity", "Innovation"]
  },
  {
    id: "path-4",
    name: "The Tech Entrepreneur",
    description: "Build products that scale",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=200&fit=crop",
    tags: ["Startup", "Innovation"]
  }
];

const profilesLibrary = [
  {
    id: "profile-1",
    name: "Sarah Chen",
    description: "VP Product at Tech Unicorn",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=200&fit=crop",
    tags: ["Product", "Leadership"]
  },
  {
    id: "profile-2",
    name: "Marcus Rodriguez",
    description: "Founder & CEO of Design Studio",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=200&fit=crop",
    tags: ["Design", "Entrepreneurship"]
  },
  {
    id: "profile-3",
    name: "Elena Popov",
    description: "AI Research Lead at OpenAI",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=200&fit=crop",
    tags: ["AI", "Research"]
  },
  {
    id: "profile-4",
    name: "James Park",
    description: "Creative Director at Nike",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=200&fit=crop",
    tags: ["Creative", "Brand"]
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
            placeholder="Search exercises and pathways..."
            className="pl-10 bg-card"
          />
        </div>

        {/* Exercises */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Pathways</p>
          <div className="grid grid-cols-2 gap-3">
            {exercises.map((exercise) => (
              <Card 
                key={exercise.name}
                className="bg-card-dark text-card-dark-foreground p-6 cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="flex flex-col items-start justify-between h-32">
                  <h3 className="text-lg font-semibold">{exercise.name}</h3>
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${exercise.color} flex items-center justify-center`}>
                    <exercise.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Future Self Library - Paths */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paths</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {pathsLibrary.map((item) => (
              <Card 
                key={item.id}
                className="overflow-hidden flex-shrink-0 w-48"
              >
                <div className="relative h-32">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <h4 className="text-sm font-medium">{item.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex gap-2">
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

        {/* Future Self Library - Profiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profiles to Clone</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {profilesLibrary.map((item) => (
              <Card 
                key={item.id}
                className="overflow-hidden flex-shrink-0 w-48"
              >
                <div className="relative h-32">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <h4 className="text-sm font-medium">{item.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex gap-2">
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

        {/* How can Path Genius help */}
        <div>
          <h3 className="text-base font-semibold mb-3">How can Path Genius help you?</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:bg-secondary transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Featured */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Featured</p>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Design Your Future</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A guided pathway to visualize and plan your ideal future self
            </p>
            <div className="text-xs text-muted-foreground">30 min • Beginner friendly</div>
          </Card>
        </div>
      </div>
    </div>
  );
};
