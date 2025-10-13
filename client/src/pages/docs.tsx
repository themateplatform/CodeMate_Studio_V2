import { useState } from "react";
import { Book, Code, Rocket, Settings, Github, Zap, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const docSections = [
  {
    title: "Getting Started",
    icon: Rocket,
    articles: [
      { title: "Quick Start Guide", slug: "quickstart", time: "5 min" },
      { title: "Creating Your First Project", slug: "first-project", time: "10 min" },
      { title: "Understanding the Interface", slug: "interface", time: "8 min" },
      { title: "Authentication & Setup", slug: "auth-setup", time: "5 min" }
    ]
  },
  {
    title: "Core Features",
    icon: Zap,
    articles: [
      { title: "AI Code Generation", slug: "ai-generation", time: "15 min" },
      { title: "Real-time Collaboration", slug: "collaboration", time: "12 min" },
      { title: "Project Templates", slug: "templates", time: "10 min" },
      { title: "Spec Editor", slug: "spec-editor", time: "20 min" }
    ]
  },
  {
    title: "Development",
    icon: Code,
    articles: [
      { title: "Local Development Setup", slug: "local-dev", time: "15 min" },
      { title: "Environment Variables", slug: "env-vars", time: "8 min" },
      { title: "Database Schema", slug: "database", time: "12 min" },
      { title: "API Reference", slug: "api-reference", time: "25 min" }
    ]
  },
  {
    title: "GitHub Integration",
    icon: Github,
    articles: [
      { title: "Connecting GitHub", slug: "github-setup", time: "10 min" },
      { title: "Repository Sync", slug: "repo-sync", time: "12 min" },
      { title: "CI/CD Pipelines", slug: "cicd", time: "18 min" },
      { title: "Deployment Workflows", slug: "deployment", time: "15 min" }
    ]
  },
  {
    title: "Configuration",
    icon: Settings,
    articles: [
      { title: "Project Settings", slug: "project-settings", time: "10 min" },
      { title: "Team Management", slug: "team-management", time: "12 min" },
      { title: "Security & Permissions", slug: "security", time: "15 min" },
      { title: "Custom Domains", slug: "custom-domains", time: "8 min" }
    ]
  },
  {
    title: "Advanced",
    icon: Book,
    articles: [
      { title: "PWA Configuration", slug: "pwa", time: "20 min" },
      { title: "Mobile App Setup", slug: "mobile", time: "25 min" },
      { title: "Custom Templates", slug: "custom-templates", time: "30 min" },
      { title: "API Extensions", slug: "api-extensions", time: "35 min" }
    ]
  }
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = docSections.map(section => ({
    ...section,
    articles: section.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.articles.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Documentation</h1>
            </div>
            <Link href="/">
              <Button variant="ghost">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* Quick Links */}
        {!searchQuery && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 hover:shadow-lg transition-shadow border-primary/20">
              <Rocket className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Quick Start</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Get up and running in 5 minutes
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Start Tutorial
              </Button>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow border-primary/20">
              <Code className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">API Reference</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Complete API documentation
              </p>
              <Button variant="outline" size="sm" className="w-full">
                View API Docs
              </Button>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow border-primary/20">
              <Github className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-2">Examples</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Sample projects and code
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Browse Examples
              </Button>
            </Card>
          </div>
        )}

        {/* Documentation Sections */}
        <div className="space-y-12">
          {filteredSections.length > 0 ? (
            filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">{section.title}</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {section.articles.map((article) => (
                      <Card
                        key={article.slug}
                        className="p-5 hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {article.title}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {article.time}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Learn about {article.title.toLowerCase()}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No documentation found for "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-16">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 text-center">
            <h2 className="text-2xl font-bold mb-3">Need More Help?</h2>
            <p className="text-muted-foreground mb-6">
              Can't find what you're looking for? Our community and support team are here to help.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button>Join Community</Button>
              <Button variant="outline">Contact Support</Button>
              <Link href="/tutorials">
                <Button variant="ghost">Video Tutorials</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
