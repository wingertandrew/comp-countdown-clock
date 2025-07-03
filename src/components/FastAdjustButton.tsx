
import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FastAdjustButtonProps {
  onAdjust: (amount: number) => void;
  adjustAmount: number;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

const FastAdjustButton: React.FC<FastAdjustButtonProps> = ({
  onAdjust,
  adjustAmount,
  className,
  children,
  disabled = false
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const hasTriggeredHold = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsHolding(false);
    hasTriggeredHold.current = false;
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;
    
    hasTriggeredHold.current = false;
    setIsHolding(true);
    
    // Start hold detection after 300ms
    timerRef.current = setTimeout(() => {
      hasTriggeredHold.current = true;
      // First adjustment happens when hold is detected
      onAdjust(adjustAmount);
      
      // Start fast repeat every 150ms
      intervalRef.current = setInterval(() => {
        onAdjust(adjustAmount);
      }, 150);
    }, 300);
  }, [disabled, onAdjust, adjustAmount]);

  const endHold = useCallback(() => {
    clearTimers();
    
    // If we haven't triggered a hold, this was a single press
    if (!hasTriggeredHold.current) {
      onAdjust(adjustAmount);
    }
  }, [clearTimers, onAdjust, adjustAmount]);

  return (
    <Button
      className={cn('select-none', className)}
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={clearTimers}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      style={{ 
        backgroundColor: isHolding ? 'rgba(156, 163, 175, 0.8)' : undefined 
      }}
    >
      {children}
    </Button>
  );
};

export default FastAdjustButton;
