import { useLocation } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowRight, Code2 } from 'lucide-react';

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
            <img src="https://cdn.builder.io/api/v1/image/assets%2F7f4f17bc2420491a95f23b47a94e6efc%2Fcf2bb14f9f634632acd8da085020bfdb?format=webp&width=800" alt="CodeMate Studio Logo" className="h-10 w-auto" />
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
