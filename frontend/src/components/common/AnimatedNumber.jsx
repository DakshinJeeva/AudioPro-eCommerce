import React, { useEffect, useRef, useState } from "react";

export default function AnimatedNumber({
  value = 0,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  const toRef = useRef(value);

  useEffect(() => {
    fromRef.current = display;
    toRef.current = value;
    startRef.current = null;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    let raf;
    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = easeOutCubic(progress);
      const current = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = `${prefix}${display.toFixed(decimals)}${suffix}`;

  return <span className={className}>{formatted}</span>;
}
