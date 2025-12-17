import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Brain, Flame, BarChart3, Rocket, Lightbulb, CircleCheck, Award, Eye, Target, LineChart, Users, Check, User, Compass, ClipboardList, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { useRef } from "react";

// Import app screenshots
import featureFutures from "@/assets/feature-futures.png";
import featureCopilot from "@/assets/feature-copilot.png";
import featureInsights from "@/assets/feature-insights.png";
import featureCommunity from "@/assets/feature-community.png";

// Import testimonial photos
import testimonial1 from "@/assets/testimonial-1.png";
import testimonial2 from "@/assets/testimonial-2.png";
import testimonial3 from "@/assets/testimonial-3.png";

// Component for manifesto text that highlights as one whole unit on scroll
const ManifestoText = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.15"]
  });

  // Define paragraphs with special styling for certain words
  const paragraphs = [
    {
      text: "For too long, careers have been a solo journey—confusing, overwhelming, and disconnected from who we truly are.",
      highlights: ["solo journey", "disconnected"]
    },
    {
      text: "Naru changes the experience.",
      highlights: ["Naru"],
      isAccent: true
    },
    {
      text: "With AI-powered visualizations, deeply personalized guidance, and clear daily actions, Naru helps you see who you're becoming, align with what matters, and move forward with confidence.",
      highlights: ["who you're becoming", "confidence"]
    },
    {
      text: "Naru isn't just a tool, it's a companion for becoming your fullest self.",
      highlights: ["companion", "fullest self"],
      hasCircle: "fullest self"
    }
  ];

  // Flatten all words while tracking paragraph breaks and highlights
  const allElements: { word: string; isBreak?: boolean; isHighlight?: boolean; hasCircle?: boolean; isAccent?: boolean }[] = [];
  
  paragraphs.forEach((para, pIndex) => {
    const words = para.text.split(" ");
    words.forEach((word) => {
      const isHighlight = para.highlights.some(h => para.text.indexOf(h) !== -1 && h.split(" ").includes(word.replace(/[.,!?]/g, '')));
      const hasCircle = para.hasCircle && para.hasCircle.split(" ").includes(word.replace(/[.,!?]/g, ''));
      allElements.push({ 
        word, 
        isHighlight,
        hasCircle,
        isAccent: para.isAccent
      });
    });
    if (pIndex < paragraphs.length - 1) {
      allElements.push({ word: "", isBreak: true });
    }
  });

  const wordCount = allElements.filter(e => !e.isBreak).length;
  let wordIndex = 0;

  return (
    <div ref={ref} className="text-2xl md:text-3xl lg:text-4xl font-cormorant font-light leading-relaxed text-center space-y-8">
      {paragraphs.map((para, pIndex) => {
        const words = para.text.split(" ");
        const startIdx = wordIndex;
        wordIndex += words.length;
        
        return (
          <p key={pIndex} className={`${para.isAccent ? 'text-3xl md:text-4xl lg:text-5xl font-normal' : ''}`}>
            {words.map((word, wIndex) => {
              const globalIdx = startIdx + wIndex;
              const start = globalIdx / wordCount;
              const end = start + 1 / wordCount;
              const isHighlight = para.highlights.some(h => h.split(" ").includes(word.replace(/[.,!?]/g, '')));
              const hasCircle = para.hasCircle && para.hasCircle.split(" ").includes(word.replace(/[.,!?]/g, ''));
              
              return (
                <ManifestoWord 
                  key={wIndex} 
                  range={[start, end]} 
                  progress={scrollYProgress}
                  isHighlight={isHighlight}
                  hasCircle={hasCircle}
                  isAccent={para.isAccent}
                >
                  {word}
                </ManifestoWord>
              );
            })}
          </p>
        );
      })}
    </div>
  );
};

const ManifestoWord = ({ 
  children, 
  range, 
  progress, 
  isHighlight, 
  hasCircle,
  isAccent 
}: { 
  children: string; 
  range: [number, number]; 
  progress: any;
  isHighlight?: boolean;
  hasCircle?: boolean;
  isAccent?: boolean;
}) => {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const color = useTransform(
    progress, 
    range, 
    isAccent 
      ? ["hsl(142 50% 40%)", "hsl(142 70% 65%)"] 
      : isHighlight 
        ? ["hsl(0 0% 50%)", "hsl(142 50% 70%)"]
        : ["hsl(0 0% 50%)", "hsl(0 0% 98%)"]
  );

  return (
    <motion.span 
      style={{ opacity, color }} 
      className={`inline-block mr-[0.25em] relative ${isHighlight ? 'font-normal' : ''}`}
    >
      {children}
      {hasCircle && (
        <motion.span 
          className="absolute -inset-x-2 -inset-y-1 border-2 border-emerald-500/50 rounded-full pointer-events-none"
          style={{ opacity }}
        />
      )}
    </motion.span>
  );
};

