import React, { useState } from 'react';

/**
 * Interactive star rating with half-star (0.5) precision.
 *
 * Props:
 *  - value:     current score (0–5)
 *  - onChange:  (newScore) => void   — omit / pair with readonly for display-only
 *  - readonly:  disable interaction (default false)
 *  - size:      px size of each star (default 28 interactive, caller may shrink)
 */
export default function StarRating({ value = 0, onChange, readonly = false, size = 28 }) {
  const [hover, setHover] = useState(null);
  const display = hover != null ? hover : value;

  const handleClick = (e, index) => {
    if (readonly || !onChange) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - left < width / 2;
    onChange(index + (isLeftHalf ? 0.5 : 1));
  };

  const handleMove = (e, index) => {
    if (readonly) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - left < width / 2;
    setHover(index + (isLeftHalf ? 0.5 : 1));
  };

  return (
    <div
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
      role={readonly ? undefined : 'slider'}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={5}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.min(Math.max(display - index, 0), 1); // 0, 0.5, 1
        return (
          <span
            key={index}
            onClick={(e) => handleClick(e, index)}
            onMouseMove={(e) => handleMove(e, index)}
            className={`relative inline-block leading-none ${readonly ? '' : 'cursor-pointer'}`}
            style={{ width: size, height: size, fontSize: size }}
          >
            <span className="absolute inset-0 text-[var(--outline,#555)]">★</span>
            <span
              className="absolute inset-0 overflow-hidden text-[var(--primary,#f5c518)]"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}
