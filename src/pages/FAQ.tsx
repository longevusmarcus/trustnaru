import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";

const FAQ = () => {
  const faqs = [
    {
      question: "What is Naru?",
      answer: "Naru is your personal AI copilot that helps you visualize and achieve your ideal career path. We help you see your future self, get actionable guidance, and track your evolution every step of the way."
    },
    {
      question: "How does Naru work?",
      answer: "You start by sharing your story through voice, photos, or your CV. Our AI analyzes your skills, aspirations, and personality to generate personalized career paths with visual representations of your future self. Then we provide daily actions, insights, and mentorship to help you get there."
    },
    {
      question: "Do I need an access code?",
      answer: "Yes, Naru is currently in limited access. You can use the code 'become' to get started, or you might have received a personal VIP code. Simply enter your code on the login page to begin your journey."
    },
    {
      question: "What's the difference between missions and actions?",
      answer: "Missions appear on your home dashboard - these are core daily practices like reflection and visualization that build your foundation. Actions appear on your copilot page - these are specific tasks tailored to your active career path that move you toward your goals."
    },
    {
      question: "Can I explore multiple career paths?",
      answer: "Absolutely! You can generate multiple career paths based on your profile. Each path shows you a different possible future, complete with visualizations, roadmaps, and specific actions. You can activate any path to start working toward it."
    },
    {
      question: "How are the visualizations created?",
      answer: "We use advanced AI to generate realistic images of your future self based on your uploaded photos and the career path you're exploring. These aren't generic stock photos - they're personalized visions of you in your ideal future."
    },
    {
      question: "What if I don't like the suggested paths?",
      answer: "You can always give feedback or dismiss paths that don't resonate. Just tap the thumbs down on any path to remove it from your futures page. Our AI learns from your preferences to suggest better matches."
    },
    {
      question: "How does the level system work?",
      answer: "Your journey is divided into 5 progressive levels, each 10% more challenging than the last. As you complete actions and build skills, you advance through levels, unlocking richer content and more practical guidance toward your goal."
    },
    {
      question: "Can I use Naru on desktop?",
      answer: "Naru is designed primarily for mobile to make it easy to engage with your growth journey anytime, anywhere. However, you can choose to continue on desktop by clicking 'Continue via Desktop' if you prefer."
    },
    {
      question: "How does the AI copilot help me?",
      answer: "Your copilot provides personalized daily actions based on your active path and current level. It also offers skill gap analysis, tailored suggestions, and specific resources (people to follow, articles to read, etc.) to help you make real progress."
    },
    {
      question: "What happens to my incomplete actions?",
      answer: "Incomplete actions from previous days remain visible so you can finish them. We don't erase your progress - you can access your history and complete tasks at your own pace."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. Your photos, CV, voice recordings, and personal information are securely stored and only used to personalize your experience. We never share your data with third parties. Check our Privacy Policy for full details."
    }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <nav className="flex gap-2 mb-6">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </nav>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            <h1 className="text-3xl font-light mb-2">Frequently Asked Questions</h1>
            <p className="text-muted-foreground mb-8">Everything you need to know about Naru</p>

            {faqs.map((faq, index) => (
              <section key={index} className="mb-8">
                <h2 className="text-xl font-light mb-3">{faq.question}</h2>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </section>
            ))}

            <section className="mt-12 p-6 bg-card/50 rounded-lg border border-muted/30">
              <h2 className="text-xl font-light mb-3">Still have questions?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We're here to help. Reach out to us at{" "}
                <a href="mailto:hello@rocketminds.io" className="text-emerald-500 hover:text-emerald-400">
                  hello@rocketminds.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQ;
