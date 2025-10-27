import { useState, useEffect } from "react";
import { X, Download, Check, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt after some usage (3 visits or 1 day)
      const visits = parseInt(localStorage.getItem('pwa_visits') || '0');
      const firstVisit = localStorage.getItem('pwa_first_visit');
      
      if (!firstVisit) {
        localStorage.setItem('pwa_first_visit', Date.now().toString());
      }
      
      localStorage.setItem('pwa_visits', (visits + 1).toString());
      
      const daysSinceFirstVisit = firstVisit 
        ? (Date.now() - parseInt(firstVisit)) / (1000 * 60 * 60 * 24)
        : 0;
      
      if (visits >= 3 || daysSinceFirstVisit >= 1) {
        setTimeout(() => setShowPrompt(true), 5000); // Show after 5 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="p-6 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background to-secondary/10">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Install BuildMate Studio</h3>
            <p className="text-sm text-muted-foreground">
              Get the best experience with our app
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            <span>Works offline</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            <span>Faster load times</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            <span>Desktop & mobile access</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            <span>No app store required</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleInstall} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Install Now
          </Button>
          <Button onClick={handleDismiss} variant="outline">
            Later
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function PWAStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      )}
      {isInstalled && (
        <Badge variant="default" className="gap-1">
          <Check className="h-3 w-3" />
          Installed
        </Badge>
      )}
      {swReady && isOnline && (
        <Badge variant="outline" className="gap-1">
          <Wifi className="h-3 w-3" />
          Online
        </Badge>
      )}
    </div>
  );
}

export function NetworkStatusBadge() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
      <Badge variant="destructive" className="gap-2 px-4 py-2 shadow-lg">
        <WifiOff className="h-4 w-4" />
        You're offline - Some features may be limited
      </Badge>
    </div>
  );
}
