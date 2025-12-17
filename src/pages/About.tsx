import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Target, Compass, Brain, TrendingUp, Users, Rocket, Eye, Zap, MessageCircle, Bell, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";

const About = () => {
  const features = [
    {
      icon: Eye,
      title: "Visualize Your Future",
      description: "See yourself in your dream career with AI-generated visualizations that inspire action."
    },
    {
      icon: Zap,
      title: "Personalized Guidance",
      description: "Get tailored advice and actionable steps based on your unique skills and aspirations."
    },
    {
      icon: Compass,
      title: "Clear Direction",
      description: "Navigate your career path with confidence using AI-powered insights and roadmaps."
    }
  ];

  const floatingCards = [
    { 
      title: "Path Activated", 
      text: "You've started your journey to become a Product Lead at a top tech company.", 
      delay: 0,
      position: "left-4 lg:left-12 top-36",
      icon: Rocket,
      time: "2m ago",
      avatar: "🚀"
    },
    { 
      title: "New Insight", 
      text: "Your skills in design thinking align perfectly with product strategy roles.", 
      delay: 0.2,
      position: "right-4 lg:right-12 top-52",
      icon: Sparkles,
      time: "15m ago",
      avatar: "✨"
    },
    { 
      title: "Daily Action", 
      text: "Connect with 2 product leaders on LinkedIn who inspire your vision.", 
      delay: 0.4,
      position: "left-8 lg:left-20 bottom-36",
      icon: MessageCircle,
      time: "1h ago",
      avatar: "💬"
    },
    { 
      title: "Goal Achieved", 
      text: "Congratulations! You've unlocked Level 2 of your career path.", 
      delay: 0.6,
      position: "right-8 lg:right-20 bottom-52",
      icon: Star,
      time: "3h ago",
      avatar: "⭐"
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
                <a href="#vision" className="hover:text-foreground transition-colors">Vision</a>
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
          
          {/* Floating Cards - More sophisticated */}
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
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg shrink-0">
                    {card.avatar}
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

        {/* Manifesto Section */}
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

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <p className="text-2xl md:text-3xl lg:text-4xl font-cormorant font-light text-muted-foreground leading-relaxed">
                For too long, people have navigated their careers alone—uncertain, overwhelmed, and disconnected from their true potential.{" "}
                <span className="text-foreground">Naru changes that.</span>
              </p>
              <p className="text-2xl md:text-3xl lg:text-4xl font-cormorant font-light text-muted-foreground leading-relaxed">
                With AI-powered visualizations, personalized guidance, and actionable daily steps, we help you see your future self clearly, align with purpose, and turn dreams into reality.
              </p>
              <p className="text-2xl md:text-3xl lg:text-4xl font-cormorant font-light text-muted-foreground leading-relaxed">
                Naru isn't just a tool—<span className="text-foreground">it's the key to becoming who you're meant to be.</span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 px-6 bg-gradient-to-b from-secondary/20 to-background">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl md:text-5xl text-foreground mb-6">
                <span className="font-cormorant italic font-light text-4xl md:text-6xl">Tools for your</span>
                <span className="font-light"> evolution.</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Naru adapts to your journey, delivering AI-driven insights that boost clarity, confidence, and progress.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  className="group bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8 hover:bg-card hover:border-border hover:shadow-xl hover:shadow-background/30 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex items-center justify-center mb-6 group-hover:bg-secondary group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="h-7 w-7 text-foreground" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-medium text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section id="vision" className="py-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <span className="inline-block bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2.5 text-sm text-muted-foreground">
                #01. | Our Vision
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl text-foreground mb-8"
            >
              <span className="font-cormorant italic font-light text-4xl md:text-6xl">Your evolution</span>
              <span className="font-light"> speaks for itself</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16"
            >
              Naru is the career platform designed for individuals who prioritize growth, clarity, and becoming the best version of themselves.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="grid grid-cols-3 gap-6 max-w-md mx-auto"
            >
              {[
                { icon: Brain, label: "AI-Powered" },
                { icon: TrendingUp, label: "Growth-Focused" },
                { icon: Users, label: "Personal" }
              ].map((item, index) => (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 mx-auto bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-card group-hover:border-border group-hover:scale-110 transition-all duration-300">
                    <item.icon className="h-7 w-7 text-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 bg-gradient-to-b from-secondary/20 to-background">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl text-foreground mb-8"
            >
              <span className="font-light">Ready to meet your </span>
              <span className="font-cormorant italic font-light text-4xl md:text-6xl">future self</span>
              <span className="font-light">?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-lg text-muted-foreground mb-12"
            >
              Join the private beta and start your transformation today.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
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
