import { Check, Zap, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const plans = [
  {
    name: "Free",
    description: "Perfect for trying out CodeMate Studio",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    features: [
      "3 projects",
      "Basic AI assistance",
      "Community support",
      "Public GitHub repos",
      "Standard templates",
      "Web deployment"
    ],
    limitations: [
      "Limited AI generations per month",
      "No real-time collaboration",
      "Community support only"
    ],
    cta: "Get Started",
    ctaLink: "/signup",
    popular: false
  },
  {
    name: "Pro",
    description: "For serious developers and small teams",
    price: "$29",
    period: "per month",
    icon: Zap,
    features: [
      "Unlimited projects",
      "Advanced AI models (GPT-4)",
      "Real-time collaboration",
      "Private repositories",
      "Premium templates",
      "Web + Mobile deployment",
      "Priority support",
      "Custom domains",
      "GitHub Actions integration",
      "Advanced analytics"
    ],
    limitations: [],
    cta: "Start Free Trial",
    ctaLink: "/signup?plan=pro",
    popular: true
  },
  {
    name: "Enterprise",
    description: "For organizations requiring advanced features",
    price: "Custom",
    period: "contact us",
    icon: Crown,
    features: [
      "Everything in Pro",
      "SSO / SAML authentication",
      "RBAC and audit logs",
      "Dedicated support",
      "SLA guarantees",
      "On-premise deployment",
      "Custom integrations",
      "Training and onboarding",
      "Compliance assistance",
      "Unlimited team members"
    ],
    limitations: [],
    cta: "Contact Sales",
    ctaLink: "/contact",
    popular: false
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4" variant="outline">
          Pricing
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Choose the plan that fits your needs. All plans include our core features.
          No hidden fees, cancel anytime.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`relative p-8 ${
                  plan.popular
                    ? "border-2 border-primary shadow-2xl shadow-primary/20 scale-105"
                    : "border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period !== "contact us" && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                </div>

                <Link href={plan.ctaLink}>
                  <Button
                    className={`w-full mb-6 ${
                      plan.popular
                        ? "bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <div key={limitation} className="flex items-start gap-2 opacity-60">
                      <span className="text-sm italic">{limitation}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Can I change plans later?</h3>
            <p className="text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect
              immediately, and we'll prorate the cost.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground">
              We accept all major credit cards (Visa, MasterCard, American Express) and PayPal.
              Enterprise customers can pay via invoice.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Is there a free trial?</h3>
            <p className="text-muted-foreground">
              Yes! Pro plans come with a 14-day free trial. No credit card required to start.
              The Free plan is available forever with no time limit.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">What happens when I cancel?</h3>
            <p className="text-muted-foreground">
              You'll retain access until the end of your billing period. Your data is kept for
              30 days in case you change your mind. After that, you can export your projects.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help. Contact us for a personalized demo or custom quote.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/contact">
              <Button size="lg">Contact Sales</Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
