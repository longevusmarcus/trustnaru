import { Search, Sparkles, Target, TrendingUp, Heart } from "lucide-react";
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
