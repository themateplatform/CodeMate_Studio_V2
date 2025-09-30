import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Code, Rocket, Zap, Database, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function DocsPage() {
  const [, setLocation] = useLocation();

  const sections = [
    {
      icon: Rocket,
      title: "Getting Started",
      description: "Learn the basics and create your first project",
      articles: ["Quick Start Guide", "Your First Project", "Understanding the Interface", "Basic Concepts"]
    },
    {
      icon: Code,
      title: "Development",
      description: "Build and customize your applications",
      articles: ["Code Editor Features", "Component Library", "Working with Templates", "Best Practices"]
    },
    {
      icon: Zap,
      title: "AI Assistant",
      description: "Leverage AI to build faster",
      articles: ["AI Commands", "Code Generation", "Smart Debugging", "AI Best Practices"]
    },
    {
      icon: Database,
      title: "Database & Backend",
      description: "Set up and manage your data",
      articles: ["Database Setup", "Supabase Integration", "API Routes", "Authentication"]
    },
    {
      icon: Settings,
      title: "Deployment",
      description: "Deploy your app to production",
      articles: ["Deployment Guide", "Custom Domains", "Environment Variables", "Monitoring"]
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
            Documentation
          </h1>
          <p className="text-white/90 text-xl max-w-2xl mx-auto">
            Everything you need to build amazing applications with CodeMate Studio
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto">
          <Button 
            variant="outline" 
            className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 h-auto py-4 flex flex-col gap-2"
            onClick={() => setLocation("/app-builder")}
          >
            <Rocket className="w-6 h-6" />
            <span>Quick Start</span>
          </Button>
          <Button 
            variant="outline" 
            className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 h-auto py-4 flex flex-col gap-2"
          >
            <Book className="w-6 h-6" />
            <span>API Reference</span>
          </Button>
          <Button 
            variant="outline" 
            className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 h-auto py-4 flex flex-col gap-2"
            onClick={() => setLocation("/templates")}
          >
            <Code className="w-6 h-6" />
            <span>Examples</span>
          </Button>
          <Button 
            variant="outline" 
            className="bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 h-auto py-4 flex flex-col gap-2"
          >
            <Zap className="w-6 h-6" />
            <span>Tutorials</span>
          </Button>
        </div>

        {/* Documentation Sections */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {sections.map((section) => (
            <Card key={section.title} className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-r from-[#FF0CB6] to-[#8A2EFF] rounded-lg">
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">{section.title}</CardTitle>
                </div>
                <CardDescription className="text-white/70">{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.articles.map((article) => (
                    <li key={article}>
                      <a href="#" className="text-white/90 hover:text-[#FF0CB6] transition-colors flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#FF0CB6] rounded-full" />
                        {article}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-20 text-center">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Need More Help?</CardTitle>
              <CardDescription className="text-white/80 text-base">
                Join our community or reach out to our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 justify-center">
              <Button className="bg-white text-[#8A2EFF] hover:bg-white/90">
                Join Discord
              </Button>
              <Button variant="outline" className="text-white border-white hover:bg-white/20">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
