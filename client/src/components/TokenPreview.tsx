/**
 * Design Token Preview
 * Shows tokens that will be used for generation
 */

import { useEffect, useState } from 'react';
import { designmateClient, DesignTokens } from '@/lib/designmateClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    return <div className="text-sm text-muted-foreground">Loading design tokens...</div>;
  }

  if (!tokens) {
    return <div className="text-sm text-muted-foreground">No tokens available</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Design Tokens for {appName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Colors */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Colors</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(tokens.colors).map(([name, value]) => (
              <div key={name} className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded border" 
                  style={{ backgroundColor: value }}
                />
                <span className="text-xs">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Typography</h4>
          <div className="text-xs space-y-1">
            <div>Font: {tokens.typography.fontFamily.sans}</div>
            <div>Base size: {tokens.typography.fontSize.base}</div>
          </div>
        </div>

        {/* Spacing */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Spacing</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(tokens.spacing).map(([name, value]) => (
              <div key={name} className="flex items-center gap-2">
                <div 
                  className="h-4 bg-primary/20 border"
                  style={{ width: value }}
                />
                <span className="text-xs">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
