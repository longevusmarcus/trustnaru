import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Brain, Flame, BarChart3, Rocket, Lightbulb, CircleCheck, Award, Eye, Target, LineChart, Users, Check, User, Compass, ClipboardList, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { useRef } from "react";

// Component for animated text that highlights on scroll
const AnimatedParagraph = ({ children, className }: { children: string; className?: string }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.3"]
  });

  const words = children.split(" ");

  return (
    <p ref={ref} className={className}>
      {words.map((word, index) => {
        const start = index / words.length;
        const end = start + 1 / words.length;
        return (
          <Word key={index} range={[start, end]} progress={scrollYProgress}>
            {word}
          </Word>
        );
      })}
    </p>
  );
};

const Word = ({ children, range, progress }: { children: string; range: [number, number]; progress: any }) => {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const color = useTransform(progress, range, ["hsl(0 0% 50%)", "hsl(0 0% 98%)"]);

  return (
    <motion.span style={{ opacity, color }} className="inline-block mr-[0.25em]">
      {children}
    </motion.span>
  );
};

const About = () => {
  const features = [
    {
      icon: Eye,
      title: "Futures",
      subtitle: "Visualize possible selves",
      description: "See AI-generated visualizations of your future career paths with detailed roadmaps and lifestyle previews.",
      gradient: "from-violet-500/20 to-purple-500/20"
    },
    {
      icon: Target,
      title: "Copilot",
      subtitle: "Turn it into action plan",
      description: "Get personalized daily actions, goals, and step-by-step guidance to become your future self.",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: LineChart,
      title: "Insights",
      subtitle: "Track evolution",
      description: "Monitor your journey progress, stats, and career direction with powerful analytics.",
      gradient: "from-emerald-500/20 to-teal-500/20"
    },
    {
      icon: Users,
      title: "Community",
      subtitle: "Emulate high-achievers",
      description: "Connect with mentors on your path and receive exclusive guidance from those who've succeeded.",
      gradient: "from-rose-500/20 to-orange-500/20"
    }
  ];

  const journeySteps = [
    { title: "Digital Twin", description: "Tell Naru where you are + where you're headed (resume & your verbal pitch)" },
    { title: "Explore", description: "Consider possible futures & career paths tailored to you" },
    { title: "Select", description: "See tradeoffs & pick the best-fit path (role, lifestyle, risk, timeline)" },
    { title: "Plan", description: "Get a step-by-step action plan to become future self" },
    { title: "Execute", description: "Track progress and stay accountable with tangible milestones" }
  ];

  const comparisonFeatures = [
    { feature: "Future-self identity model", naru: "check", linkedin: "none", betterup: "none" },
    { feature: "Evidence-backed paths", naru: "check", linkedin: "none", betterup: "none" },
    { feature: "Daily action copilot", naru: "check", linkedin: "none", betterup: "partial" },
    { feature: "Progress tracking & adaptation", naru: "check", linkedin: "partial", betterup: "partial" },
    { feature: "Coach / human layer", naru: "Optional", linkedin: "none", betterup: "Core" }
  ];

  const floatingCards = [
    { 
      title: "Path Activated", 
      text: "You've started your journey to become a Product Lead at a top tech company.", 
      delay: 0,
      position: "left-4 lg:left-12 top-36",
      icon: Rocket,
      time: "2m ago",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/20"
    },
    { 
      title: "New Insight", 
      text: "Your skills in design thinking align perfectly with product strategy roles.", 
      delay: 0.2,
      position: "right-4 lg:right-12 top-52",
      icon: Lightbulb,
      time: "15m ago",
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/20"
    },
    { 
      title: "Daily Action", 
      text: "Connect with 2 product leaders on LinkedIn who inspire your vision.", 
      delay: 0.4,
      position: "left-8 lg:left-20 bottom-36",
      icon: CircleCheck,
      time: "1h ago",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/20"
    },
    { 
      title: "Goal Achieved", 
      text: "Congratulations! You've unlocked Level 2 of your career path.", 
      delay: 0.6,
      position: "right-8 lg:right-20 bottom-52",
      icon: Award,
      time: "3h ago",
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/20"
    }
  ];

  return (
    <>
      <Helmet>
        <title>About Naru - The Career Dreamer & Copilot</title>
        <meta name="description" content="Discover how Naru helps you visualize your future self, unlock personalized guidance, and track your evolution every step of the way." />
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* Navigation - Glass effect rounded */}
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
          <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-full px-6 py-3 flex items-center justify-between shadow-lg shadow-background/20">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-semibold text-foreground">
                Naru
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#manifesto" className="hover:text-foreground transition-colors">Manifesto</a>
                <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                <a href="#journey" className="hover:text-foreground transition-colors">How it works</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Login
              </Link>
              <Button asChild size="sm" className="rounded-full bg-primary hover:bg-primary/90">
                <Link to="/auth">
                  Join Beta <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-secondary/40 via-transparent to-transparent" />
          
          {/* Floating Cards */}
          {floatingCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: card.delay + 0.6, duration: 0.7, ease: "easeOut" }}
              className={`absolute hidden lg:block ${card.position} max-w-[300px]`}
            >
              <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl p-4 shadow-xl shadow-background/30 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{card.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{card.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.text}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Hero Content */}
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2.5 mb-10"
            >
              <Sparkles className="h-4 w-4 text-foreground" />
              <span className="text-sm text-muted-foreground">Proudly in Private Beta</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl md:text-6xl lg:text-7xl text-foreground mb-8 leading-tight"
            >
              <span className="font-light">Because Your Future</span>
              <br />
              <span className="font-cormorant italic font-light text-5xl md:text-7xl lg:text-8xl">Deserves a Clear Path</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
            >
              Redefining career development with AI-powered visualization, personalized guidance, and actionable insights.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Button asChild size="lg" className="rounded-full text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                <Link to="/auth">
                  Join Private Beta <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Manifesto Section with scroll-based text highlight */}
        <section id="manifesto" className="py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="inline-block bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2.5 text-sm text-muted-foreground">
                #00. | Manifesto
              </span>
            </motion.div>

            <div className="space-y-12">
              <AnimatedParagraph className="text-2xl md:text-3xl lg:text-4xl font-cormorant font-light leading-relaxed">
                For too long, people have navigated their careers alone—uncertain, overwhelmed, and disconnected from their true potential. Naru changes that.
              </AnimatedParagraph>
              
              <AnimatedParagraph className="text-2xl md:text-3xl lg:text-4xl font-cormorant font-light leading-relaxed">
                With AI-powered visualizations, personalized guidance, and actionable daily steps, we help you see your future self clearly, align with purpose, and turn dreams into reality.
              </AnimatedParagraph>
              
              <AnimatedParagraph className="text-2xl md:text-3xl lg:text-4xl font-cormorant font-light leading-relaxed">
                Naru isn't just a tool—it's the key to becoming who you're meant to be.
              </AnimatedParagraph>
            </div>
          </div>
        </section>

        {/* Features Section - 4 main features */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-secondary/30 backdrop-blur-sm border border-border/30 rounded-[2.5rem] p-8 md:p-12 lg:p-16"
            >
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl text-foreground mb-6">
                  <span className="font-cormorant italic font-light text-4xl md:text-6xl">Tools for your</span>
                  <span className="font-light"> evolution.</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Naru adapts to your journey, delivering AI-driven insights that boost clarity, confidence, and progress.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    className="group relative"
                  >
                    <div className="relative bg-card/80 border border-border/40 rounded-2xl p-6 h-full overflow-hidden hover:border-border/80 transition-all duration-500 hover:shadow-xl hover:shadow-background/30">
                      {/* Gradient overlay on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                      
                      <div className="relative z-10">
                        {/* Icon */}
                        <div className="relative w-12 h-12 mb-5">
                          <div className="absolute inset-0 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors duration-300" />
                          <div className="absolute inset-[2px] rounded-[10px] bg-card group-hover:bg-card/90 transition-colors duration-300 flex items-center justify-center">
                            <feature.icon className="h-5 w-5 text-foreground group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-medium text-foreground mb-1">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground mb-3 font-cormorant italic">{feature.subtitle}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Journey Flow Section */}
        <section id="journey" className="py-24 px-6 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-[2.5rem] p-8 md:p-12 lg:p-16"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl text-foreground mb-6">
                  <span className="font-light">Naru unlocks </span>
                  <span className="font-cormorant italic font-light text-4xl md:text-6xl">YOUR</span>
                  <span className="font-light"> purpose</span>
                </h2>
              </div>

              {/* Journey Steps - Arrow flow */}
              <div className="flex flex-col lg:flex-row items-stretch gap-0 mb-16">
                {journeySteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="flex-1 relative"
                  >
                    {/* Arrow shape container */}
                    <div className="relative bg-muted/60 hover:bg-muted/80 transition-colors duration-300 h-full min-h-[160px] lg:min-h-[130px] flex flex-col justify-start p-5 lg:pr-8"
                      style={{
                        clipPath: index === journeySteps.length - 1 
                          ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8% 50%)'
                          : 'polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%, 8% 50%)',
                        marginLeft: index === 0 ? '0' : '-12px'
                      }}
                    >
                      <h4 className="text-sm font-medium text-foreground mb-2 pl-2">{step.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-2">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* What makes Naru different - Comparison Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <h3 className="text-2xl md:text-4xl font-light text-foreground text-center">
                Naru is <span className="font-cormorant italic">identity & outcome</span> first
              </h3>
              
              <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-4 border-b border-border/50 bg-card/50">
                  <div className="p-4 md:p-6" />
                  <div className="p-4 md:p-6 text-center">
                    <span className="text-sm md:text-base font-medium text-foreground">Naru</span>
                  </div>
                  <div className="p-4 md:p-6 text-center">
                    <span className="text-sm md:text-base font-medium text-muted-foreground">LinkedIn</span>
                  </div>
                  <div className="p-4 md:p-6 text-center">
                    <span className="text-sm md:text-base font-medium text-muted-foreground">BetterUp</span>
                  </div>
                </div>
                
                {/* Table Rows */}
                {comparisonFeatures.map((row, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    className={`grid grid-cols-4 ${index !== comparisonFeatures.length - 1 ? 'border-b border-border/30' : ''}`}
                  >
                    <div className="p-4 md:p-6 flex items-center">
                      <span className="text-sm md:text-base text-foreground">{row.feature}</span>
                    </div>
                    <div className="p-4 md:p-6 flex items-center justify-center">
                      {row.naru === "check" ? (
                        <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                      ) : (
                        <span className="text-sm text-muted-foreground">{row.naru}</span>
                      )}
                    </div>
                    <div className="p-4 md:p-6 flex items-center justify-center">
                      {row.linkedin === "check" ? (
                        <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                      ) : row.linkedin === "partial" ? (
                        <span className="text-muted-foreground">△</span>
                      ) : (
                        <span className="text-muted-foreground/50">–</span>
                      )}
                    </div>
                    <div className="p-4 md:p-6 flex items-center justify-center">
                      {row.betterup === "check" ? (
                        <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                      ) : row.betterup === "partial" ? (
                        <span className="text-muted-foreground">△</span>
                      ) : row.betterup === "none" ? (
                        <span className="text-muted-foreground/50">–</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{row.betterup}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                  <span>built-in</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>△</span>
                  <span>partial</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>–</span>
                  <span>not offered</span>
                </div>
              </div>
              
              {/* What makes Naru different - Bullet points */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mt-16 bg-card/20 backdrop-blur-sm border border-border/30 rounded-3xl p-8 md:p-10"
              >
                <h4 className="text-lg md:text-xl font-medium text-foreground text-center mb-8">
                  What makes Naru different
                </h4>
                <div className="space-y-4 max-w-2xl mx-auto">
                  {[
                    "Mobile-first, voice-native experience powered by Generative and Predictive AI",
                    "Tailored to YOU (including unique data like your background, lifestyle preferences, career ambitions)",
                    "Measurable milestones & actions that adapt to real progress (not generic templates)",
                    "Model learns from users, improving guidance and outcomes over time"
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + index * 0.08, duration: 0.4 }}
                      className="flex items-start gap-4"
                    >
                      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
                      </div>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-secondary/30 backdrop-blur-sm border border-border/30 rounded-[2.5rem] p-8 md:p-12 lg:p-16 text-center"
            >
              <span className="inline-block bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2.5 text-sm text-muted-foreground mb-10">
                #01. | Our Vision
              </span>

              <h2 className="text-3xl md:text-5xl text-foreground mb-8">
                <span className="font-cormorant italic font-light text-4xl md:text-6xl">Your evolution</span>
                <span className="font-light"> speaks for itself</span>
              </h2>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
                Naru is the career platform designed for individuals who prioritize growth, clarity, and becoming the best version of themselves.
              </p>

              <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
                {[
                  { icon: Brain, label: "AI-Powered", gradient: "from-violet-500/20 to-purple-500/20" },
                  { icon: BarChart3, label: "Growth-Focused", gradient: "from-blue-500/20 to-cyan-500/20" },
                  { icon: Flame, label: "Personal", gradient: "from-orange-500/20 to-rose-500/20" }
                ].map((item, index) => (
                  <motion.div 
                    key={index} 
                    className="text-center group"
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative w-18 h-18 mx-auto mb-4">
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <div className="relative w-14 h-14 mx-auto bg-card/80 border border-border/40 rounded-xl flex items-center justify-center group-hover:border-border transition-all duration-300">
                        <item.icon className="h-6 w-6 text-foreground group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-[2.5rem] p-8 md:p-12 lg:p-16 text-center"
            >
              <h2 className="text-3xl md:text-5xl text-foreground mb-8">
                <span className="font-light">Ready to meet your </span>
                <span className="font-cormorant italic font-light text-4xl md:text-6xl">future self</span>
                <span className="font-light">?</span>
              </h2>

              <p className="text-lg text-muted-foreground mb-10">
                Join the private beta and start your transformation today.
              </p>

              <Button asChild size="lg" className="rounded-full text-base px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                <Link to="/auth">
                  Join Private Beta <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-border/50">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-xl font-semibold text-foreground">Naru</div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 Naru. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default About;
