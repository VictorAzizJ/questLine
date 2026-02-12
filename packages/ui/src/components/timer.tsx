import * as React from "react";
import { cn } from "../lib/utils";

interface TimerProps extends React.HTMLAttributes<HTMLDivElement> {
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  size?: "sm" | "md" | "lg";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getTimerColor(percentage: number): string {
  if (percentage > 50) return "text-cyan-300";
  if (percentage > 25) return "text-amber-300";
  if (percentage > 10) return "text-orange-400";
  return "text-red-400";
}

const Timer = React.forwardRef<HTMLDivElement, TimerProps>(
  ({ remainingSeconds, totalSeconds, isRunning, size = "md", className, ...props }, ref) => {
    const percentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
    const colorClass = getTimerColor(percentage);

    const sizeClasses = {
      sm: "text-2xl",
      md: "text-4xl",
      lg: "text-6xl",
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center", className)}
        {...props}
      >
        <div
          className={cn(
            "font-mono font-bold tabular-nums drop-shadow-[0_0_12px_hsl(32_90%_52%/.4)]",
            sizeClasses[size],
            colorClass,
            !isRunning && "opacity-60"
          )}
        >
          {formatTime(remainingSeconds)}
        </div>
        <div className="bg-secondary/70 border-border/60 mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full border">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              percentage > 50 && "bg-cyan-400",
              percentage <= 50 && percentage > 25 && "bg-amber-400",
              percentage <= 25 && percentage > 10 && "bg-orange-500",
              percentage <= 10 && "bg-red-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Timer.displayName = "Timer";

export { Timer };
