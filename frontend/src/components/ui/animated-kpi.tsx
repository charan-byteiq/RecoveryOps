import { useEffect, useState, useRef } from "react";
import { useScrollInView } from "@/hooks/use-scroll-in-view";

interface AnimatedKpiProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

/**
 * High-performance count-up component for dashboard KPI numbers.
 * Animates smoothly from 0 to target value using requestAnimationFrame with ease-out cubic easing.
 * Respects prefers-reduced-motion accessibility settings.
 */
export function AnimatedKpi({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1000,
  className = "",
}: AnimatedKpiProps) {
  const { ref, isInView } = useScrollInView({ threshold: 0.1, triggerOnce: false });
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    // Respect reduced-motion setting
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(value);
      return;
    }

    if (!isInView) {
      setDisplayValue(0);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;
    const diff = value - startValue;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: fast start, soft deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration, isInView]);

  const formattedNumber =
    decimals > 0
      ? displayValue.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(displayValue).toLocaleString();

  return (
    <span ref={ref as any} className={className}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
}
