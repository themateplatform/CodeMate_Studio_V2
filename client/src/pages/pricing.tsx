import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useLocation } from "wouter";

export default function PricingPage() {
  const [, setLocation] = useLocation();

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "5 projects",
        "Basic AI assistance",
        "Community support",
        "100 AI generations/month",
        "Basic templates"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Pro",
      price: "$29",
      description: "For professional developers",
      features: [
        "Unlimited projects",
        "Advanced AI assistance",
        "Priority support",
        "Unlimited AI generations",
        "Premium templates",
        "Custom domain",
        "Advanced deployment options"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Team",
      price: "$99",
      description: "For collaborative teams",
      features: [
        "Everything in Pro",
        "Real-time collaboration",
        "Team management",
        "Advanced analytics",
        "Dedicated support",
        "Custom integrations",
        "SSO & advanced security"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF0CB6] via-[#8A2EFF] to-[#0B0B15]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
            <div className="w-8 h-8 bg-white rounded-full" />
            <span className="text-white font-bold text-xl">CodeMate Studio</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-white hover:text-[#FF0CB6] transition-colors">Docs</a>
            <a href="/pricing" className="text-white hover:text-[#FF0CB6] transition-colors">Pricing</a>
            <Button variant="outline" className="text-white border-white hover:bg-white hover:text-[#8A2EFF]" onClick={() => setLocation("/projects")}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-32 pb-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-white/90 text-xl max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include core features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative bg-white/10 backdrop-blur-lg border-white/20 ${
                plan.popular ? 'ring-2 ring-[#FF0CB6] scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-white/70">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/70">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-white/90">
                      <Check className="w-5 h-5 text-[#FF0CB6] flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] text-white hover:opacity-90' 
                      : 'bg-white text-[#8A2EFF] hover:bg-white/90'
                  }`}
                  onClick={() => setLocation("/projects")}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Can I change plans later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">We accept all major credit cards, PayPal, and can arrange invoicing for Team plans.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
