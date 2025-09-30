import { Palette, Plus, Search, Filter, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const componentCategories = [
  { name: "UI", count: 48, color: "bg-pink-500/20 text-pink-400" },
  { name: "Forms", count: 24, color: "bg-blue-500/20 text-blue-400" },
  { name: "Navigation", count: 18, color: "bg-green-500/20 text-green-400" },
  { name: "Data", count: 15, color: "bg-purple-500/20 text-purple-400" }
];

const featuredComponents = [
  {
    name: "Neon Button",
    description: "Interactive button with customizable neon glow effects",
    category: "UI",
    downloads: "8.4k",
    preview: "bg-gradient-to-r from-neon-pink to-electric-purple"
  },
  {
    name: "Glassmorphism Card",
    description: "Modern glass-effect card with backdrop blur and borders",
    category: "UI",
    downloads: "6.2k", 
    preview: "glass"
  },
  {
    name: "Animated Form",
    description: "Form with smooth animations and validation feedback",
    category: "Forms",
    downloads: "4.7k",
    preview: "bg-secondary/50 border border-border"
  }
];

export default function ComponentsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground" data-testid="text-components-title">
                Components
              </h1>
              <p className="text-muted-foreground">
                Beautiful, reusable components for your creative projects
              </p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search components..." 
                className="pl-9 bg-secondary/50 border-border focus:border-accent"
                data-testid="input-search-components"
              />
            </div>
            <Button variant="outline" className="subtle-hover" data-testid="button-filter-components">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button className="btn-secondary" data-testid="button-create-component">
              <Plus className="w-4 h-4 mr-2" />
              Create Component
            </Button>
          </div>

          {/* Categories */}
          <div className="flex gap-3 flex-wrap">
            {componentCategories.map((category) => (
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

        {/* Featured Components */}
        <div className="mb-8">
          <h2 className="text-xl font-heading font-semibold mb-4 text-white">
            Featured Components
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredComponents.map((component) => (
              <Card 
                key={component.name} 
                className="glass subtle-hover cursor-pointer transition-all duration-200"
                data-testid={`component-${component.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-heading text-white">
                        {component.name}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {component.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {component.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Component Preview */}
                  <div className={`h-16 rounded-lg mb-4 ${component.preview} flex items-center justify-center`}>
                    <span className="text-xs text-white/80">Preview</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {component.downloads} downloads
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover-neon-purple">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover-neon-purple">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Component Library */}
        <div>
          <h2 className="text-xl font-heading font-semibold mb-4 text-white">
            Component Library
          </h2>
          <div className="text-center py-12">
            <Palette className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Building our component library!</p>
            <Button className="btn-secondary hover-neon-purple" data-testid="button-contribute-component">
              Contribute Components
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}