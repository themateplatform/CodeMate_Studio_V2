import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

// Timeline operation types
export interface TimelineOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  userId: string;
  userName: string;
  userColor: string;
  userAvatar?: string;
  position: number;
  content?: string;
  length?: number;
  timestamp: number;
  clientId?: string;
}

export interface TimelineState {
  operations: TimelineOperation[];
  currentPosition: number;
  isPlaying: boolean;
  playbackSpeed: number;
  totalOperations: number;
}

interface TimelineScrubberProps {
  operations: TimelineOperation[];
  onSeek: (position: number) => void;
  onReplay: (operations: TimelineOperation[]) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

export function TimelineScrubber({
  operations,
  onSeek,
  onReplay,
  isVisible,
  onToggleVisibility,
  className = ''
}: TimelineScrubberProps) {
  const [state, setState] = useState<TimelineState>({
    operations: [],
    currentPosition: 0,
    isPlaying: false,
    playbackSpeed: 1,
    totalOperations: 0
  });

  const playbackRef = useRef<NodeJS.Timeout>();
  const [selectedOperation, setSelectedOperation] = useState<TimelineOperation | null>(null);
  const [groupedOperations, setGroupedOperations] = useState<TimelineOperation[][]>([]);

  // Update state when operations change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      operations,
      totalOperations: operations.length,
      currentPosition: Math.min(prev.currentPosition, operations.length)
    }));

    // Group operations by time proximity (within 1 second)
    const grouped: TimelineOperation[][] = [];
    let currentGroup: TimelineOperation[] = [];
    
    operations.forEach((op, index) => {
      if (currentGroup.length === 0) {
        currentGroup = [op];
      } else {
        const lastOp = currentGroup[currentGroup.length - 1];
        const timeDiff = op.timestamp - lastOp.timestamp;
        
        if (timeDiff <= 1000 && op.userId === lastOp.userId) {
          // Same user within 1 second - group together
          currentGroup.push(op);
        } else {
          // New group
          grouped.push([...currentGroup]);
          currentGroup = [op];
        }
      }
      
      if (index === operations.length - 1) {
        grouped.push([...currentGroup]);
      }
    });
    
    setGroupedOperations(grouped);
  }, [operations]);

  // Handle playback
  const startPlayback = useCallback(() => {
    if (state.currentPosition >= state.totalOperations) {
      setState(prev => ({ ...prev, currentPosition: 0 }));
    }

    setState(prev => ({ ...prev, isPlaying: true }));

    const playNext = () => {
      setState(prev => {
        if (prev.currentPosition >= prev.totalOperations) {
          return { ...prev, isPlaying: false };
        }

        const nextPosition = prev.currentPosition + 1;
        const operationsToReplay = prev.operations.slice(0, nextPosition);
        
        // Trigger replay with operations up to current position
        onReplay(operationsToReplay);
        onSeek(nextPosition);

        if (nextPosition < prev.totalOperations) {
          playbackRef.current = setTimeout(playNext, 1000 / prev.playbackSpeed);
        } else {
          return { ...prev, isPlaying: false, currentPosition: nextPosition };
        }

        return { ...prev, currentPosition: nextPosition };
      });
    };

    playNext();
  }, [state.currentPosition, state.totalOperations, state.playbackSpeed, onReplay, onSeek]);

  const pausePlayback = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
    }
  }, []);

  const seekToPosition = useCallback((position: number) => {
    pausePlayback();
    const clampedPosition = Math.max(0, Math.min(position, state.totalOperations));
    setState(prev => ({ ...prev, currentPosition: clampedPosition }));
    
    const operationsToReplay = state.operations.slice(0, clampedPosition);
    onReplay(operationsToReplay);
    onSeek(clampedPosition);
  }, [state.operations, state.totalOperations, onReplay, onSeek, pausePlayback]);

  const stepForward = useCallback(() => {
    seekToPosition(state.currentPosition + 1);
  }, [state.currentPosition, seekToPosition]);

  const stepBackward = useCallback(() => {
    seekToPosition(state.currentPosition - 1);
  }, [state.currentPosition, seekToPosition]);

  const resetToBeginning = useCallback(() => {
    seekToPosition(0);
  }, [seekToPosition]);

  const changePlaybackSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        clearTimeout(playbackRef.current);
      }
    };
  }, []);

  // Get operation summary text
  const getOperationSummary = (ops: TimelineOperation[]): string => {
    if (ops.length === 1) {
      const op = ops[0];
      switch (op.type) {
        case 'insert':
          return `Added "${op.content?.substring(0, 20)}${op.content && op.content.length > 20 ? '...' : ''}"`;
        case 'delete':
          return `Deleted ${op.length} characters`;
        case 'retain':
          return `Moved cursor to position ${op.position}`;
        default:
          return 'Unknown operation';
      }
    } else {
      const insertCount = ops.filter(op => op.type === 'insert').length;
      const deleteCount = ops.filter(op => op.type === 'delete').length;
      return `${insertCount} inserts, ${deleteCount} deletes`;
    }
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 ${className}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleVisibility}
                className="shadow-lg"
              >
                <Clock className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Show Timeline Scrubber</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className={`bg-background border border-border rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Edit Timeline</h3>
          <Badge variant="secondary" className="text-xs">
            {state.currentPosition} / {state.totalOperations}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </div>

      {/* Timeline Controls */}
      <div className="p-3 space-y-3">
        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToBeginning}
                    disabled={state.currentPosition === 0}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset to beginning</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stepBackward}
                    disabled={state.currentPosition === 0}
                  >
                    <SkipBack className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Step backward</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              onClick={state.isPlaying ? pausePlayback : startPlayback}
              disabled={state.totalOperations === 0}
            >
              {state.isPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stepForward}
                    disabled={state.currentPosition >= state.totalOperations}
                  >
                    <SkipForward className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Step forward</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Speed:</span>
            <select
              value={state.playbackSpeed}
              onChange={(e) => changePlaybackSpeed(Number(e.target.value))}
              className="text-xs bg-background border border-border rounded px-1 py-0.5"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>

        {/* Timeline Slider */}
        {state.totalOperations > 0 && (
          <div className="space-y-2">
            <Slider
              value={[state.currentPosition]}
              onValueChange={(value) => seekToPosition(value[0])}
              max={state.totalOperations}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Start</span>
              <span>
                {state.currentPosition > 0 && state.operations[state.currentPosition - 1] && 
                  formatDistanceToNow(new Date(state.operations[state.currentPosition - 1].timestamp), { addSuffix: true })
                }
              </span>
              <span>Current</span>
            </div>
          </div>
        )}
      </div>

      {/* Operations List */}
      {groupedOperations.length > 0 && (
        <div className="border-t border-border">
          <div className="p-2">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Changes</h4>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {groupedOperations.slice(-10).reverse().map((group, groupIndex) => {
                  const firstOp = group[0];
                  const isCurrentGroup = state.currentPosition > 0 && 
                    state.operations[state.currentPosition - 1]?.id === group[group.length - 1].id;
                  
                  return (
                    <div
                      key={`group-${groupIndex}`}
                      className={`flex items-start space-x-2 p-2 rounded text-xs cursor-pointer hover:bg-muted ${
                        isCurrentGroup ? 'bg-primary/10 border border-primary/20' : ''
                      }`}
                      onClick={() => {
                        const operationIndex = state.operations.findIndex(op => op.id === firstOp.id);
                        if (operationIndex !== -1) {
                          seekToPosition(operationIndex + group.length);
                        }
                      }}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={firstOp.userAvatar} alt={firstOp.userName} />
                        <AvatarFallback 
                          className="text-xs"
                          style={{ backgroundColor: firstOp.userColor + '20', color: firstOp.userColor }}
                        >
                          {firstOp.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{firstOp.userName}</div>
                        <div className="text-muted-foreground truncate">
                          {getOperationSummary(group)}
                        </div>
                        <div className="text-muted-foreground">
                          {formatDistanceToNow(new Date(firstOp.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {state.totalOperations === 0 && (
        <div className="p-4 text-center text-muted-foreground text-sm">
          No edit history available
        </div>
      )}
    </div>
  );
}

export default TimelineScrubber;