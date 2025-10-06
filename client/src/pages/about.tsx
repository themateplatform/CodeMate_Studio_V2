import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Users, Zap, Target } from "lucide-react";
import { useLocation } from "wouter";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  const values = [
    {
      icon: Sparkles,
      title: "Innovation First",
      description: "We push the boundaries of what's possible with AI-powered development"
    },
    {
      icon: Users,
      title: "Developer Focused",
      description: "Built by developers, for developers. Every feature is crafted with your workflow in mind"
    },
    {
      icon: Zap,
      title: "Speed & Quality",
      description: "Build faster without compromising on code quality or maintainability"
    },
    {
      icon: Target,
      title: "Simplicity",
      description: "Complex technology made simple. Focus on your ideas, not the infrastructure"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF0CB6] via-[#8A2EFF] to-[#0B0B15]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm" aria-label="Main navigation">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1" 
            onClick={() => setLocation("/")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setLocation("/");
              }
            }}
            aria-label="Go to homepage"
          >
            <div className="w-8 h-8 bg-white rounded-full" aria-hidden="true" />
            <span className="text-white font-bold text-xl">CodeMate Studio</span>
          </div>
          <div className="flex items-center gap-6">
            <a 
              href="/docs" 
              className="text-white hover:text-[#FF0CB6] transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1"
              aria-label="View documentation"
            >
              Docs
            </a>
            <a 
              href="/pricing" 
              className="text-white hover:text-[#FF0CB6] transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1"
              aria-label="View pricing"
            >
              Pricing
            </a>
            <Button 
              variant="outline" 
              className="text-white border-white hover:bg-white hover:text-[#8A2EFF]" 
              onClick={() => setLocation("/projects")}
              aria-label="Sign in to your account"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-32 pb-20">
        {/* Header */}
        <header className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] bg-clip-text text-transparent">
            Build With Creativity
          </h1>
          <p className="text-white/90 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
            CodeMate Studio is revolutionizing software development with AI-powered tools that help you build, deploy, and scale applications faster than ever before.
          </p>
        </header>

        {/* Mission Statement */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 max-w-4xl mx-auto mb-20">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
            <p className="text-white/90 text-lg leading-relaxed">
              We believe that great ideas shouldn't be held back by technical complexity. 
              Our mission is to democratize software development by making it accessible, 
              intuitive, and powerful for everyone—from seasoned developers to first-time builders.
            </p>
          </CardContent>
        </Card>

        {/* Values */}
        <section aria-labelledby="values-heading" className="mb-20">
          <h2 id="values-heading" className="text-4xl font-bold text-white text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {values.map((value) => (
              <Card key={value.title} className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-lg flex-shrink-0" aria-hidden="true">
                      <value.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                      <p className="text-white/80 leading-relaxed">{value.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section aria-labelledby="stats-heading" className="mb-20">
          <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
              <CardContent className="p-8">
                <div className="text-5xl font-bold text-white mb-2" aria-label="10,000 plus">10K+</div>
                <div className="text-white/80">Developers</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
              <CardContent className="p-8">
                <div className="text-5xl font-bold text-white mb-2" aria-label="50,000 plus">50K+</div>
                <div className="text-white/80">Projects Built</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
              <CardContent className="p-8">
                <div className="text-5xl font-bold text-white mb-2" aria-label="99.9 percent">99.9%</div>
                <div className="text-white/80">Uptime</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="text-3xl font-bold text-white mb-6">Ready to Start Building?</h2>
          <Button 
            size="lg"
            className="bg-white text-[#8A2EFF] hover:bg-white/90 text-lg px-8 py-6"
            onClick={() => setLocation("/app-builder")}
            aria-label="Get started for free"
          >
            Get Started Free →
          </Button>
        </section>
      </div>
    </div>
  );
}
