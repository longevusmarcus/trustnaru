import { ArrowLeft, ArrowRight, Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  readTime: string;
  category: string;
  content: string[];
}

const blogPosts: (BlogPost & { isoDate: string })[] = [
  {
    slug: "why-visualizing-your-future-self-changes-everything",
    title: "Why Visualizing Your Future Self Changes Everything",
    subtitle: "The science behind seeing who you could become — and why it rewires how you make decisions today.",
    date: "January 2026",
    isoDate: "2026-01-15",
    readTime: "5 min read",
    category: "Identity",
    content: [
      "There's a well-documented gap between who you are today and who you want to become. Psychologists call it 'future self-continuity' — the degree to which you feel emotionally connected to the person you'll be in five or ten years. When that connection is weak, you procrastinate. You settle. You make choices that serve right now at the expense of later.",
      "At Naru, we took that research seriously. Our AI doesn't just suggest career paths — it generates visual representations of your future self, grounded in your actual skills, experience, and ambitions. You don't read about a possible future. You see it. You see yourself in it.",
      "This isn't vanity. It's strategy. When you can picture yourself leading a product team, or running your own consultancy, or speaking at conferences in your field, the abstract becomes visceral. Your brain starts treating that future as real — and your daily decisions begin to shift accordingly.",
      "Each career path in Naru comes with a detailed roadmap: the skills you'd need to build, the timeline, the salary trajectory, even what a typical day would look like. It's the difference between daydreaming and planning. Between wishing and doing.",
      "The people who change careers successfully aren't the ones with the most talent. They're the ones with the clearest picture of where they're going.",
    ],
  },
  {
    slug: "the-case-for-a-career-copilot",
    title: "The Case for a Career Copilot",
    subtitle: "Career advice is everywhere. Personalized, actionable daily guidance is almost nowhere. Until now.",
    date: "December 2025",
    isoDate: "2025-12-10",
    readTime: "4 min read",
    category: "Product",
    content: [
      "We live in an era of infinite career content. LinkedIn posts about 'what I wish I knew at 25.' YouTube videos on switching into tech. Podcasts where successful founders retrace their origin stories. The information is abundant. The problem is that none of it knows you.",
      "A career copilot is different. It doesn't broadcast generic advice — it observes where you are, understands where you want to go, and breaks the journey down into actions you can take today. Not next quarter. Today.",
      "Naru's copilot works in levels. You start at Level 1 with foundational moves — building awareness, identifying gaps, setting your direction. As you complete actions and build momentum, the system adapts. By Level 5, you're doing things that would've felt impossible at the start: reaching out to decision-makers, presenting at meetups, applying strategically.",
      "The key insight is that career growth isn't one dramatic leap. It's dozens of small, well-timed moves. The copilot's job is to know which move comes next — and to make sure you actually make it.",
      "Think of it less like a career coach and more like a thoughtful friend who happens to have perfect memory, infinite patience, and a PhD in behavioral science.",
    ],
  },
  {
    slug: "daily-actions-compound-interest-for-your-career",
    title: "Daily Actions: Compound Interest for Your Career",
    subtitle: "Small, consistent moves create outcomes that big, sporadic efforts never will.",
    date: "November 2025",
    isoDate: "2025-11-20",
    readTime: "4 min read",
    category: "Growth",
    content: [
      "Everyone knows compound interest works for money. Few people apply the same logic to their careers. But the math is identical: small, consistent investments, made reliably over time, produce outsized results.",
      "That's the philosophy behind Naru's daily action system. Every day, based on your active career path and your current level, the app surfaces a handful of specific, completable tasks. Not vague goals like 'network more' — but concrete actions like 'read this particular article on product-led growth' or 'draft a 3-sentence elevator pitch for your target role.'",
      "The magic isn't in any single action. It's in the accumulation. After a week, you've consumed more relevant career content than most people read in a month. After a month, you've built real skills and made genuine connections. After three months, you're a fundamentally different professional — and the data on your progress proves it.",
      "We also learned something interesting from our early users: the streak matters. Showing up daily, even for ten minutes, creates identity shift. You stop being someone who 'should probably think about their career' and start being someone who is actively building one.",
      "The best career strategy isn't a five-year plan. It's a five-minute daily practice.",
    ],
  },
  {
    slug: "what-ai-gets-right-about-career-guidance",
    title: "What AI Gets Right About Career Guidance (And What It Doesn't)",
    subtitle: "Honest reflections on where artificial intelligence genuinely helps with career decisions — and where human judgment remains irreplaceable.",
    date: "October 2025",
    isoDate: "2025-10-05",
    readTime: "6 min read",
    category: "Perspective",
    content: [
      "There's a temptation, when you build an AI-powered product, to claim it can do everything. We won't. AI is extraordinary at some parts of career guidance and genuinely limited at others. Being honest about that distinction is what makes Naru trustworthy.",
      "Where AI excels: pattern recognition across massive datasets. It can look at your skills, experience, and stated interests and surface career paths you'd never have considered — paths where people with similar profiles have thrived. It can identify skill gaps with surgical precision. It can generate daily actions that are calibrated to your current level, not too easy, not overwhelming.",
      "Where AI struggles: the deeply human questions. Should you leave a stable job to chase a passion? Is this discomfort a sign you're in the wrong field, or a sign you're growing? How much does your family situation factor into your next move? These aren't optimization problems. They're life questions.",
      "That's why Naru positions AI as a copilot, not a replacement for human judgment. The visualizations, the roadmaps, the daily actions — they're tools for thinking more clearly about your career. They surface options, clarify tradeoffs, and remove the paralysis that comes from having too many choices and not enough structure.",
      "The best use of AI in career guidance isn't to tell you what to do. It's to show you what's possible — and then trust you to decide.",
    ],
  },
  {
    slug: "learning-from-those-who-made-it",
    title: "Learning from Those Who Made It",
    subtitle: "Why studying the trajectories of high-achievers is one of the most underrated career strategies.",
    date: "September 2025",
    isoDate: "2025-09-12",
    readTime: "5 min read",
    category: "Community",
    content: [
      "There's a reason biographies outsell career advice books. Stories of real people navigating real challenges are infinitely more instructive than abstract frameworks. You don't learn how to lead by reading about leadership theory. You learn by watching how someone you admire handled a crisis, made a pivot, or bet on themselves when no one else would.",
      "Naru's community feature is built on this principle. We've curated profiles of professionals across industries — not celebrities, but accomplished practitioners whose careers offer genuine lessons. People who went from analyst to founder. Engineers who became product leaders. Career changers who reinvented themselves at 35, at 40, at 50.",
      "For each profile, Naru surfaces what matters: the key decisions, the skill trajectories, the inflection points. And then our AI connects those patterns to your own journey. 'This person's path from consulting to tech product management mirrors your current trajectory. Here's what they prioritized in their first 90 days.'",
      "It's not about copying someone else's career. It's about expanding your sense of what's possible. When you see someone with a background similar to yours who's already where you want to be, the path stops feeling theoretical. It feels navigable.",
      "The most powerful career tool isn't a test or a framework. It's a story that makes you think: if they did it, maybe I can too.",
    ],
  },
];

