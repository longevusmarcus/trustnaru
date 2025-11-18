import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "404 - Page Not Found | Naru";
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <article className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-light text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <p className="text-sm text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <nav className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
          <Button asChild variant="default">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <span className="cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </span>
          </Button>
        </nav>
      </article>
    </main>
  );
};

export default NotFound;
