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
import { MsxBootProvider, MsxOpeningScreen, MsxLaunchErrorScreen, useMsxBoot } from "@/components/MsxBootProvider";
import Index from "./pages/Index";
import PathDetail from "./pages/PathDetail";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import FAQ from "./pages/FAQ";
import Blog from "./pages/Blog";
import About from "./pages/About";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const { hasMsxLaunchContext, isEmbeddedWithoutToken, status } = useMsxBoot();

  // Embedded in iframe without a token — show error, not login
  if (isEmbeddedWithoutToken) {
    return <MsxLaunchErrorScreen />;
  }

  if (loading || (hasMsxLaunchContext && status === "booting")) {
    return <MsxOpeningScreen />;
  }

  if (session) {
    return <>{children}</>;
  }

  if (hasMsxLaunchContext && status !== "failed") {
    return <MsxOpeningScreen />;
  }

  return <Navigate to="/auth" replace />;
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

  const excludedPaths = ["/", "/terms", "/privacy", "/cookies", "/faq", "/about", "/blog"];
  const isExcludedPath = excludedPaths.includes(location.pathname);

  if (!isMobile && !bypassMobileCheck && !isExcludedPath) {
    return <MobileOnly onContinueDesktop={handleBypassMobileCheck} />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { hasMsxLaunchContext, status } = useMsxBoot();

  if (hasMsxLaunchContext && status === "booting") {
    return <MsxOpeningScreen />;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <MobileCheckWrapper>
        <Routes>
          <Route path="/" element={hasMsxLaunchContext && status === "ready" ? <Navigate to="/app" replace /> : <About />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/payment-canceled" element={<ProtectedRoute><PaymentCanceled /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/path/:id" element={<ProtectedRoute><PathDetail /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MobileCheckWrapper>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MsxBootProvider>
          <ThemeProvider defaultTheme="dark" storageKey="copilot-ui-theme">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
          </ThemeProvider>
        </MsxBootProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

