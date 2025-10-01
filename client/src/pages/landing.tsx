import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Code2, Sparkles, Zap, ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [projectIdea, setProjectIdea] = useState('');

  const handleStartBuilding = () => {
    if (projectIdea.trim()) {
      setLocation(`/app-builder?prompt=${encodeURIComponent(projectIdea)}`);
    } else {
      setLocation('/app-builder');
    }
  };

  const showcaseProjects = [
    {
      name: 'hottr-hub',
      description: 'Real-time collaboration platform',
      gradient: 'from-[hsl(316,100%,53%)] to-[hsl(330,100%,45%)]',
      icon: Sparkles,
      color: 'text-[hsl(316,100%,53%)]',
    },
    {
      name: 'hub-mate-studio',
      description: 'Creative workspace builder',
      gradient: 'from-[hsl(187,68%,41%)] to-[hsl(200,70%,50%)]',
      icon: Code2,
      color: 'text-[hsl(187,68%,41%)]',
    },
    {
      name: 'passion-to-plan-pro',
      description: 'Project management suite',
      gradient: 'from-[hsl(265,100%,59%)] to-[hsl(280,100%,65%)]',
      icon: Zap,
      color: 'text-[hsl(265,100%,59%)]',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(316,100%,53%)] via-[hsl(265,100%,59%)] to-[hsl(230,31%,6%)]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-transparent backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <Code2 className="w-5 h-5 text-[hsl(316,100%,53%)]" />
              </div>
              <span className="text-xl font-bold text-white">CodeMate Studio</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="/docs" className="text-sm text-white/90 hover:text-[hsl(316,100%,53%)] transition-colors">
                Community
              </a>
              <a href="/pricing" className="text-sm text-white/90 hover:text-[hsl(316,100%,53%)] transition-colors">
                Pricing
              </a>
              <a href="/docs" className="text-sm text-white/90 hover:text-[hsl(316,100%,53%)] transition-colors">
                Docs
              </a>
              <Button
                variant="ghost"
                onClick={() => setLocation('/projects')}
                className="text-white hover:bg-white/10"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 bg-gradient-to-r from-white via-[hsl(316,100%,80%)] to-white bg-clip-text text-transparent">
            Build With Creativity
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 mb-12">
            Describe it. Build it. Launch it.
          </p>

          {/* Input Box */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(316,100%,53%)] to-[hsl(265,100%,59%)] rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative flex flex-col sm:flex-row gap-3 bg-white rounded-xl p-2 shadow-2xl">
                <Input
                  type="text"
                  placeholder="I want to build a..."
                  value={projectIdea}
                  onChange={(e) => setProjectIdea(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartBuilding()}
                  className="flex-1 border-0 bg-transparent text-base sm:text-lg px-4 py-3 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleStartBuilding}
                  className="bg-gradient-to-r from-[hsl(316,100%,53%)] to-[hsl(265,100%,59%)] hover:from-[hsl(316,100%,48%)] hover:to-[hsl(265,100%,54%)] text-white px-8 py-6 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  Start Building
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            <button
              onClick={() => setLocation('/templates')}
              className="mt-6 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              See Examples
            </button>
          </div>
        </div>
      </section>

      {/* Showcase Projects */}
      <section className="pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showcaseProjects.map((project) => {
              const Icon = project.icon;
              return (
                <Card
                  key={project.name}
                  onClick={() => setLocation('/projects')}
                  className="relative group cursor-pointer overflow-hidden bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 border-0"
                >
                  {/* Gradient Top Accent */}
                  <div className={`h-2 bg-gradient-to-r ${project.gradient}`}></div>
                  
                  {/* Card Content */}
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${project.gradient} bg-opacity-10`}>
                        <Icon className={`w-6 h-6 ${project.color}`} />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-2 font-heading">
                      {project.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      {project.description}
                    </p>
                    
                    {/* Preview Image Placeholder */}
                    <div className={`relative h-40 rounded-lg bg-gradient-to-br ${project.gradient} opacity-20 group-hover:opacity-30 transition-opacity`}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Code2 className="w-16 h-16 text-white/50" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none`}></div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(230,31%,6%)] border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/about" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/templates" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Templates
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/components" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Components
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/docs" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Community</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-[hsl(316,100%,53%)] text-sm transition-colors">
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
              © 2025 CodeMate Studio. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/60 hover:text-[hsl(316,100%,53%)] transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-[hsl(316,100%,53%)] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-[hsl(316,100%,53%)] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
