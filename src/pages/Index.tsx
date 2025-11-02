import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HomePage } from "@/components/HomePage";
import { SearchPage } from "@/components/SearchPage";
import { TimelinePage } from "@/components/TimelinePage";
import { FutureYouPage } from "@/components/FutureYouPage";
import { ProfilePage } from "@/components/ProfilePage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WizardFlow } from "@/components/WizardFlow";
import { AuthProvider } from "@/components/AuthProvider";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("home");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [careerPaths, setCareerPaths] = useState<any[]>([]);

  const getHeaderTitle = () => {
    switch (currentPage) {
      case "home": return "today";
      case "mentors": return "mentors";
      case "future": return "your futures";
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
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Header title={getHeaderTitle()} />
        
        <main className="pb-safe">
          {currentPage === "home" && <HomePage />}
          {currentPage === "mentors" && <SearchPage />}
          {currentPage === "future" && <FutureYouPage careerPaths={careerPaths} />}
          {currentPage === "profile" && <ProfilePage />}
        </main>

        <BottomNav active={currentPage} onNavigate={handleNavigation} />
      </div>
    </AuthProvider>
  );
};

export default Index;
