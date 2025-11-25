import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HomePage } from "@/components/HomePage";
import { SearchPage } from "@/components/SearchPage";
import { MentorsPage } from "@/components/MentorsPage";
import { CommunityPage } from "@/components/CommunityPage";
import { FutureYouPage } from "@/components/FutureYouPage";
import { ActionPage } from "@/components/ActionPage";
import { ProfilePage } from "@/components/ProfilePage";
import { InsightsPage } from "@/components/InsightsPage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WizardFlow } from "@/components/WizardFlow";
import { IntroOnboarding } from "@/components/IntroOnboarding";
import { CodeEntry } from "@/components/CodeEntry";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("home");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [careerPaths, setCareerPaths] = useState<any[]>([]);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [pageRenderKey, setPageRenderKey] = useState(0);
  const location = useLocation();
  const isNavVisible = useScrollDirection();
  const [isCardScrolling, setIsCardScrolling] = useState(false);
  const { user } = useAuth();

  const shouldHideNavOnScroll = currentPage === "mentors";
  const shouldShowNav = shouldHideNavOnScroll ? isNavVisible && !isCardScrolling : true;

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsCheckingOnboarding(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (profile && !profile.onboarding_completed) {
        setShowIntro(true);
      }

      setIsCheckingOnboarding(false);
    };

    checkOnboardingStatus();
  }, [user]);

  // Check if we need to navigate to copilot page after path activation or show wizard
  useEffect(() => {
    if (location.state?.navigateTo) {
      const targetPage = location.state.navigateTo;
      setCurrentPage(targetPage);
      // Increment key to force fresh data load
      if (targetPage === "insights" || targetPage === "copilot") {
        setPageRenderKey((prev) => prev + 1);
      }
      // Clear the state
      window.history.replaceState({}, document.title);
    }

    if (location.state?.showWizard) {
      setShowWizard(true);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Scroll to top when page changes
  useEffect(() => {
    // Let FutureYouPage handle its own scroll restoration
    if (currentPage !== "future") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  const getHeaderTitle = () => {
    switch (currentPage) {
      case "home":
        return "today";
      case "mentors":
        return "journeys";
      case "community":
        return "community";
      case "insights":
        return "insights";
      case "future":
        return "your futures";
      case "copilot":
        return "copilot";
      case "profile":
        return "profile";
      default:
        return "path genius";
    }
  };

  const handleNavigation = (page: string) => {
    if (page === "add") {
      setShowWizard(true);
      // Track wizard as explored
      if (user?.id) {
        const storageKey = `explored_sections_${user.id}`;
        const explored = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (!explored.includes("add")) {
          const updated = [...explored, "add"];
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      }
    } else {
      setCurrentPage(page);
      // Increment key to force remount of insights/copilot pages
      if (page === "insights" || page === "copilot") {
        setPageRenderKey((prev) => prev + 1);
      }

      // Track explored sections
      if (user?.id) {
        const storageKey = `explored_sections_${user.id}`;
        const explored = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (!explored.includes(page)) {
          const updated = [...explored, page];
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      }
    }
  };

  const handleWizardComplete = async (paths: any[]) => {
    setShowWizard(false);
    // Don't set careerPaths - let FutureYouPage load all paths from database
    // This ensures both old and new paths are shown together

    // Check if user has already completed onboarding
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      // If already onboarded, go directly to futures page
      if (profile?.onboarding_completed) {
        setCurrentPage("future");
      } else {
        // Otherwise, show intro onboarding
        setShowIntro(true);
      }
    } else {
      setShowIntro(true);
    }
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    setShowCodeEntry(true);
  };

  const handleCodeSuccess = async () => {
    setShowCodeEntry(false);
    setCurrentPage("home");

    // Mark onboarding as completed
    if (user) {
      await supabase.from("user_profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    }
  };

  if (isCheckingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showWelcome) {
    return <WelcomeScreen onStart={() => setShowWelcome(false)} />;
  }

  if (showWizard) {
    return <WizardFlow onComplete={handleWizardComplete} onClose={() => setShowWizard(false)} />;
  }

  if (showIntro) {
    return <IntroOnboarding onComplete={handleIntroComplete} />;
  }

  if (showCodeEntry) {
    return <CodeEntry onSuccess={handleCodeSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title={getHeaderTitle()} onNavigate={handleNavigation} />

      <main className="pb-safe">
        {currentPage === "home" && <HomePage onNavigate={handleNavigation} />}
        {currentPage === "mentors" && <MentorsPage onScrollChange={setIsCardScrolling} />}
        {currentPage === "community" && <CommunityPage />}
        {currentPage === "insights" && <InsightsPage key={pageRenderKey} />}
        {currentPage === "future" && <FutureYouPage careerPaths={careerPaths} />}
        {currentPage === "copilot" && <ActionPage key={pageRenderKey} />}
        {currentPage === "profile" && <ProfilePage />}
      </main>

      <BottomNav active={currentPage} onNavigate={handleNavigation} isVisible={shouldShowNav} />
    </div>
  );
};

export default Index;
