
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
  holdTime = 1000, // Changed from 2000 to 1000 (1 second)
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
    const interval = 50; // Smoother progress updates
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
        <div className="absolute inset-0 bg-black bg-opacity-20 rounded-inherit">
          <div 
            className="h-full bg-white bg-opacity-30 transition-all duration-75 ease-out rounded-inherit"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Button>
  );
};

export default HoldButton;
