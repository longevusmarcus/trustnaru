import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const Terms = () => {
  useEffect(() => {
    document.title = "Terms of Service | Naru - Career Development Platform";
  }, []);

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
          <h1 className="text-3xl font-light mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Naru ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Naru provides a platform for personal and professional development, career guidance, and AI-powered insights. The Service includes access to mentorship resources, goal tracking, and personalized recommendations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To access certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">4. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful, offensive, or inappropriate content</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to any systems</li>
              <li>Use the Service for any commercial purpose without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of the Service are owned by Naru and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">6. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service uses artificial intelligence to generate insights, recommendations, and content. While we strive for accuracy, AI-generated content should be considered advisory and not professional advice. You are responsible for verifying and evaluating all information provided.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">7. Privacy and Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our Privacy Policy. We collect, use, and protect your personal information as described in that policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Naru shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the Service. Your continued use after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact us at:{" "}
              <a href="mailto:hello@rocketminds.io" className="text-emerald-500 hover:text-emerald-400">
                hello@rocketminds.io
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
