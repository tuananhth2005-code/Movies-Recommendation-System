import React, { useState } from 'react';

export default function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  placeholderClassName = '',
  ...props
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`.trim()}>
      <div
        className={`absolute inset-0 bg-[linear-gradient(135deg,var(--surface-container-high),var(--surface-container))] transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'} ${placeholderClassName}`.trim()}
      />
      <img
        {...props}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-all duration-500 ${loaded ? 'scale-100 blur-0 opacity-100' : 'scale-[1.03] blur-sm opacity-60'} ${className}`.trim()}
      />
    </div>
  );
}
