import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';


export default function TrailerModal({ trailerId, title, onClose }) {
  const overlayRef = useRef(null);

  
  const handleKeyDown = useCallback(
    (e) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);


  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const renderModal = (content) => createPortal(content, document.body);

  if (!trailerId) {
    return renderModal(
      <div className="trailer-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
        <div className="trailer-modal">
          <div className="trailer-modal__header">
            <span className="trailer-modal__title">{title}</span>
            <button className="trailer-modal__close btn btn-icon" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="trailer-modal__no-trailer">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-[var(--primary)]">
              ▶
            </div>
            <p className="text-center text-lg text-[var(--on-surface-variant)]">
              Trailer not available for this movie.
            </p>
          </div>
        </div>
      </div>
    );
  }

  
  const embedUrl =
    `https://www.youtube.com/embed/${trailerId}` +
    `?autoplay=1&rel=0&modestbranding=1&color=white`;

  return renderModal(
    <div
      className="trailer-modal-overlay fade-in"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className="trailer-modal slide-up">
        {/* Header */}
        <div className="trailer-modal__header">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-sm font-bold text-black">▶</span>
            <span className="trailer-modal__title">{title}</span>
          </div>
          <button
            className="trailer-modal__close btn btn-icon"
            onClick={onClose}
            aria-label="Close trailer"
          >
            ✕
          </button>
        </div>

        {/* YouTube Player */}
        <div className="trailer-modal__player-wrap">
          <iframe
            className="trailer-modal__iframe"
            src={embedUrl}
            title={`${title} – Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Footer hint */}
        <div className="trailer-modal__footer">
          <span className="text-xs text-[var(--on-surface-variant)]">
            Press <kbd className="rounded border border-[var(--outline-variant)] bg-[var(--surface-container-high)] px-1.5 py-px text-[0.7rem]">Esc</kbd> or click outside to close
          </span>
        </div>
      </div>
    </div>
  );
}
