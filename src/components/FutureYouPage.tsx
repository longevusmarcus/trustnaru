import { Share2, RefreshCw, MapPin, Briefcase, Clock, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export const FutureYouPage = () => {
  const navigate = useNavigate();
  
  const futureCards = [
    {
      title: "Creative Strategist",
      location: "Milan & Lisbon",
      role: "Leading wellness ventures",
      schedule: "Works 4 days/week with deep purpose",
      income: "$100K per year",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
      pathImages: [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop"
      ],
      roadmap: [
        { step: "Master brand storytelling", duration: "3 months" },
        { step: "Launch wellness side project", duration: "6 months" },
        { step: "Build European network", duration: "12 months" },
        { step: "Transition to hybrid leadership role", duration: "18 months" }
      ],
      affirmations: [
        "You create work that makes people feel alive",
        "Your creativity flows when you trust your intuition",
        "Balance and purpose drive your success"
      ]
    },
    {
      title: "Tech Entrepreneur",
      location: "San Francisco",
      role: "Building AI-powered platforms",
      schedule: "Flexible remote work",
      income: "$150K per year",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop",
      pathImages: [
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop"
      ],
      roadmap: [
        { step: "Complete AI/ML certification", duration: "4 months" },
        { step: "Build MVP and get first users", duration: "8 months" },
        { step: "Raise seed funding", duration: "14 months" },
        { step: "Scale to 10K users", duration: "24 months" }
      ],
      affirmations: [
        "You solve problems that matter to millions",
        "Your technical vision shapes the future",
        "Innovation comes naturally when you stay curious"
      ]
    },
    {
      title: "Design Director",
      location: "Amsterdam",
      role: "Leading creative teams",
      schedule: "Hybrid work model",
      income: "$120K per year",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop",
      pathImages: [
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop"
      ],
      roadmap: [
        { step: "Lead 3 major design projects", duration: "5 months" },
        { step: "Build and mentor design team", duration: "10 months" },
        { step: "Establish design system practice", duration: "16 months" },
        { step: "Secure director-level position", duration: "22 months" }
      ],
      affirmations: [
        "Your designs create experiences people love",
        "Leadership amplifies your creative impact",
        "You inspire teams to do their best work"
      ]
    }
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Your Future Selves</h1>
          <p className="text-muted-foreground">7 possible versions of you in 2029</p>
        </div>

        <div className="space-y-4">
          {futureCards.map((card, index) => (
            <Card key={index} className="overflow-hidden border-border/50">
              <div className="relative h-48 bg-muted/20">
                <img 
                  src={card.image} 
                  alt={card.title}
                  className="w-full h-full object-cover opacity-20 grayscale"
                />
                <div className="absolute inset-0 flex items-end p-6">
                  <h3 className="text-xl font-semibold">{card.title}</h3>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{card.location}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{card.role}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{card.schedule}</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{card.income}</span>
                </div>

                <div className="space-y-2 pt-4 border-t border-border/50">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    size="sm"
                    onClick={() => navigate(`/path/${index}`, { state: { card } })}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    View Path
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-start" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="w-full" size="lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate New Versions
        </Button>
      </div>
    </div>
  );
};
