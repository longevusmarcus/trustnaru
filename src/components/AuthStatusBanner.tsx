import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wifi } from "lucide-react";

interface AuthStatusBannerProps {
  isOffline: boolean;
}

export const AuthStatusBanner = ({ isOffline }: AuthStatusBannerProps) => {
  if (!isOffline) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-2">
        <Wifi className="h-4 w-4" />
        Authentication service temporarily unavailable. Retrying automatically...
      </AlertDescription>
    </Alert>
  );
};
