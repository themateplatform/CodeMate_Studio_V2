import { Rocket, Globe, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DeployPage() {
  return (
    <div className="h-full bg-background p-6 overflow-auto">
      <div className="max-w-5xl mx-auto fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Deploy & Scale</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Deploy your applications instantly with our global infrastructure. One-click deployments, auto-scaling, and enterprise-grade security.
          </p>
        </div>

        {/* Deployment Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="glass border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                  Instant
                </Badge>
              </div>
              <CardTitle className="text-xl">One-Click Deploy</CardTitle>
              <CardDescription className="text-base">
                Deploy your applications to production in seconds with automatic builds and optimizations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Automatic SSL certificates</li>
                <li>• CDN optimization</li>
                <li>• Environment variables</li>
                <li>• Custom domains</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-accent" />
                </div>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  Global
                </Badge>
              </div>
              <CardTitle className="text-xl">Edge Network</CardTitle>
              <CardDescription className="text-base">
                Deploy to our global edge network for lightning-fast performance worldwide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 50+ global regions</li>
                <li>• Auto-scaling</li>
                <li>• Load balancing</li>
                <li>• 99.99% uptime SLA</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Quick Deploy */}
        <Card className="glass border-primary/20 bg-primary/5">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Enterprise-Ready</CardTitle>
            <CardDescription className="text-base">
              Production deployments with enterprise security and monitoring built-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div>
                <div className="text-2xl font-bold text-primary">99.99%</div>
                <div className="text-xs text-muted-foreground">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">&lt;100ms</div>
                <div className="text-xs text-muted-foreground">Response</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">50+</div>
                <div className="text-xs text-muted-foreground">Regions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">SOC2</div>
                <div className="text-xs text-muted-foreground">Certified</div>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Rocket className="w-4 h-4" />
              Coming Soon
            </div>
            <div className="space-y-3">
              <Button className="btn-primary w-full" data-testid="button-deploy-project">
                Deploy Current Project
              </Button>
              <p className="text-sm text-muted-foreground">
                One-click deployment will be available soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}