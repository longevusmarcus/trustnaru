import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Trophy, Target, Flame, Pencil, Calendar, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAutoBadgeCheck } from "@/hooks/useBadgeAwarding";
import { BadgeCelebration } from "@/components/BadgeCelebration";

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - worker URL import for pdfjs
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

export const ProfilePage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { checkAndAwardBadges, newlyAwardedBadge, clearCelebration } = useAutoBadgeCheck();
  const [userStats, setUserStats] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [joinDate, setJoinDate] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [actionsCompleted, setActionsCompleted] = useState(0);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const date = new Date(user.created_at);
        setJoinDate(date.toLocaleDateString("en-US", { month: "long", year: "numeric" }));

        // Load all data in parallel
        const [profileResult, statsResult, badgesResult, allBadgesResult, actionsResult] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("display_name, cv_url, voice_transcription")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("user_badges")
            .select("*, badges (name, icon, description)")
            .eq("user_id", user.id)
            .order("earned_at", { ascending: false }),
          supabase.from("badges").select("*").order("display_order", { ascending: true }),
          supabase.from("daily_actions").select("actions").eq("user_id", user.id),
        ]);

        if (profileResult.data) {
          setUserProfile(profileResult.data);
          if (profileResult.data.display_name) {
            setDisplayName(profileResult.data.display_name);
            setEditName(profileResult.data.display_name);
          } else {
            const defaultName = user.email?.split("@")[0] || "User";
            setDisplayName(defaultName);
            setEditName(defaultName);
          }
        } else {
          const defaultName = user.email?.split("@")[0] || "User";
          setDisplayName(defaultName);
          setEditName(defaultName);
        }

        if (statsResult.data) {
          setUserStats(statsResult.data);
        }

        if (badgesResult.data) {
          setBadges(badgesResult.data);
        }

        if (allBadgesResult.data) {
          setAllBadges(allBadgesResult.data);
        }

        // Count completed actions
        if (actionsResult.data) {
          let completedCount = 0;
          actionsResult.data.forEach((dayActions: any) => {
            if (dayActions.actions && Array.isArray(dayActions.actions)) {
              completedCount += dayActions.actions.filter((action: any) => action.completed).length;
            }
          });
          setActionsCompleted(completedCount);
        }
      }
    };

    loadProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;

    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        display_name: editName.trim(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      toast({
        title: "Error",
        description: "Could not update name",
        variant: "destructive",
      });
    } else {
      setDisplayName(editName.trim());
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Name updated",
      });
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error signing out", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Signed out", description: "You have been successfully signed out" });
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const buf = await file.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
      let text = "";
      const maxPages = Math.min(pdf.numPages, 30);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((it: any) => it.str).join(" ");
        text += strings + "\n";
      }
      return text.trim();
    } catch (e) {
      console.error("PDF parse failed:", e);
      return "";
    }
  };

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Upload a PDF or Word document", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 20MB", variant: "destructive" });
      return;
    }

    setUploadingCV(true);

    try {
      // Remove previous CV if present
      if (userProfile?.cv_url) {
        const parts = userProfile.cv_url.split("/");
        const oldName = parts[parts.length - 1];
        if (oldName) await supabase.storage.from("cvs").remove([`${user.id}/${oldName}`]);
      }

      const fileName = `cv-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(`${user.id}/${fileName}`, file, { cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("cvs").getPublicUrl(`${user.id}/${fileName}`);

      // Merge wizard_data with extracted cv_text (PDF only)
      let cv_text = "";
      let cv_structured = null;
      if (file.type === "application/pdf") {
        cv_text = await extractTextFromPdf(file);

        // Vision-based parsing for structured data with retry logic
        try {
          console.log("Starting CV vision parsing...");
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const pdfBase64 = `data:application/pdf;base64,${base64}`;

          // Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
          const maxRetries = 3;
          let lastError = null;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`Calling parse-cv edge function (attempt ${attempt}/${maxRetries})...`);
              const { data: structuredData, error: parseError } = await supabase.functions.invoke("parse-cv", {
                body: { pdfBase64 },
              });

              if (parseError) {
                lastError = parseError;
                console.error(`Parse-cv error on attempt ${attempt}:`, parseError);
                
                // Don't retry on client errors (4xx)
                if (parseError.message?.includes('400') || parseError.message?.includes('Invalid')) {
                  break;
                }
                
                // Retry on server errors or network issues
                if (attempt < maxRetries) {
                  const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                  console.log(`Retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
              } else if (structuredData?.error) {
                lastError = structuredData.error;
                console.error(`Parse-cv returned error on attempt ${attempt}:`, structuredData.error);
                break; // Don't retry on application-level errors
              } else if (structuredData) {
                cv_structured = structuredData;
                console.log("CV structured data extracted successfully:", cv_structured);
                break; // Success - exit retry loop
              } else {
                console.warn(`Parse-cv returned empty data on attempt ${attempt}`);
                if (attempt < maxRetries) {
                  const delay = Math.pow(2, attempt - 1) * 1000;
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
              }
              break;
            } catch (invokeError) {
              lastError = invokeError;
              console.error(`Exception during parse-cv attempt ${attempt}:`, invokeError);
              if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          if (!cv_structured && lastError) {
            console.error("All parse-cv retry attempts failed:", lastError);
          }
        } catch (err) {
          console.error("Vision parsing exception:", err);
        }
      }
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("wizard_data")
        .eq("user_id", user.id)
        .maybeSingle();
      const mergedWizard = {
        ...((existing?.wizard_data as Record<string, any>) || {}),
        ...(cv_text ? { cv_text } : {}),
        ...(cv_structured ? { cv_structured } : {}),
      };

      const { error: updateError } = await supabase
        .from("user_profiles")
        .upsert({ user_id: user.id, cv_url: publicUrl, wizard_data: mergedWizard }, { onConflict: "user_id" });
      if (updateError) throw updateError;

      setUserProfile({ ...userProfile, cv_url: publicUrl });
      const desc = cv_structured
        ? "Structured data extracted for personalized tips"
        : cv_text
          ? "Text extracted for smarter tips"
          : "Uploaded successfully";
      toast({ title: "CV updated", description: desc });
    } catch (error) {
      console.error("Error uploading CV:", error);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUploadingCV(false);
      if (cvInputRef.current) cvInputRef.current.value = "";
    }
  };

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-semibold">{displayName}</h2>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Name</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveName}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Started {joinDate}</span>
          </div>
        </div>

        {/* Progress Stats */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="h-4 w-4 text-foreground/60" />
                <span className="text-sm">Day Streak</span>
              </div>
              <span className="font-semibold">{userStats?.current_streak || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-foreground/60" />
                <span className="text-sm">Actions Completed</span>
              </div>
              <span className="font-semibold">{actionsCompleted}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-4 w-4 text-foreground/60" />
                <span className="text-sm">Badges Earned</span>
              </div>
              <span className="font-semibold">{badges.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* CV Summary */}
        {userProfile?.cv_url && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Professional Background
                </h3>
                <input
                  ref={cvInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cvInputRef.current?.click()}
                  disabled={uploadingCV}
                  className="h-8 text-xs"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploadingCV ? "Uploading..." : "Re-upload"}
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                  <span>CV uploaded and analyzed</span>
                </div>
                <p className="text-muted-foreground text-xs pl-3.5">
                  Your professional experience and skills have been captured
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Energy Summary */}
        {userProfile?.voice_transcription && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                Energy & Passions
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                  <span>Voice transcript uploaded and analyzed</span>
                </div>
                <p className="text-muted-foreground text-xs pl-3.5">
                  Your motivations and interests have been understood
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Summary */}
        {userProfile?.voice_transcription && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                Voice Transcription
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                "{userProfile.voice_transcription.substring(0, 200)}
                {userProfile.voice_transcription.length > 200 ? "..." : ""}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Badge Collection */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Badges</h3>
              <Badge variant="outline" className="text-xs font-normal">
                {badges.length}/{allBadges.length}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {allBadges.map((badge: any) => {
                const isEarned = badges.some((userBadge: any) => userBadge.badges?.name === badge.name);
                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center gap-2.5 p-3 rounded-lg border transition-all ${
                      isEarned
                        ? "border-border bg-card hover:bg-accent"
                        : "border-border/50 bg-card/50 opacity-40 grayscale"
                    }`}
                  >
                    <div className="text-3xl">{badge.icon}</div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-medium">{badge.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <div className="space-y-2 pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            size="lg"
            onClick={() => (window.location.href = "/settings")}
          >
            <Settings className="h-4 w-4 mr-3" />
            Account Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            size="lg"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>

      <BadgeCelebration badge={newlyAwardedBadge} onComplete={clearCelebration} />
    </div>
  );
};
