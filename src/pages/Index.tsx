import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HomePage } from "@/components/HomePage";
import { SearchPage } from "@/components/SearchPage";
import { TimelinePage } from "@/components/TimelinePage";
import { FutureYouPage } from "@/components/FutureYouPage";
import { ActionPage } from "@/components/ActionPage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WizardFlow } from "@/components/WizardFlow";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("home");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [careerPaths, setCareerPaths] = useState<any[]>([]);

  const getHeaderTitle = () => {
    if (showTimeline) return "timeline";
    switch (currentPage) {
      case "home": return "today";
      case "search": return "explore";
      case "future": return "your futures";
      case "action": return "action";
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

  const handleWizardComplete = (paths: any[]) => {
    setShowWizard(false);
    setCareerPaths(paths);
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
        {currentPage === "future" && <FutureYouPage careerPaths={careerPaths} />}
        {currentPage === "action" && <ActionPage />}
      </main>

      <BottomNav active={currentPage} onNavigate={handleNavigation} />
    </div>
  );
};

export default Index;
