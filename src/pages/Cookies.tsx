import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const Cookies = () => {
  useEffect(() => {
    document.title = "Cookie Policy | Naru - How We Use Cookies";
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
          <h1 className="text-3xl font-light mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are stored on your device when you visit our Service. They help us provide you with a better experience by remembering your preferences and enabling certain features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">2. Types of Cookies We Use</h2>
            
            <h3 className="text-lg font-light mb-3 mt-4">2.1 Essential Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These cookies are necessary for the Service to function properly. They enable core functionality such as:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authentication and account access</li>
              <li>Security and fraud prevention</li>
              <li>Session management</li>
              <li>Load balancing</li>
            </ul>

            <h3 className="text-lg font-light mb-3 mt-4">2.2 Performance and Analytics Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These cookies help us understand how visitors interact with our Service:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Page views and navigation patterns</li>
              <li>Time spent on pages</li>
              <li>Error messages encountered</li>
              <li>Device and browser information</li>
            </ul>

            <h3 className="text-lg font-light mb-3 mt-4">2.3 Functionality Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These cookies remember your preferences and choices:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Language preferences</li>
              <li>Theme settings (light/dark mode)</li>
              <li>Customized interface options</li>
              <li>Previously entered information</li>
            </ul>

            <h3 className="text-lg font-light mb-3 mt-4">2.4 Targeting and Advertising Cookies</h3>
            <p className="text-muted-foreground leading-relaxed">
              Currently, we do not use targeting or advertising cookies. If this changes in the future, we will update this policy and request your consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">3. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may use services from trusted third parties that may set cookies on your device:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authentication providers</li>
              <li>Analytics services</li>
              <li>Content delivery networks</li>
              <li>Error tracking and monitoring tools</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              These third parties have their own privacy policies governing their use of cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">4. Cookie Duration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Cookies may be either:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Session cookies:</strong> Temporary cookies that expire when you close your browser</li>
              <li><strong>Persistent cookies:</strong> Cookies that remain on your device for a set period or until you delete them</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You have several options to manage or disable cookies:
            </p>
            
            <h3 className="text-lg font-light mb-3 mt-4">Browser Settings</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>View and delete cookies</li>
              <li>Block all cookies</li>
              <li>Block third-party cookies only</li>
              <li>Clear cookies when you close your browser</li>
            </ul>

            <h3 className="text-lg font-light mb-3 mt-4">Impact of Disabling Cookies</h3>
            <p className="text-muted-foreground leading-relaxed">
              Please note that disabling cookies may affect the functionality of our Service. Essential cookies are required for the Service to work properly, and disabling them may prevent you from accessing certain features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">6. Cookie Consent</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using our Service, you consent to the use of cookies as described in this policy. For non-essential cookies, we will request your explicit consent before placing them on your device.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">7. Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our practices. We will notify you of any significant changes by posting the updated policy on our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-light mb-4">8. More Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For more information about how we use cookies and protect your privacy, please see our Privacy Policy. If you have specific questions about our use of cookies, please contact us at:{" "}
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

export default Cookies;
