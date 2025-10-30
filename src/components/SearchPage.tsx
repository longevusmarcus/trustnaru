import { Search, Sparkles, Target, TrendingUp, Heart, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

        {/* Future Self Library */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Future Self Library</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {futureLibrary.map((future) => (
              <Card 
                key={future.name}
                className="overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="relative h-48">
                  <img 
                    src={future.image} 
                    alt={future.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h4 className="font-semibold text-sm mb-1">{future.name}</h4>
                    <p className="text-xs opacity-90 line-clamp-2">{future.description}</p>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">{future.traits}</p>
                </div>
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
