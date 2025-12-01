import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
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
          <h1 className="text-3xl font-light mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Naru. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-light mb-3 mt-4">2.1 Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Email address and password</li>
              <li>Profile information (name, photo, bio)</li>
              <li>Career goals and aspirations</li>
              <li>Voice recordings (if you use voice features)</li>
              <li>CV/resume data</li>
              <li>Communication preferences</li>
            </ul>

            <h3 className="text-lg font-light mb-3 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device information and identifiers</li>
              <li>IP address and location data</li>
              <li>Browser type and version</li>
              <li>Usage data and analytics</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the collected information for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Providing and improving our Service</li>
              <li>Personalizing your experience and content</li>
              <li>Generating AI-powered insights and recommendations</li>
              <li>Communicating with you about the Service</li>
              <li>Analyzing usage patterns and trends</li>
              <li>Protecting against fraud and abuse</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">4. AI and Data Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service uses artificial intelligence to analyze your data and provide personalized recommendations. Your data may be processed by AI models to generate insights, but we do not share your personal information with third-party AI providers without your explicit consent. AI-generated content is based on your inputs and general patterns, not shared with other users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell your personal information. We may share your information only in these circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>With your explicit consent</li>
              <li>With service providers who assist in operating the Service</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">8. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access and review your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent at any time</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">9. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze usage, and personalize content. You can control cookies through your browser settings, but disabling them may affect functionality. See our Cookie Policy for more details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">10. Third-Party Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">11. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for users under 16 years of age. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal data, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">12. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use after such changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:{" "}
              <a href="mailto:privacy@rocketminds.io" className="text-emerald-500 hover:text-emerald-400">
                privacy@rocketminds.io
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
