import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";

export default function ImageLightbox({ images = [], initialIndex = 0, onClose }) {
  const safeImages = useMemo(
    () => images.filter((image) => image?.src || image?.url || image),
    [images]
  );
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setIndex(initialIndex);
    setZoom(1);
  }, [initialIndex]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!safeImages.length) return null;

  const current = safeImages[Math.min(index, safeImages.length - 1)];
  const src = current.src || current.url || current;
  const label = current.name || `Imagem ${index + 1}`;
  const hasMany = safeImages.length > 1;

  function previous() {
    setIndex((currentIndex) =>
      currentIndex === 0 ? safeImages.length - 1 : currentIndex - 1
    );
    setZoom(1);
  }

  function next() {
    setIndex((currentIndex) =>
      currentIndex === safeImages.length - 1 ? 0 : currentIndex + 1
    );
    setZoom(1);
  }

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Visualização da imagem">
      <button type="button" className="image-lightbox-backdrop" onClick={onClose} aria-label="Fechar visualização" />

      <div className="image-lightbox-panel">
        <div className="image-lightbox-toolbar">
          <div>
            <strong>{label}</strong>
            <span>
              {index + 1} de {safeImages.length}
            </span>
          </div>
          <div className="image-lightbox-actions">
            <button
              type="button"
              className="secondary small"
              onClick={() => setZoom((currentZoom) => Math.max(1, currentZoom - 0.25))}
              disabled={zoom <= 1}
              title="Diminuir zoom"
            >
              <Icon name="zoomOut" />
            </button>
            <button
              type="button"
              className="secondary small"
              onClick={() => setZoom((currentZoom) => Math.min(3, currentZoom + 0.25))}
              disabled={zoom >= 3}
              title="Aumentar zoom"
            >
              <Icon name="zoomIn" />
            </button>
            <button type="button" className="ghost small" onClick={onClose} title="Fechar">
              <Icon name="x" />
            </button>
          </div>
        </div>

        <div className="image-lightbox-stage">
          {hasMany && (
            <button
              type="button"
              className="image-lightbox-nav previous"
              onClick={previous}
              aria-label="Imagem anterior"
            >
              <Icon name="chevronLeft" />
            </button>
          )}

          <div className="image-lightbox-scroll">
            <img
              src={src}
              alt={label}
              style={{ transform: `scale(${zoom})` }}
            />
          </div>

          {hasMany && (
            <button
              type="button"
              className="image-lightbox-nav next"
              onClick={next}
              aria-label="Próxima imagem"
            >
              <Icon name="chevronRight" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
