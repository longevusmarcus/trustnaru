import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MobileOnly } from "@/components/MobileOnly";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import PathDetail from "./pages/PathDetail";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import PaymentSuccess from "./pages/PaymentSuccess";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/auth" replace />;
};

const MobileCheckWrapper = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const [bypassMobileCheck, setBypassMobileCheck] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const bypass = localStorage.getItem("bypass-mobile-check") === "true";
    setBypassMobileCheck(bypass);
  }, []);

  const handleBypassMobileCheck = () => {
    localStorage.setItem("bypass-mobile-check", "true");
    setBypassMobileCheck(true);
  };

  // Pages that should NOT show the desktop blocker
  const excludedPaths = ["/", "/terms", "/privacy", "/cookies", "/faq", "/about"];
  const isExcludedPath = excludedPaths.includes(location.pathname);

  if (!isMobile && !bypassMobileCheck && !isExcludedPath) {
    return <MobileOnly onContinueDesktop={handleBypassMobileCheck} />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="copilot-ui-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <MobileCheckWrapper>
                <Routes>
                  <Route path="/" element={<About />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/about" element={<Navigate to="/" replace />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
                  <Route path="/path/:id" element={<ProtectedRoute><PathDetail /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MobileCheckWrapper>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
