import { useLocation } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowRight, Code2, Code, Zap, Database } from 'lucide-react';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [projectDescription, setProjectDescription] = useState("");

  // Sample project showcase data
  const showcaseProjects = [
    {
      id: 'hottr-hub',
      title: 'hottr-hub',
      thumbnail: '/api/placeholder/400/300',
      gradient: 'from-pink-500 to-purple-600'
    },
    {
      id: 'hub-mate-studio',
      title: 'hub-mate-studio',
      thumbnail: '/api/placeholder/400/300',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'passion-to-plan-pro',
      title: 'passion-to-plan-pro',
      thumbnail: '/api/placeholder/400/300',
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
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-4 border-[#FF0CB6]"></div>
            </div>
            <span className="font-heading font-bold text-xl text-white">CodeMate Studio</span>
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
            <a 
              href="/projects" 
              className="text-white hover:text-[#FF0CB6] transition-colors text-sm font-medium"
              data-testid="link-sign-in"
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

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

      {/* Features Section */}
      <section className="py-20 px-6 bg-[#0B0B15]">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
            Everything You Need to Build
          </h2>
          <p className="text-white/80 text-center text-lg mb-16 max-w-2xl mx-auto">
            Powerful tools and features to bring your ideas to life faster than ever
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
              <CardHeader>
                <div className="p-3 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-lg w-fit mb-4">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white text-xl">AI-Powered Code Generation</CardTitle>
                <CardDescription className="text-white/80">
                  Describe what you want to build and watch as AI generates clean, production-ready code
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
              <CardHeader>
                <div className="p-3 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-lg w-fit mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Lightning Fast Development</CardTitle>
                <CardDescription className="text-white/80">
                  Build full-stack applications in minutes, not weeks. Go from idea to deployment instantly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
              <CardHeader>
                <div className="p-3 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-lg w-fit mb-4">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Built-in Backend</CardTitle>
                <CardDescription className="text-white/80">
                  Database, authentication, and APIs automatically configured and ready to use
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-[#0B0B15]/80">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            How It Works
          </h2>
          
          <div className="space-y-12">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-full flex items-center justify-center text-white font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Describe Your Idea</h3>
                <p className="text-white/80 text-lg">
                  Tell us what you want to build in plain English. No coding required to start.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-full flex items-center justify-center text-white font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">AI Builds Your App</h3>
                <p className="text-white/80 text-lg">
                  Our AI generates a complete, working application with frontend, backend, and database.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-full flex items-center justify-center text-white font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Customize & Deploy</h3>
                <p className="text-white/80 text-lg">
                  Fine-tune with our visual editor or dive into the code. Deploy to production with one click.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Cards Section */}
      <div className="relative bg-[#0B0B15] py-20 px-4">
        <div className="max-w-7xl mx-auto">
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

      {/* Social Proof Section */}
      <section className="py-20 px-6 bg-[#0B0B15]/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            Trusted by Developers Worldwide
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
              <CardContent className="pt-8">
                <div className="text-4xl font-bold text-white mb-2">10K+</div>
                <div className="text-white/80">Active Developers</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
              <CardContent className="pt-8">
                <div className="text-4xl font-bold text-white mb-2">50K+</div>
                <div className="text-white/80">Projects Launched</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
              <CardContent className="pt-8">
                <div className="text-4xl font-bold text-white mb-2">99.9%</div>
                <div className="text-white/80">Uptime</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <p className="text-white/90 italic mb-4">
                  "CodeMate Studio cut our development time by 80%. We shipped our MVP in days instead of months."
                </p>
                <p className="text-white/70 font-semibold">- Sarah Chen, Startup Founder</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <p className="text-white/90 italic mb-4">
                  "The AI understands what I want to build and generates clean, maintainable code. It's incredible."
                </p>
                <p className="text-white/70 font-semibold">- Marcus Rodriguez, Full-Stack Developer</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
