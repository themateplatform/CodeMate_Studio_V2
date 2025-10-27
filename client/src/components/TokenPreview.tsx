/**
 * Design Token Preview
 * Shows tokens that will be used for generation
 */

import { useEffect, useState } from 'react';
import { designmateClient, DesignTokens } from '@/services/designmateClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TokenPreviewProps {
  appName: string;
}

export function TokenPreview({ appName }: TokenPreviewProps) {
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, [appName]);

  const loadTokens = async () => {
    setLoading(true);
    const fetchedTokens = await designmateClient.getTokensForApp(appName);
    setTokens(fetchedTokens);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Design Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokens) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Design Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No tokens available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Design Tokens for {appName}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-6">
            {/* Colors */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Colors</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(tokens.colors).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-border"
                      style={{ backgroundColor: value }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Typography</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">Sans Font: </span>
                  <span className="text-muted-foreground">{tokens.typography.fontFamily.sans}</span>
                </div>
                <div>
                  <span className="font-medium">Mono Font: </span>
                  <span className="text-muted-foreground">{tokens.typography.fontFamily.mono}</span>
                </div>
                <div className="mt-2">
                  <span className="font-medium">Font Sizes:</span>
                  <div className="ml-4 mt-1 space-y-1">
                    {Object.entries(tokens.typography.fontSize).map(([name, value]) => (
                      <div key={name}>
                        <span className="text-muted-foreground">{name}: {value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-medium">Font Weights:</span>
                  <div className="ml-4 mt-1 space-y-1">
                    {Object.entries(tokens.typography.fontWeight).map(([name, value]) => (
                      <div key={name}>
                        <span className="text-muted-foreground">{name}: {value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Spacing</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(tokens.spacing).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div
                      className="bg-primary rounded"
                      style={{ width: value, height: '1rem' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Border Radius</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(tokens.radius).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 bg-primary"
                      style={{ borderRadius: value }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shadows */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Shadows</h3>
              <div className="space-y-3">
                {Object.entries(tokens.shadow).map(([name, value]) => (
                  <div key={name}>
                    <p className="text-xs font-medium mb-1">{name}</p>
                    <div
                      className="w-full h-12 bg-card rounded"
                      style={{ boxShadow: value }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
