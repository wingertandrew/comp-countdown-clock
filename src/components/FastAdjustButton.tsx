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
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;
    
    // First adjustment happens immediately
    onAdjust(adjustAmount);
    setIsHolding(true);
    
    // Start fast repeat after 500ms
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onAdjust(adjustAmount);
      }, 100); // Fast repeat every 100ms
    }, 500);
  }, [disabled, onAdjust, adjustAmount]);

  return (
    <Button
      className={cn('select-none', className)}
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={clearTimers}
      onMouseLeave={clearTimers}
      onTouchStart={startHold}
      onTouchEnd={clearTimers}
      style={{ 
        backgroundColor: isHolding ? 'rgba(156, 163, 175, 0.8)' : undefined 
      }}
    >
      {children}
    </Button>
  );
};

export default FastAdjustButton;