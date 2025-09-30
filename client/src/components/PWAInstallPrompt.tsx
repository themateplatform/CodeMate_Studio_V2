/**
 * PWA Installation Prompt Component
 * Shows a beautiful installation prompt for PWA capabilities
 */

import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, X, Check, Loader2 } from 'lucide-react';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  className?: string;
}

export function PWAInstallPrompt({ onDismiss, className }: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, isInstalling, promptInstall } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      onDismiss?.();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Install CodeMate Studio</CardTitle>
              <Badge variant="secondary" className="text-xs">
                Progressive Web App
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <CardDescription className="mb-4">
          Install CodeMate Studio for a better experience with offline capabilities, 
          faster loading, and native-like performance.
        </CardDescription>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            <span>Faster loading</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            <span>Desktop shortcuts</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            <span>Background sync</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-2">
        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          className="flex-1"
          data-testid="button-install-pwa"
        >
          {isInstalling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Install App
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDismiss}
          disabled={isInstalling}
          data-testid="button-dismiss-install"
        >
          Not Now
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Compact PWA install button for toolbar/header
 */
export function PWAInstallButton() {
  const { isInstallable, isInstalled, isInstalling, promptInstall } = usePWA();

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={promptInstall}
      disabled={isInstalling}
      className="gap-2"
      data-testid="button-pwa-install-compact"
    >
      {isInstalling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {isInstalling ? 'Installing...' : 'Install App'}
    </Button>
  );
}