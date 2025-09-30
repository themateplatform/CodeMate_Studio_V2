/**
 * PWA Status Indicator Component
 * Shows online/offline status and update availability
 */

import { useState } from 'react';
import { usePWA, useNetworkStatus, useCache } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  Trash2, 
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import { formatBytes } from '@/lib/pwa';

export function PWAStatusIndicator() {
  const { updateAvailable, isUpdating, applyUpdate, serviceWorkerReady } = usePWA();
  const { isOnline } = useNetworkStatus();
  const { size, count, isClearing, clearCache } = useCache();
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (updateAvailable) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (updateAvailable) return 'Update Available';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (updateAvailable) return <Download className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2"
          data-testid="button-pwa-status"
        >
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          {getStatusIcon()}
          <span className="hidden sm:inline">{getStatusText()}</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">App Status</CardTitle>
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <CardDescription>
              Progressive Web App capabilities and status
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              {isOnline ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">Network Connection</p>
                <p className="text-sm text-muted-foreground">
                  {isOnline ? 'Connected to internet' : 'Working offline'}
                </p>
              </div>
            </div>

            {/* Service Worker Status */}
            <div className="flex items-center gap-3">
              {serviceWorkerReady ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">Service Worker</p>
                <p className="text-sm text-muted-foreground">
                  {serviceWorkerReady ? 'Active and ready' : 'Loading...'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Update Section */}
            {updateAvailable && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">Update Available</p>
                    <p className="text-sm text-muted-foreground">
                      A new version is ready to install
                    </p>
                  </div>
                </div>
                <Button
                  onClick={applyUpdate}
                  disabled={isUpdating}
                  className="w-full"
                  data-testid="button-apply-update"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Install Update
                    </>
                  )}
                </Button>
                <Separator />
              </div>
            )}

            {/* Cache Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-purple-500" />
                <div className="flex-1">
                  <p className="font-medium">Cache Storage</p>
                  <p className="text-sm text-muted-foreground">
                    {count} cached items using {formatBytes(size)}
                  </p>
                </div>
              </div>
              
              {size > 0 && (
                <Button
                  variant="outline"
                  onClick={clearCache}
                  disabled={isClearing}
                  className="w-full"
                  data-testid="button-clear-cache"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cache
                    </>
                  )}
                </Button>
              )}
            </div>

            <Separator />

            {/* PWA Capabilities */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <p className="font-medium text-sm">PWA Features</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Offline Ready</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Background Sync</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Push Notifications</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Auto Updates</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Simple network status indicator
 */
export function NetworkStatusBadge() {
  const { isOnline } = useNetworkStatus();

  return (
    <Badge 
      variant={isOnline ? 'default' : 'destructive'}
      className="gap-1"
      data-testid="badge-network-status"
    >
      {isOnline ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
}