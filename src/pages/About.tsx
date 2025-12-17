import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Target, Compass, Brain, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";

const About = () => {
  const features = [
    {
      icon: Sparkles,
      title: "Visualize Your Future",
      description: "See yourself in your dream career with AI-generated visualizations that inspire action."
    },
    {
      icon: Target,
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
      position: "left-4 top-32"
    },
    { 
      title: "New Insight", 
      text: "Your skills in design thinking align perfectly with product strategy roles.", 
      delay: 0.2,
      position: "right-4 top-48"
    },
    { 
      title: "Daily Action", 
      text: "Connect with 2 product leaders on LinkedIn who inspire your career vision.", 
      delay: 0.4,
      position: "left-8 bottom-32"
    },
    { 
      title: "Goal Progress", 
      text: "You're 60% closer to unlocking Level 2 of your career path.", 
      delay: 0.6,
      position: "right-8 bottom-48"
    }
  ];

  return (
    <>
      <Helmet>
        <title>About Naru - The Career Dreamer & Copilot</title>
        <meta name="description" content="Discover how Naru helps you visualize your future self, unlock personalized guidance, and track your evolution every step of the way." />
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-foreground">
              Naru
            </Link>
            <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#manifesto" className="hover:text-foreground transition-colors">Manifesto</a>
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#vision" className="hover:text-foreground transition-colors">Vision</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Login
              </Link>
              <Button asChild className="rounded-full">
                <Link to="/auth">
                  Join Private Beta <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-secondary via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted/30 via-transparent to-transparent" />
          
          {/* Floating Cards */}
          {floatingCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: card.delay + 0.5, duration: 0.6 }}
              className={`absolute hidden lg:block ${card.position} max-w-[280px]`}
            >
              <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg">
                <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
                <p className="text-sm text-foreground">{card.text}</p>
              </div>
            </motion.div>
          ))}

          {/* Hero Content */}
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2 mb-8"
            >
              <Sparkles className="h-4 w-4 text-foreground" />
              <span className="text-sm text-muted-foreground">Proudly in Private Beta</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl md:text-6xl lg:text-7xl font-light text-foreground mb-6 leading-tight"
            >
              Because Your Future
              <br />
              <span className="font-dancing-script italic">Deserves a Clear Path</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Redefining career development with AI-powered visualization, personalized guidance, and actionable insights.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Button asChild size="lg" className="rounded-full text-lg px-8 py-6">
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
              <span className="inline-block bg-card border border-border rounded-full px-4 py-2 text-sm text-muted-foreground">
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
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-muted-foreground leading-relaxed">
                For too long, people have navigated their careers alone—uncertain, overwhelmed, and disconnected from their true potential.{" "}
                <span className="text-foreground font-normal">Naru changes that.</span>
              </p>
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-muted-foreground leading-relaxed">
                With AI-powered visualizations, personalized guidance, and actionable daily steps, we help you see your future self clearly, align with purpose, and turn dreams into reality.
              </p>
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-muted-foreground leading-relaxed">
                Naru isn't just a tool—<span className="text-foreground font-normal">it's the key to becoming who you're meant to be.</span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 px-6 bg-secondary/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-6">
                <span className="font-dancing-script italic">Tools for your</span> evolution.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Naru adapts to your journey, delivering AI-driven insights that boost clarity, confidence, and progress.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  className="bg-card border border-border rounded-2xl p-8 hover:border-foreground/20 transition-colors"
                >
                  <feature.icon className="h-10 w-10 text-foreground mb-6" />
                  <h3 className="text-xl font-medium text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
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
              <span className="inline-block bg-card border border-border rounded-full px-4 py-2 text-sm text-muted-foreground">
                #01. | Our Vision
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl font-light text-foreground mb-8"
            >
              <span className="font-dancing-script italic">Your evolution</span> speaks for itself
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12"
            >
              Naru is the career platform designed for individuals who prioritize growth, clarity, and becoming the best version of themselves.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="grid grid-cols-3 gap-8 max-w-lg mx-auto"
            >
              {[
                { icon: Brain, label: "AI-Powered" },
                { icon: TrendingUp, label: "Growth-Focused" },
                { icon: Users, label: "Personal" }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto bg-card border border-border rounded-2xl flex items-center justify-center mb-3">
                    <item.icon className="h-7 w-7 text-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 bg-secondary/30">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-5xl font-light text-foreground mb-6"
            >
              Ready to meet your <span className="font-dancing-script italic">future self</span>?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-lg text-muted-foreground mb-10"
            >
              Join the private beta and start your transformation today.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Button asChild size="lg" className="rounded-full text-lg px-8 py-6">
                <Link to="/auth">
                  Join Private Beta <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-2xl font-bold text-foreground">Naru</div>
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
