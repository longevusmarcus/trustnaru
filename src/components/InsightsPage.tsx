import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, Target, Award, Lightbulb, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export const InsightsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activePath, setActivePath] = useState<any>(null);
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasInitialMessage, setHasInitialMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isGenerating]);

  // Always reload when component mounts or user changes
  useEffect(() => {
    loadInsights();
  }, [user]);

  // Also reload when page becomes visible (browser tab focus)
  useEffect(() => {
    const handleFocus = () => {
      loadInsights();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const loadInsights = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user profile with active path and name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('active_path_id, display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const userName = profile?.display_name || user.email?.split('@')[0] || 'there';

      if (profile?.active_path_id) {
        const { data: path } = await supabase
          .from('career_paths')
          .select('*')
          .eq('id', profile.active_path_id)
          .single();

        setActivePath(path);
        
        // Set initial personalized welcome message
        if (!hasInitialMessage) {
          setChatMessages([{
            role: 'assistant',
            content: `Hey ${userName}! 👋 I can help you with insights about ${path?.title || 'your career path'}, analyze market trends, or dive into your CV and journey. What would you like to explore?`
          }]);
          setHasInitialMessage(true);
        }
      } else if (!hasInitialMessage) {
        setChatMessages([{
          role: 'assistant',
          content: `Hey ${userName}! 👋 Activate a career path to get personalized insights and market analysis tailored to your journey.`
        }]);
        setHasInitialMessage(true);
      }

      // Get all career paths
      const { data: paths } = await supabase
        .from('career_paths')
        .select('*')
        .eq('user_id', user.id);

      setAllPaths(paths || []);

      // Get user stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend || isGenerating) return;

    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to use Daily Insights",
        variant: "destructive"
      });
      return;
    }

    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { message: messageToSend }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (!data?.insight) {
        throw new Error('No insight received');
      }

      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.insight 
      }]);
    } catch (error) {
      console.error('Error generating insight:', error);
      setChatMessages(prev => prev.slice(0, -1)); // Remove user message on error
      toast({
        title: "Unable to generate insight",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate insights
  const pathCategories = [...new Set(allPaths.map(p => p.category).filter(Boolean))];
  const progressPercentage = activePath ? Math.min(33, (userStats?.missions_completed || 0) * 10) : 0;
  
  const personalizedTips = activePath ? [
    `Focus on ${activePath.key_skills?.[0] || 'key skills'} this week to accelerate your progress`,
    `Research ${activePath.target_companies?.[0] || 'companies'} to understand their culture`,
    `Connect with professionals in ${activePath.category} on LinkedIn`,
  ] : [
    "Activate a career path to get personalized guidance",
    "Complete the wizard to discover paths tailored to you",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6 pb-8">
        {/* Progress Overview */}
        {activePath && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Active Path Progress</h3>
                    <p className="text-sm text-muted-foreground">{activePath.title}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Journey Progress</span>
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold mb-3">Your Journey</h3>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">{userStats?.current_streak || 0}</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">{allPaths.length}</div>
                <div className="text-xs text-muted-foreground">Paths Explored</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Path Diversity */}
        {pathCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="h-5 w-5 text-primary/70" />
                  <h4 className="font-medium">Career Diversity</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  You're exploring {pathCategories.length} different career direction{pathCategories.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pathCategories.map((category, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Personalized Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-3">Smart Tips</h3>
          <div className="space-y-3">
            {personalizedTips.map((tip, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-primary/70 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{tip}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* AI Insights Chat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-3">Daily Insights</h3>
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-0">
              {/* Chat Messages */}
              <div className="px-4 py-4 space-y-3 max-h-80 overflow-y-auto">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="relative w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {/* Mini emerald bubble matching signup page */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 blur-sm" />
                        <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25 backdrop-blur-sm border border-emerald-400/20">
                          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30">
                            <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white/30 blur-[1px]" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div 
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-muted/70 text-foreground'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex gap-2 justify-start">
                    <div className="relative w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {/* Pulsing mini emerald bubble */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 blur-sm animate-pulse" />
                      <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25 backdrop-blur-sm border border-emerald-400/20 animate-pulse">
                        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30">
                          <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white/30 blur-[1px]" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-0.5 h-0.5 rounded-full bg-white animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/70 rounded-2xl px-3.5 py-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions */}
              {chatMessages.length <= 1 && !isGenerating && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setInputMessage("What skills should I focus on this week?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Key skills
                  </button>
                  <button
                    onClick={() => {
                      setInputMessage("What are the market trends in my field?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Market trends
                  </button>
                  <button
                    onClick={() => {
                      setInputMessage("How can I accelerate my progress?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Progress tips
                  </button>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t border-border/50 px-3 py-2.5">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about your journey, skills, market..."
                    className="flex-1 h-9 text-[13px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 placeholder:text-muted-foreground/60"
                    disabled={isGenerating}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isGenerating}
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
