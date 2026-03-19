import React from "react";

const sections = [
  {
    title: "1. Overview",
    body: [
      `Immortel ("we", "our", "the app") is a Shopify application that connects merchant stores to AI search engines through GEO-optimized content generation and MCP (Model Context Protocol) data access.`,
      "This policy explains what data we collect, how we use it, and your rights.",
    ],
  },
  {
    title: "2. Data We Collect",
    body: [
      "When a merchant installs Immortel, we collect:",
      "From Shopify:",
      "• Store domain and shop name",
      "• Product catalog data (titles, descriptions, prices, inventory levels, status)",
      "• Store owner contact email",
      "• Access tokens required to query your store via Shopify API",
      "From Usage:",
      "• App usage logs and activity timestamps",
      "• Content generated based on your store data",
    ],
  },
  {
    title: "3. How We Use Your Data",
    body: [
      "We use your store data solely to:",
      "• Generate GEO-optimized blog articles and content for your store",
      "• Provide your product catalog to MCP-compatible AI tools and agents",
      "• Improve AI search visibility for your store",
      "• Maintain and operate the app's core functionality",
      "We do not sell, rent, or share your data with third parties for advertising or marketing purposes.",
    ],
  },
  {
    title: "4. Data Retention",
    body: [
      "• Active merchant data is retained while your store has Immortel installed.",
      "• Upon uninstallation, all store and customer data is deleted within 48 hours in compliance with Shopify's shop/redact webhook requirement.",
      "• Customer personal data is deleted upon receiving a customers/redact request from Shopify.",
    ],
  },
  {
    title: "5. Customer Data",
    body: [
      "Immortel does not directly collect or store end-customer (buyer) personal data.",
      "Any customer data incidentally accessed through Shopify APIs is used only for content generation and is not stored beyond the immediate request.",
    ],
  },
  {
    title: "6. Data Sharing",
    body: [
      "We do not share merchant or customer data with any third party except:",
      "• Shopify — as required to operate within the Shopify platform.",
      "• Vercel — our hosting provider, used to operate the app infrastructure.",
      "• AI model providers — anonymized product data may be processed to generate content (no personally identifiable information is included).",
    ],
  },
  {
    title: "7. Security",
    body: [
      "All data is transmitted over HTTPS using TLS encryption.",
      "Access tokens are stored securely and never exposed publicly.",
      "We follow industry-standard security practices to protect your data.",
    ],
  },
  {
    title: "8. Merchant Rights (GDPR / CCPA)",
    body: [
      "You have the right to:",
      "• Request a copy of data we hold about your store.",
      "• Request deletion of your store's data at any time.",
      "• Opt out by uninstalling the app — all data will be deleted within 48 hours.",
      "To make a data request, contact: admin@moonknight.com.",
    ],
  },
  {
    title: "9. Compliance Webhooks",
    body: [
      "Immortel fully complies with Shopify's mandatory privacy webhooks:",
      "• customers/data_request — we respond to customer data requests.",
      "• customers/redact — we delete customer data upon request.",
      "• shop/redact — we delete all store data 48 hours after uninstall.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "For privacy-related questions or data requests:",
      "Email: admin@moonknight.com",
      "App: Immortel — immortel.vercel.app",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <section className="max-w-3xl w-full glass-card-elevated card-anime-float px-8 py-10 space-y-8 text-sm md:text-base">
        <header className="space-y-2 border-b border-[var(--border)] pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)]">
            Privacy Policy for Immortel
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Last updated: March 19, 2026
          </p>
        </header>

        <div className="space-y-8 leading-relaxed">
          {sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-[var(--foreground)]">
                {section.title}
              </h2>
              <div className="space-y-1 text-[var(--muted-foreground)]">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}