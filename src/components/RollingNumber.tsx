import React, { useEffect, useState } from 'react';

interface Props {
  value: number;
  className?: string;
}

export const RollingNumber: React.FC<Props> = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value === displayValue) return;

    const duration = 400; // ms
    const startTime = performance.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * ease);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span className={`inline-block transition-transform duration-200 ${className}`}>{displayValue}</span>;
};
