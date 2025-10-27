/**
 * Target App Selector
 * Choose which app's design tokens to use
 */

import { useEffect, useState } from 'react';
import { designmateClient } from '@/lib/designmateClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface AppSelectorProps {
  value: string;
  onChange: (app: string) => void;
}

export function AppSelector({ value, onChange }: AppSelectorProps) {
  const [apps, setApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    const availableApps = await designmateClient.getAvailableApps();
    setApps(availableApps);
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="app-selector">Target App Design System</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger id="app-selector">
          <SelectValue placeholder="Select an app" />
        </SelectTrigger>
        <SelectContent>
          {apps.map(app => (
            <SelectItem key={app} value={app}>
              {app.charAt(0).toUpperCase() + app.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Generated code will use this app's design tokens
      </p>
    </div>
  );
}
