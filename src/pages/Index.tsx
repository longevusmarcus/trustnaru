import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HomePage } from "@/components/HomePage";
import { SearchPage } from "@/components/SearchPage";
import { TimelinePage } from "@/components/TimelinePage";
import { FutureYouPage } from "@/components/FutureYouPage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WizardFlow } from "@/components/WizardFlow";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("home");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const getHeaderTitle = () => {
    if (showTimeline) return "timeline";
    switch (currentPage) {
      case "home": return "today";
      case "search": return "explore";
      case "future": return "your futures";
      case "stats": return "progress";
      default: return "path genius";
    }
  };

  const handleNavigation = (page: string) => {
    if (page === "add") {
      setShowWizard(true);
    } else {
      setCurrentPage(page);
      setShowTimeline(false);
    }
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    setCurrentPage("future");
  };

  if (showWelcome) {
    return <WelcomeScreen onStart={() => setShowWelcome(false)} />;
  }

  if (showWizard) {
    return (
      <WizardFlow 
        onComplete={handleWizardComplete}
        onClose={() => setShowWizard(false)}
      />
    );
  }

  if (showTimeline) {
    return (
      <div className="min-h-screen bg-background">
        <Header title={getHeaderTitle()} onTimelineClick={() => setShowTimeline(false)} />
        <main className="pb-safe">
          <TimelinePage />
        </main>
        <BottomNav active={currentPage} onNavigate={handleNavigation} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title={getHeaderTitle()} onTimelineClick={() => setShowTimeline(true)} />
      
      <main className="pb-safe">
        {currentPage === "home" && <HomePage />}
        {currentPage === "search" && <SearchPage />}
        {currentPage === "future" && <FutureYouPage />}
        {currentPage === "stats" && (
          <div className="px-4 pb-24 pt-4">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">Progress</h2>
              <p className="text-muted-foreground">Your journey statistics coming soon...</p>
            </div>
          </div>
        )}
      </main>

      <BottomNav active={currentPage} onNavigate={handleNavigation} />
    </div>
  );
};

export default Index;
