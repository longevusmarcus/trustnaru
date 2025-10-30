import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HomePage } from "@/components/HomePage";
import { SearchPage } from "@/components/SearchPage";
import { TimelinePage } from "@/components/TimelinePage";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("home");

  const getHeaderTitle = () => {
    switch (currentPage) {
      case "home": return "today";
      case "search": return "explore";
      case "timeline": return "timeline";
      case "stats": return "progress";
      default: return "path genius";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title={getHeaderTitle()} />
      
      <main className="pb-safe">
        {currentPage === "home" && <HomePage />}
        {currentPage === "search" && <SearchPage />}
        {currentPage === "timeline" && <TimelinePage />}
        {currentPage === "stats" && (
          <div className="px-4 pb-24 pt-4">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">Progress</h2>
              <p className="text-muted-foreground">Your journey statistics coming soon...</p>
            </div>
          </div>
        )}
      </main>

      <BottomNav active={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
};

export default Index;
