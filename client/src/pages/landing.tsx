import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Code2, Sparkles, Zap, Users, Shield, Rocket, Github } from 'lucide-react';
import { useLocation } from 'wouter';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [projectDescription, setProjectDescription] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  // Sample project showcase data
  const showcaseProjects = [
    {
      id: 'hottr-hub',
      title: 'hottr-hub',
      thumbnail: 'https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2F5165481a9b9f4ad88cf21bb71b022669?format=webp&width=800',
      gradient: 'from-pink-500 to-purple-600'
    },
    {
      id: 'hub-mate-studio',
      title: 'hub-mate-studio',
      thumbnail: 'https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2F5165481a9b9f4ad88cf21bb71b022669?format=webp&width=800',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'passion-to-plan-pro',
      title: 'passion-to-plan-pro',
      thumbnail: 'https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2F5165481a9b9f4ad88cf21bb71b022669?format=webp&width=800',
      gradient: 'from-purple-600 to-pink-600'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0B15] text-white">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2Fcf2bb14f9f634632acd8da085020bfdb?format=webp&width=800" alt="CodeMate Studio Logo" className="h-10 w-auto" />
            <span className="ml-2 text-xl font-bold text-white select-none" aria-label="CodeMate Studio">CodeMate Studio</span>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            <a
              href="/projects"
              className="text-white hover:text-[#FF0CB6] transition-colors text-sm font-medium"
              data-testid="link-community"
            >
              Community
            </a>
            <a 
              href="/pricing" 
              className="text-white hover:text-[#FF0CB6] transition-colors text-sm font-medium"
              data-testid="link-pricing"
            >
              Pricing
            </a>
            <a 
              href="/docs" 
              className="text-white hover:text-[#FF0CB6] transition-colors text-sm font-medium"
              data-testid="link-docs"
            >
              Docs
            </a>
            <button
              onClick={() => setAuthOpen(true)}
              className="text-white hover:text-[#FF0CB6] transition-colors text-sm font-medium"
              data-testid="link-sign-in"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-32">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF0CB6] via-[#8A2EFF] to-[#0B0B15] opacity-90"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Headline */}
          <h1 
            className="font-heading font-extrabold text-6xl md:text-7xl mb-6 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] bg-clip-text text-transparent"
            data-testid="text-hero-headline"
            style={{
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Build With Creativity
          </h1>
          
          {/* Subheadline */}
          <p className="font-sans text-2xl text-white mb-12" data-testid="text-hero-subheadline">
            Describe it. Build it. Launch it.
          </p>
          
          {/* Input Box with CTA */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-2 shadow-2xl" style={{ boxShadow: '0 0 40px rgba(138, 46, 255, 0.3)' }}>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="I want to build a..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="flex-1 border-0 text-lg px-6 py-4 bg-white text-gray-800 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-project-description"
                />
                <Button
                  size="lg"
                  onClick={() => {
                    if (projectDescription.trim()) {
                      const encodedDescription = encodeURIComponent(projectDescription.trim());
                      setLocation(`/app-builder?prompt=${encodedDescription}`);
                    } else {
                      setLocation('/projects');
                    }
                  }}
                  className="bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] hover:from-[#FF0CB6] hover:to-[#8A2EFF] text-white font-medium px-8 py-6 rounded-lg transition-all hover:shadow-lg whitespace-nowrap"
                  data-testid="button-start-building"
                >
                  Start Building
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showcase Cards Section */}
      <div className="relative bg-[#0B0B15] py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Features Section */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] text-white">
              Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything you need to build{" "}
              <span className="bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] bg-clip-text text-transparent">
                faster
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              AI-powered development tools that transform your ideas into production-ready applications
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border-white/20 p-8 hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF0CB6] to-[#8A2EFF] flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI-Powered Generation</h3>
              <p className="text-gray-400">
                Describe your app in plain English. Our AI generates production-ready code instantly.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border-white/20 p-8 hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#23E3B8] to-[#8A2EFF] flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Real-Time Collaboration</h3>
              <p className="text-gray-400">
                Work together like Google Docs. See cursors, edits, and changes in real-time.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border-white/20 p-8 hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8A2EFF] to-[#FF0CB6] flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Deploy Instantly</h3>
              <p className="text-gray-400">
                One-click deployment to production. Web and mobile apps ready in minutes.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border-white/20 p-8 hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF0CB6] to-[#23E3B8] flex items-center justify-center mb-4">
                <Github className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">GitHub Integration</h3>
              <p className="text-gray-400">
                Seamless two-way sync with GitHub. Automated CI/CD pipelines included.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border-white/20 p-8 hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#23E3B8] to-[#FF0CB6] flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Enterprise Security</h3>
              <p className="text-gray-400">
                SSO, RBAC, audit logs, and compliance features for enterprise teams.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border-white/20 p-8 hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8A2EFF] to-[#23E3B8] flex items-center justify-center mb-4">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">PWA Ready</h3>
              <p className="text-gray-400">
                Progressive Web Apps that work offline. Install on any device, no app store needed.
              </p>
            </Card>
          </div>

          {/* Showcase Projects */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Built with CodeMate</h2>
            <p className="text-gray-400">Real projects created by our community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {showcaseProjects.map((project) => (
              <Card 
                key={project.id}
                className="bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer border-t-4 border-t-transparent hover:border-t-[#FF0CB6]"
                style={{ boxShadow: '0 4px 20px rgba(255, 12, 182, 0.1)' }}
                data-testid={`card-${project.id}`}
              >
                <div className={`h-48 bg-gradient-to-br ${project.gradient} flex items-center justify-center`}>
                  <div className="text-white text-center p-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <Code2 className="w-8 h-8" />
                    </div>
                    <p className="font-mono text-sm opacity-90">{project.title}</p>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-heading font-medium text-lg text-gray-900">
                    {project.title}
                  </h3>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="relative bg-gradient-to-br from-[#0B0B15] to-[#1a1a2e] py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] text-white">
              Testimonials
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Loved by developers{" "}
              <span className="bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] bg-clip-text text-transparent">
                worldwide
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-white mb-4">
                "CodeMate cut our development time by 70%. We shipped our MVP in 2 weeks instead of 3 months."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF0CB6] to-[#8A2EFF]" />
                <div>
                  <p className="text-white font-semibold">Sarah Chen</p>
                  <p className="text-gray-400 text-sm">Founder, TechStart</p>
                </div>
              </div>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-white mb-4">
                "The AI code generation is scary good. It actually understands context and writes production-quality code."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#23E3B8] to-[#8A2EFF]" />
                <div>
                  <p className="text-white font-semibold">Marcus Johnson</p>
                  <p className="text-gray-400 text-sm">Lead Developer, FinTech Co</p>
                </div>
              </div>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-white mb-4">
                "Real-time collaboration changed everything. Our remote team works seamlessly together now."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8A2EFF] to-[#FF0CB6]" />
                <div>
                  <p className="text-white font-semibold">Priya Patel</p>
                  <p className="text-gray-400 text-sm">CTO, CloudScale</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative bg-[#0B0B15] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[#FF0CB6]/20 to-[#8A2EFF]/20 backdrop-blur-xl border border-white/20 rounded-2xl p-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to build something amazing?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join 10,000+ developers building the future with CodeMate Studio
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setLocation('/projects')}
                className="bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] hover:from-[#FF0CB6] hover:to-[#8A2EFF] text-white font-medium px-8 py-6 rounded-lg transition-all hover:shadow-lg text-lg"
              >
                Start Building Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                onClick={() => setLocation('/docs')}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-medium px-8 py-6 rounded-lg text-lg"
              >
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0B0B15] border-t border-gray-800 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Company */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/about" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    About
                  </a>
                </li>
                <li>
                  <a href="/careers" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="/blog" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/features" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/templates" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Templates
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/docs" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="/tutorials" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Tutorials
                  </a>
                </li>
                <li>
                  <a href="/support" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Community</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/discord" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="/twitter" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="/github" className="text-white hover:text-[#FF0CB6] transition-colors text-sm">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-400">
              &copy; 2025 CodeMate Studio. Where creativity meets code.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
