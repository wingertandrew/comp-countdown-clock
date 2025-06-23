import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface HoldButtonProps {
  onHoldComplete: () => void;
  holdTime?: number;
  className?: string;
  children: React.ReactNode;
}

const HoldButton: React.FC<HoldButtonProps> = ({
  onHoldComplete,
  holdTime = 2000,
  className,
  children
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setProgress(0);
  };

  const startHold = () => {
    clearTimers();
    setProgress(0);
    const interval = 100;
    progressRef.current = setInterval(() => {
      setProgress((prev) => Math.min(100, prev + (100 * interval) / holdTime));
    }, interval);
    timerRef.current = setTimeout(() => {
      clearTimers();
      onHoldComplete();
    }, holdTime);
  };

  return (
    <Button
      className={cn('relative overflow-hidden', className)}
      onMouseDown={startHold}
      onMouseUp={clearTimers}
      onMouseLeave={clearTimers}
      onTouchStart={startHold}
      onTouchEnd={clearTimers}
    >
      {children}
      {progress > 0 && (
        <Progress
          value={progress}
          className="absolute bottom-0 left-0 h-1 w-full bg-gray-700"
        />
      )}
    </Button>
  );
};

export default HoldButton;
