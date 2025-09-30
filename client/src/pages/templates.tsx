import { Package, Plus, Search, Filter, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const templateCategories = [
  { name: "React", count: 24, color: "bg-blue-500/20 text-blue-400" },
  { name: "Next.js", count: 18, color: "bg-gray-500/20 text-gray-400" },
  { name: "Vue", count: 15, color: "bg-green-500/20 text-green-400" },
  { name: "API", count: 12, color: "bg-purple-500/20 text-purple-400" }
];

const featuredTemplates = [
  {
    name: "React Starter Kit",
    description: "Modern React with TypeScript, Tailwind CSS, and Vite",
    category: "React",
    stars: 1543,
    downloads: "12k"
  },
  {
    name: "Next.js Fullstack",
    description: "Next.js 14 with App Router, API routes, and Tailwind",
    category: "Next.js", 
    stars: 892,
    downloads: "8.2k"
  },
  {
    name: "Express API Backend",
    description: "RESTful API with TypeScript, authentication, and PostgreSQL",
    category: "API",
    stars: 667,
    downloads: "5.1k"
  }
];

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground" data-testid="text-templates-title">
                Templates
              </h1>
              <p className="text-muted-foreground">
                Kickstart your projects with production-ready templates
              </p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search templates..." 
                className="pl-9 bg-secondary/50 border-border focus:border-primary"
                data-testid="input-search-templates"
              />
            </div>
            <Button variant="outline" className="subtle-hover" data-testid="button-filter">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button className="btn-primary" data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Categories */}
          <div className="flex gap-3 flex-wrap">
            {templateCategories.map((category) => (
              <Badge 
                key={category.name}
                variant="secondary" 
                className={`${category.color} subtle-hover cursor-pointer`}
                data-testid={`category-${category.name.toLowerCase()}`}
              >
                {category.name} ({category.count})
              </Badge>
            ))}
          </div>
        </div>

        {/* Featured Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-heading font-semibold mb-4 text-white">
            Featured Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((template) => (
              <Card 
                key={template.name} 
                className="glass subtle-hover cursor-pointer transition-all duration-200"
                data-testid={`template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-heading text-white">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{template.stars}</span>
                    </div>
                    <span>{template.downloads} downloads</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* All Templates Grid */}
        <div>
          <h2 className="text-xl font-heading font-semibold mb-4 text-white">
            All Templates
          </h2>
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">More templates coming soon!</p>
            <Button className="btn-primary hover-neon" data-testid="button-suggest-template">
              Suggest a Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}