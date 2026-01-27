import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, DollarSign, CreditCard, XCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { format, subDays, startOfDay } from "date-fns";
interface CheckoutEvent {
  id: string;
  user_id: string;
  event_type: string;
  price_id: string | null;
  session_id: string | null;
  created_at: string;
}

interface DailyStats {
  date: string;
  initiated: number;
  completed: number;
  abandoned: number;
  revenue: number;
}

const SUBSCRIPTION_PRICE = 29; // $29/year

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
};

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isRoleLoading } = useAdminRole();
  const [events, setEvents] = useState<CheckoutEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    if (!isRoleLoading && !isAdmin) {
      navigate("/app");
    }
  }, [isAdmin, isRoleLoading, navigate]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!isAdmin) return;

      const { data, error } = await supabase
        .from("checkout_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching checkout events:", error);
      } else {
        setEvents(data || []);
        calculateDailyStats(data || []);
      }
      setIsLoading(false);
    };

    if (isAdmin) {
      fetchEvents();
    }
  }, [isAdmin]);

  const calculateDailyStats = (data: CheckoutEvent[]) => {
    const last7Days: DailyStats[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateStr = format(date, "yyyy-MM-dd");
      const dayEvents = data.filter(e => 
        format(new Date(e.created_at), "yyyy-MM-dd") === dateStr
      );
      
      const completedCount = dayEvents.filter(e => e.event_type === "completed").length;
      
      last7Days.push({
        date: format(date, "MMM d"),
        initiated: dayEvents.filter(e => e.event_type === "initiated").length,
        completed: completedCount,
        abandoned: dayEvents.filter(e => e.event_type === "abandoned").length,
        revenue: completedCount * SUBSCRIPTION_PRICE,
      });
    }
    
    setDailyStats(last7Days);
  };

  const totalInitiated = events.filter(e => e.event_type === "initiated").length;
  const totalCompleted = events.filter(e => e.event_type === "completed").length;
  const totalAbandoned = events.filter(e => e.event_type === "abandoned").length;
  const totalRevenue = totalCompleted * SUBSCRIPTION_PRICE;
  const conversionRate = totalInitiated > 0 
    ? ((totalCompleted / totalInitiated) * 100).toFixed(1) 
    : "0";

  if (isRoleLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-light">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Checkout Analytics</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-light text-primary">${totalRevenue}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-3 w-3" />
                  Initiated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-light">{totalInitiated}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-light text-primary">{totalCompleted}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-3 w-3" />
                  Abandoned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-light text-destructive">{totalAbandoned}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Conversion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-light">{conversionRate}%</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-normal">Revenue (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => [`$${value}`, "Revenue"]} />} 
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-normal">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyStats.map((day, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground w-16">{day.date}</span>
                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Init:</span>
                        <span>{day.initiated}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-primary">✓</span>
                        <span className="text-primary">{day.completed}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-destructive">✗</span>
                        <span className="text-destructive">{day.abandoned}</span>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      {day.initiated > 0 
                        ? `${((day.completed / day.initiated) * 100).toFixed(0)}%` 
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-normal">Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.slice(0, 20).map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {event.event_type === "completed" && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                      {event.event_type === "abandoned" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {event.event_type === "initiated" && (
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="capitalize">{event.event_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No checkout events yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
