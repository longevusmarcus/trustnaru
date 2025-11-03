import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HomePage } from "@/components/HomePage";
import { SearchPage } from "@/components/SearchPage";
import { FutureYouPage } from "@/components/FutureYouPage";
import { ActionPage } from "@/components/ActionPage";
import { ProfilePage } from "@/components/ProfilePage";
import { InsightsPage } from "@/components/InsightsPage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WizardFlow } from "@/components/WizardFlow";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("home");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [careerPaths, setCareerPaths] = useState<any[]>([]);
  const location = useLocation();

  // Check if we need to navigate to action page after path activation
  useEffect(() => {
    if (location.state?.navigateTo) {
      setCurrentPage(location.state.navigateTo);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const getHeaderTitle = () => {
    switch (currentPage) {
      case "home": return "dashboard";
      case "mentors": return "mentors";
      case "insights": return "insights";
      case "future": return "your futures";
      case "action": return "action";
      case "profile": return "profile";
      default: return "path genius";
    }
  };

  const handleNavigation = (page: string) => {
    if (page === "add") {
      setShowWizard(true);
    } else {
      setCurrentPage(page);
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

  return (
    <div className="min-h-screen bg-background">
      <Header title={getHeaderTitle()} onNavigate={handleNavigation} />
      
      <main className="pb-safe">
        {currentPage === "home" && <HomePage onNavigate={handleNavigation} />}
        {currentPage === "mentors" && <SearchPage />}
        {currentPage === "insights" && <InsightsPage />}
        {currentPage === "future" && <FutureYouPage careerPaths={careerPaths} />}
        {currentPage === "action" && <ActionPage />}
        {currentPage === "profile" && <ProfilePage />}
      </main>

      <BottomNav active={currentPage} onNavigate={handleNavigation} />
    </div>
  );
};

export default Index;
