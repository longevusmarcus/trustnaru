import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

export const CloneButton = ({ mentorId }: { mentorId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInWaitlist, setIsInWaitlist] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkWaitlistStatus();
    }
  }, [user, mentorId]);

  const checkWaitlistStatus = async () => {
    if (!user) return;

    try {
      // Check if user is already in waitlist
      const { data: userEntry } = await supabase
        .from("clone_waiting_list")
        .select("id")
        .eq("user_id", user.id)
        .eq("mentor_id", mentorId)
        .maybeSingle();

      setIsInWaitlist(!!userEntry);

      // Get total count for this mentor
      const { count } = await supabase
        .from("clone_waiting_list")
        .select("*", { count: "exact", head: true })
        .eq("mentor_id", mentorId);

      setWaitlistCount(count || 0);
    } catch (error) {
      console.error("Error checking waitlist:", error);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join the waiting list",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("clone_waiting_list").insert({
        user_id: user.id,
        mentor_id: mentorId,
      });

      if (error) throw error;

      setIsInWaitlist(true);
      setWaitlistCount((prev) => prev + 1);

      toast({
        title: "You're on the list! 🎉",
        description: `${waitlistCount + 1} people waiting for this clone`,
      });
    } catch (error: any) {
      console.error("Error joining waitlist:", error);
      toast({
        title: "Unable to join",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isInWaitlist) {
    return (
      <div className="w-full space-y-2">
        <Button variant="outline" size="sm" className="w-full" disabled>
          <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
          On Waiting List
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">
          {waitlistCount} {waitlistCount === 1 ? "person" : "people"} waiting
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full hover:bg-primary hover:text-primary-foreground transition-colors"
        onClick={handleJoinWaitlist}
        disabled={loading}
      >
        {loading ? "Joining..." : "Clone Journey"}
      </Button>
      {waitlistCount > 0 && (
        <p className="text-[10px] text-center text-muted-foreground">
          {waitlistCount} {waitlistCount === 1 ? "person" : "people"} waiting
        </p>
      )}
    </div>
  );
};
