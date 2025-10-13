import { Heart, Target, Zap, Users, Github, Twitter, Linkedin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const values = [
  {
    icon: Zap,
    title: "Innovation First",
    description: "We push the boundaries of what's possible with AI-powered development tools."
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Built by developers, for developers. Your feedback shapes our roadmap."
  },
  {
    icon: Heart,
    title: "Developer Experience",
    description: "Every feature is designed to make your development workflow smoother and faster."
  },
  {
    icon: Target,
    title: "Quality & Reliability",
    description: "Enterprise-grade infrastructure with 99.9% uptime and comprehensive security."
  }
];

const team = [
  {
    name: "Engineering Team",
    role: "Building the future of development",
    description: "Our team of experienced engineers works on cutting-edge AI and collaboration features."
  },
  {
    name: "Design Team",
    role: "Crafting delightful experiences",
    description: "Creating intuitive interfaces that make complex development tasks feel simple."
  },
  {
    name: "Community Team",
    role: "Supporting our users",
    description: "Dedicated to helping you succeed with documentation, tutorials, and support."
  }
];

const stats = [
  { value: "10K+", label: "Active Developers" },
  { value: "50K+", label: "Projects Created" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4" variant="outline">
          About Us
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Building the Future of
          <br />
          Software Development
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          CodeMate Studio is an AI-powered development platform that transforms how teams build,
          collaborate, and ship software. From idea to production in minutes, not months.
        </p>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6 text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">Our Mission</h2>
          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <p className="text-lg md:text-xl text-center leading-relaxed">
              We believe that building software should be as simple as describing what you want.
              Our mission is to democratize software development by combining the power of AI
              with human creativity, making professional development accessible to everyone
              while empowering expert developers to work faster and smarter.
            </p>
          </Card>
        </div>
      </div>

      {/* Values */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Values</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <Card key={value.title} className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Team */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Meet Our Team</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {team.map((member) => (
            <Card key={member.name} className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
              <p className="text-sm text-primary mb-3">{member.role}</p>
              <p className="text-sm text-muted-foreground">{member.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Technology Stack */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Built with Modern Technology
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            We use cutting-edge technologies to deliver a fast, reliable, and scalable platform
          </p>
          <Card className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-4xl mb-2">⚛️</div>
                <div className="font-semibold">React</div>
                <div className="text-sm text-muted-foreground">Frontend</div>
              </div>
              <div>
                <div className="text-4xl mb-2">🟢</div>
                <div className="font-semibold">Node.js</div>
                <div className="text-sm text-muted-foreground">Backend</div>
              </div>
              <div>
                <div className="text-4xl mb-2">🐘</div>
                <div className="font-semibold">PostgreSQL</div>
                <div className="text-sm text-muted-foreground">Database</div>
              </div>
              <div>
                <div className="text-4xl mb-2">🤖</div>
                <div className="font-semibold">OpenAI</div>
                <div className="text-sm text-muted-foreground">AI Engine</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Journey</h2>
          <p className="text-muted-foreground mb-6">
            We're hiring! Help us build the future of software development.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-8">
            <Link href="/careers">
              <Button size="lg">View Open Positions</Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Get in Touch
              </Button>
            </Link>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="ghost" size="icon">
              <Github className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Twitter className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Linkedin className="h-5 w-5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
