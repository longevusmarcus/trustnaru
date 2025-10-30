import { Share2, RefreshCw, Download, MapPin, Briefcase, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const FutureYouPage = () => {
  const futureCards = [
    {
      title: "Creative Strategist",
      location: "Milan & Lisbon",
      role: "Leading wellness ventures",
      schedule: "Works 4 days/week with deep purpose",
      income: "$100K per year",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop"
    },
    {
      title: "Tech Entrepreneur",
      location: "San Francisco",
      role: "Building AI-powered platforms",
      schedule: "Flexible remote work",
      income: "$150K per year",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop"
    },
    {
      title: "Design Director",
      location: "Amsterdam",
      role: "Leading creative teams",
      schedule: "Hybrid work model",
      income: "$120K per year",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop"
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
            <Card key={index} className="overflow-hidden">
              <div className="relative h-64 bg-gradient-to-br from-muted to-muted/50">
                <img 
                  src={card.image} 
                  alt={card.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                </div>
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{card.location}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{card.role}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{card.schedule}</span>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{card.income}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    View Path
                  </Button>
                  <Button variant="default" className="flex-1" size="sm">
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