const Blog = () => {
  const pageTitle = "Blog — Naru | Career Growth & Future-Self Insights";
  const pageDescription =
    "Thoughtful perspectives on career growth, future-self visualization, and the role of AI in professional development. Insights from the Naru team.";
  const canonicalUrl = "https://trustnaru.lovable.app/blog";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Naru Blog — Thoughts on Becoming",
    url: canonicalUrl,
    description: pageDescription,
    publisher: {
      "@type": "Organization",
      name: "Naru by RocketMinds",
      url: "https://trustnaru.lovable.app",
    },
    blogPost: blogPosts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.subtitle,
      datePublished: post.isoDate,
      author: {
        "@type": "Organization",
        name: "Naru",
      },
      publisher: {
        "@type": "Organization",
        name: "Naru by RocketMinds",
      },
      mainEntityOfPage: `${canonicalUrl}#${post.slug}`,
    })),
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://trustnaru.lovable.app/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: canonicalUrl },
    ],
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="blog" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Naru" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />

        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbData)}</script>
      </Helmet>

      <main className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/30">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <nav aria-label="Breadcrumb" className="flex items-center justify-between mb-12">
              <Link to="/" aria-label="Back to home">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Home
                </Button>
              </Link>
              <Link
                to="/"
                className="text-xl font-light tracking-wide bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                aria-label="Naru home"
              >
                Naru
              </Link>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60 mb-4" aria-hidden="true">Journal</p>
              <h1 className="text-4xl md:text-5xl font-cormorant font-light text-foreground mb-4">
                Thoughts on Becoming
              </h1>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                On careers, identity, and the quiet work of growing into who you're meant to be.
              </p>
            </motion.div>
          </div>
        </header>

        {/* Articles */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-0">
            {blogPosts.map((post, index) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
              >
                <a href={`#${post.slug}`} className="group block py-10 first:pt-0">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">
                      {post.category}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-cormorant font-light text-foreground group-hover:text-foreground/80 transition-colors mb-3">
                    {post.title}
                  </h2>

                  <p className="text-muted-foreground text-[15px] leading-relaxed max-w-2xl mb-5">
                    {post.subtitle}
                  </p>

                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 group-hover:text-foreground/70 transition-colors">
                    Read essay <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
                {index < blogPosts.length - 1 && <Separator className="bg-border/30" />}
              </motion.article>
            ))}
          </div>
        </div>

        {/* Full Articles */}
        <div className="border-t border-border/30">
          <div className="max-w-3xl mx-auto px-6 py-20 space-y-32">
            {blogPosts.map((post, index) => (
              <motion.article
                key={post.slug}
                id={post.slug}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">
                      {post.category}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-[11px] text-muted-foreground/50">{post.date}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-cormorant font-light text-foreground mb-4 leading-tight">
                    {post.title}
                  </h2>
                  <p className="text-lg text-muted-foreground font-light italic">
                    {post.subtitle}
                  </p>
                </div>

                <div className="space-y-6">
                  {post.content.map((paragraph, pIndex) => (
                    <p
                      key={pIndex}
                      className={`text-[15px] md:text-base leading-[1.85] ${
                        pIndex === 0
                          ? "text-foreground/90 first-letter:text-3xl first-letter:font-cormorant first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:leading-none"
                          : "text-muted-foreground"
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {index < blogPosts.length - 1 && (
                  <div className="mt-16 flex justify-center">
                    <span className="text-muted-foreground/20 text-2xl tracking-[1em]">···</span>
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-border/30 py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/50 mb-6">Ready?</p>
            <h3 className="text-2xl md:text-3xl font-cormorant font-light text-foreground mb-4">
              Start becoming who you're meant to be.
            </h3>
            <Button asChild size="lg" className="rounded-full mt-4">
              <Link to="/auth">
                Join Naru <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};

export default Blog;
