import { ChevronRight, Calendar, Compass, Target, TrendingUp, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";

const formatDate = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  return {
    greeting: now.getHours() < 12 ? 'good morning.' : now.getHours() < 18 ? 'good afternoon.' : 'good evening.',
    date: `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`
  };
};

const exercises = [
  { name: "Vision", icon: Compass },
  { name: "Goals", icon: Target },
  { name: "Growth", icon: TrendingUp },
  { name: "Values", icon: Lightbulb },
];

const categories = [
  "Career Path",
  "Personal Growth", 
  "Relationships",
  "Health & Energy",
  "Learning",
  "Purpose",
];

export const HomePage = () => {
  const { greeting, date } = formatDate();

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="text-3xl font-bold mb-1">{greeting}</h2>
          <p className="text-muted-foreground">{date}</p>
        </div>

        {/* Week Calendar */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-muted-foreground">THIS WEEK</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={day} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{day}</div>
                <div className={`text-sm font-medium rounded-lg py-2 ${i === 2 ? 'bg-primary text-primary-foreground' : ''}`}>
                  {8 + i}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Main Future Self Card */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Your Future Self</p>
          <Card className="bg-card-dark text-card-dark-foreground overflow-hidden">
            <div className="aspect-[4/5] relative bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-24 h-24 rounded-full bg-neutral-700 mx-auto mb-4" />
                <p className="text-sm text-neutral-400 mb-2">Your future self awaits</p>
                <h3 className="text-lg font-semibold mb-1">Generate Your Vision</h3>
                <p className="text-xs text-neutral-500">Upload your photo to see who you'll become</p>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">See Your Path</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Discover your future self and the journey to become them.
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Start your transformation</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Card>
        </div>

        {/* Pathways */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Pathways</p>
          <div className="grid grid-cols-2 gap-3">
            {exercises.map((exercise) => (
              <Card 
                key={exercise.name}
                className="border-border/50 p-6 cursor-pointer hover:border-foreground/20 transition-colors"
              >
                <div className="flex flex-col items-start justify-between h-32">
                  <h3 className="text-lg font-medium">{exercise.name}</h3>
                  <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
                    <exercise.icon className="h-5 w-5 text-muted-foreground" />
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

        {/* Evening Section */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Evening</p>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Reflect on your day</h3>
            <p className="text-sm text-muted-foreground">
              Take a moment to review your progress and set intentions for tomorrow
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