// Video section with 3D scroll perspective effect
const VideoSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  });

  // Transform from tilted (15deg) to flat (0deg) as user scrolls
  const rotateX = useTransform(scrollYProgress, [0, 1], [15, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.6, 1]);

  return (
    <section className="py-24 px-6" style={{ perspective: "1200px" }}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2.5 text-sm text-muted-foreground mb-6">
            <Play className="h-4 w-4" />
            Watch the Experience
          </span>
          <h2 className="text-3xl md:text-4xl text-foreground mb-4">
            <span className="font-light">See Naru </span>
            <span className="font-cormorant italic font-light">in Action</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover how Naru transforms your career journey in under 3 minutes.
          </p>
        </motion.div>

        <motion.div
          ref={containerRef}
          style={{ 
            rotateX, 
            scale, 
            opacity,
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom"
          }}
          className="relative aspect-video rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-background/50 bg-card/50"
        >
          <iframe
            src="https://www.loom.com/embed/977861e8549745d68180aef5b7450433"
            frameBorder="0"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            title="Naru Tutorial Video"
          />
        </motion.div>
      </div>
    </section>
  );
};

const About = () => {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const features = [
    {
      icon: Eye,
      title: "Futures",
      subtitle: "Visualize possible selves",
      description: "See AI-generated visualizations of your future career paths with detailed roadmaps and lifestyle previews.",
      gradient: "from-violet-500/20 to-purple-500/20",
      image: featureFutures
    },
    {
      icon: Target,
      title: "Copilot",
      subtitle: "Turn it into action plan",
      description: "Get personalized daily actions, goals, and step-by-step guidance to become your future self.",
      gradient: "from-blue-500/20 to-cyan-500/20",
      image: featureCopilot
    },
    {
      icon: LineChart,
      title: "Insights",
      subtitle: "Track evolution",
      description: "Monitor your journey progress, stats, and career direction with powerful analytics.",
      gradient: "from-emerald-500/20 to-teal-500/20",
      image: featureInsights
    },
    {
      icon: Users,
      title: "Community",
      subtitle: "Emulate high-achievers",
      description: "Connect with mentors on your path and receive exclusive guidance from those who've succeeded.",
      gradient: "from-rose-500/20 to-orange-500/20",
      image: featureCommunity
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
      position: "left-1 md:left-4 lg:left-12 top-24 md:top-32 lg:top-36",
      icon: Rocket,
      time: "2m ago",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/20"
    },
    { 
      title: "New Insight", 
      text: "Your skills in design thinking align perfectly with product strategy roles.", 
      delay: 0.2,
      position: "right-1 md:right-4 lg:right-12 top-40 md:top-48 lg:top-52",
      icon: Lightbulb,
      time: "15m ago",
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/20"
    },
    { 
      title: "Daily Action", 
      text: "Connect with 2 product leaders on LinkedIn who inspire your vision.", 
      delay: 0.4,
      position: "left-1 md:left-4 lg:left-20 bottom-24 md:bottom-32 lg:bottom-36",
      icon: CircleCheck,
      time: "1h ago",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/20"
    },
    { 
      title: "Goal Achieved", 
      text: "Congratulations! You've unlocked Level 2 of your career path.", 
      delay: 0.6,
      position: "right-1 md:right-4 lg:right-20 bottom-40 md:bottom-48 lg:bottom-52",
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
                <a href="#journey" className="hover:text-foreground transition-colors">Why Naru</a>
                <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
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
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-secondary/40 via-transparent to-transparent" />
          
          {/* Floating Cards with funnel effect - converge to center */}
          {floatingCards.map((card, index) => {
            // Funnel effect - cards converge towards center while shrinking
            const isLeft = index % 2 === 0;
            const cardY = useTransform(heroScrollProgress, [0, 0.5], [0, 200]);
            const cardOpacity = useTransform(heroScrollProgress, [0, 0.3, 0.5], [1, 0.6, 0]);
            const cardScale = useTransform(heroScrollProgress, [0, 0.5], [1, 0.4]);
            // Move towards center - left cards go right, right cards go left
            const cardX = useTransform(heroScrollProgress, [0, 0.5], [0, isLeft ? 150 : -150]);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: card.delay + 0.6, duration: 0.7, ease: "easeOut" }}
                style={{ 
                  y: cardY, 
                  opacity: cardOpacity, 
                  scale: cardScale,
                  x: cardX
                }}
                className={`absolute ${card.position} max-w-[130px] md:max-w-[200px] lg:max-w-[300px] z-20`}
              >
                <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-lg md:rounded-xl lg:rounded-2xl p-1.5 md:p-2.5 lg:p-4 shadow-xl shadow-background/30">
                  <div className="flex items-start gap-1 md:gap-2 lg:gap-3">
                    <div className={`w-5 h-5 md:w-7 md:h-7 lg:w-10 lg:h-10 rounded-md md:rounded-lg lg:rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                      <card.icon className={`h-2.5 w-2.5 md:h-3.5 md:w-3.5 lg:h-5 lg:w-5 ${card.iconColor}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 md:gap-2 mb-0 md:mb-0.5 lg:mb-1">
                        <span className="text-[9px] md:text-xs lg:text-sm font-medium text-foreground">{card.title}</span>
                        <span className="text-[7px] md:text-[10px] lg:text-xs text-muted-foreground shrink-0 hidden md:inline">{card.time}</span>
                      </div>
                      <p className="text-[8px] md:text-[10px] lg:text-xs text-muted-foreground leading-tight line-clamp-2">{card.text}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Hero Content */}
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-16 md:pt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 md:gap-2 bg-card/60 backdrop-blur-sm border border-border/50 rounded-full px-3 md:px-5 py-1.5 md:py-2.5 mb-6 md:mb-10"
            >
              <Brain className="h-3 w-3 md:h-4 md:w-4 text-foreground" />
              <span className="text-[10px] md:text-sm text-muted-foreground whitespace-nowrap">Supported by top brains at Meta, BCG & Stripe</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-3xl md:text-6xl lg:text-7xl text-foreground mb-6 md:mb-8 leading-tight"
            >
              <span className="font-light block md:inline">Because Your Future</span>
              <br className="hidden md:block" />
              <span className="font-cormorant italic font-light text-4xl md:text-7xl lg:text-8xl block md:inline">Deserves a Clear Path</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
            >
              Naru reveals the future professional identity that fits you, and guides you step-by-step to grow into it.
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

        {/* Tutorial Video Section with 3D scroll effect */}
        <VideoSection />

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
                Manifesto
              </span>
            </motion.div>

            <ManifestoText />
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
                  <span className="font-light">Your </span>
                  <span className="font-cormorant italic font-light text-4xl md:text-6xl">career OS</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Redefining career development with AI-powered visualization, personalized guidance, and actionable plans—so you can level up with clarity, purpose, and momentum.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    className="group relative"
                  >
                    <div className="relative bg-card/80 border border-border/40 rounded-2xl overflow-hidden hover:border-border/80 transition-all duration-500 hover:shadow-xl hover:shadow-background/30 h-full flex flex-col">
                      {/* Gradient overlay on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                      
                      {/* Image section */}
                      <div className="relative z-10 aspect-[9/16] max-h-64 overflow-hidden bg-muted/30 rounded-t-xl">
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      </div>
                      
                      <div className="relative z-10 p-6 flex-1">
                        {/* Icon */}
                        <div className="relative w-10 h-10 mb-4 -mt-10">
                          <div className="absolute inset-0 rounded-xl bg-card border border-border/50 shadow-lg" />
                          <div className="absolute inset-[2px] rounded-[10px] bg-card flex items-center justify-center">
                            <feature.icon className="h-4 w-4 text-foreground group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
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

              {/* Naru unlocks YOUR purpose - Journey Steps */}
              <div className="text-center mb-12">
                <h3 className="text-2xl md:text-4xl text-foreground mb-4">
                  <span className="font-light">Naru unlocks </span>
                  <span className="font-cormorant italic font-light text-3xl md:text-5xl">YOUR</span>
                  <span className="font-light"> purpose</span>
                </h3>
                <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
                  Turn your career into a game. Visualize your future, unlock paths, complete daily quests, and level up.
                </p>
              </div>

              {/* Journey Steps - Arrow flow on desktop, stacked cards on mobile */}
              <div className="hidden lg:flex flex-row items-stretch gap-0">
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
                    <div className="relative bg-muted/40 h-full min-h-[130px] flex flex-col justify-start p-5 pr-8"
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

              {/* Mobile Journey Steps - Beautiful stacked cards */}
              <div className="lg:hidden grid grid-cols-1 gap-4">
                {journeySteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08, duration: 0.5 }}
                    className="relative"
                  >
                    <div className="relative bg-card/60 border border-border/40 rounded-2xl p-5 backdrop-blur-sm">
                      {/* Step number badge */}
                      <div className="absolute -top-3 -left-2 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      
                      {/* Arrow indicator (except last) */}
                      {index < journeySteps.length - 1 && (
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-border/60" />
                        </div>
                      )}
                      
                      <h4 className="text-base font-medium text-foreground mb-2 ml-4">{step.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed ml-4">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why Naru Section */}
        <section id="journey" className="py-24 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            {/* What makes Naru different - Comparison Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-background backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden">
                {/* Title inside card */}
                <div className="text-center pt-10 pb-6 px-6">
                  <h2 className="text-3xl md:text-5xl text-foreground mb-3">
                    <span className="font-light">Naru is </span>
                    <span className="font-cormorant italic font-light text-4xl md:text-6xl">identity & outcome</span>
                    <span className="font-light"> first</span>
                  </h2>
                  <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
                    Built to help you become who you're meant to be, not just find the next job.
                  </p>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-4 border-t border-b border-border/50">
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
              
                {/* Legend - inside table card */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground py-6 border-t border-border/30">
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
                
                {/* What makes Naru different - inside table card */}
                <div className="border-t border-border/30 p-8 md:p-10">
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
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl text-foreground mb-6">
                <span className="font-light">What our </span>
                <span className="font-cormorant italic font-light text-4xl md:text-6xl">users</span>
                <span className="font-light"> say</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Real stories from people who transformed their careers with Naru.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {[
                {
                  quote: "Naru helped me visualize my future self as a product leader, and even careers I didn't know how to put into words. Now I truly feel that everything is possible.",
                  initials: "S.C.",
                  role: "Senior Product Manager",
                  photo: testimonial1
                },
                {
                  quote: "The daily actions and personalized guidance made career growth feel achievable. Naru became my career copilot.",
                  initials: "M.J.",
                  role: "Engineering Lead",
                  photo: testimonial2
                },
                {
                  quote: "I was stuck figuring out my next steps. Naru gave me clarity on who I wanted to become and the roadmap to get there.",
                  initials: "E.R.",
                  role: "Graduate Student",
                  photo: testimonial3
                }
              ].map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-secondary/30 backdrop-blur-sm border border-border/30 rounded-3xl p-8 flex flex-col"
                >
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground/90 mb-8 flex-grow leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img 
                      src={testimonial.photo} 
                      alt={testimonial.initials}
                      className="w-12 h-12 rounded-full object-cover border border-border/50"
                    />
                    <div>
                      <p className="font-medium text-foreground">{testimonial.initials}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA integrated into testimonials */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gradient-to-br from-primary/10 via-secondary/20 to-primary/5 backdrop-blur-sm border border-border/30 rounded-3xl p-10 md:p-14 text-center"
            >
              <h3 className="text-2xl md:text-4xl text-foreground mb-6">
                <span className="font-light">Ready to meet your </span>
                <span className="font-cormorant italic font-light text-3xl md:text-5xl">future self</span>
                <span className="font-light">?</span>
              </h3>

              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of professionals who've transformed their careers with Naru.
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
        <footer className="py-16 px-6 bg-muted/20 border-t border-border/30">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-10 mb-12">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="text-2xl font-semibold text-foreground mb-4">Naru</div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-6">
                  The AI-powered career OS that helps you visualize your future self and guides you step-by-step to become who you're meant to be.
                </p>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/auth">
                    Start Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              
              {/* Navigation */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Product</h4>
                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                  <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
                  <a href="#journey" className="hover:text-foreground transition-colors">Why Naru</a>
                  <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
                </div>
              </div>
              
              {/* Legal */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Legal</h4>
                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                  <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                  <Link to="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
                </div>
              </div>
            </div>
            
            {/* Bottom bar */}
            <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">© 2025 Naru by RocketMinds. All rights reserved.</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                <span>Built with purpose for ambitious professionals, career dreamers and career changers</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default About;
