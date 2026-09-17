import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  PUBLIC_IMAGE_FALLBACK,
  resolvePublicImageUrl,
} from "../../lib/public-image.js";

export interface PublicImageCarouselProps {
  images: (string | null | undefined)[];
  label: string;
  heading: string;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function PublicImageCarousel({
  images,
  label,
  heading,
}: PublicImageCarouselProps) {
  const resolvedImages = images.map(resolvePublicImageUrl);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const id = useId().replaceAll(":", "");
  const headingId = `${id}-heading`;
  const dialogTitleId = `${id}-dialog-title`;

  useEffect(() => {
    setActiveIndex((index) =>
      resolvedImages.length === 0
        ? 0
        : Math.min(index, resolvedImages.length - 1),
    );
  }, [resolvedImages.length]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsLightboxOpen(false);
        return;
      }

      if (event.key === "ArrowLeft" && resolvedImages.length > 1) {
        event.preventDefault();
        setActiveIndex((index) =>
          index === 0 ? resolvedImages.length - 1 : index - 1,
        );
        return;
      }

      if (event.key === "ArrowRight" && resolvedImages.length > 1) {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % resolvedImages.length);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = focusableElements(dialogRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [isLightboxOpen, resolvedImages.length]);

  if (resolvedImages.length === 0) return null;

  const hasNavigation = resolvedImages.length > 1;
  const activeImage = resolvedImages[activeIndex] ?? resolvedImages[0];

  const selectImage = (index: number) => setActiveIndex(index);
  const showPrevious = () =>
    setActiveIndex((index) =>
      index === 0 ? resolvedImages.length - 1 : index - 1,
    );
  const showNext = () =>
    setActiveIndex((index) => (index + 1) % resolvedImages.length);
  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PUBLIC_IMAGE_FALLBACK;
  };
  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setIsLightboxOpen(false);
  };
  const handleMainImageKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowLeft" && hasNavigation) {
      event.preventDefault();
      showPrevious();
    }
    if (event.key === "ArrowRight" && hasNavigation) {
      event.preventDefault();
      showNext();
    }
  };

  return (
    <section
      className="public-image-carousel"
      aria-labelledby={headingId}
      data-testid="public-image-carousel"
    >
      <h2 id={headingId} className="public-image-carousel__heading">
        {heading}
      </h2>
      <div className="public-image-carousel__frame">
        <button
          ref={triggerRef}
          type="button"
          className="public-image-carousel__image-trigger"
          aria-label={`Ampliar imagen ${activeIndex + 1} de ${resolvedImages.length} de ${label}`}
          onClick={() => setIsLightboxOpen(true)}
          onKeyDown={handleMainImageKeyDown}
        >
          <img
            src={activeImage}
            alt=""
            onError={handleImageError}
            decoding="async"
          />
          <span className="public-image-carousel__expand-hint" aria-hidden="true">
            <Maximize2 />
          </span>
        </button>
      </div>

      <div className="public-image-carousel__toolbar">
        {hasNavigation ? (
          <button
            type="button"
            className="public-image-carousel__control"
            aria-label="Imagen anterior"
            onClick={showPrevious}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <p className="public-image-carousel__counter" aria-live="polite">
          <span className="sr-only">Imagen </span>
          {activeIndex + 1} <span aria-hidden="true">/</span>{" "}
          <span className="sr-only"> de </span>
          {resolvedImages.length}
        </p>
        {hasNavigation ? (
          <button
            type="button"
            className="public-image-carousel__control"
            aria-label="Imagen siguiente"
            onClick={showNext}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      <ul
        className="public-image-carousel__thumbnails"
        aria-label={`Seleccionar imagen de ${label}`}
      >
        {resolvedImages.map((image, index) => (
          <li key={`${image}-${index}`}>
            <button
              type="button"
              className={`public-image-carousel__thumbnail${index === activeIndex ? " is-active" : ""}`}
              aria-label={`Ver imagen ${index + 1} de ${resolvedImages.length} de ${label}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => selectImage(index)}
            >
              <img
                src={image}
                alt=""
                loading="lazy"
                decoding="async"
                onError={handleImageError}
              />
            </button>
          </li>
        ))}
      </ul>

      {isLightboxOpen && (
        <div
          ref={dialogRef}
          className="public-image-carousel__lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          onClick={handleBackdropClick}
        >
          <div className="public-image-carousel__lightbox-content">
            <h2 id={dialogTitleId} className="sr-only">
              Imagen {activeIndex + 1} de {resolvedImages.length} de {label}
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="public-image-carousel__lightbox-close"
              aria-label="Cerrar imagen ampliada"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
            {hasNavigation && (
              <button
                type="button"
                className="public-image-carousel__lightbox-control public-image-carousel__lightbox-control--previous"
                aria-label="Imagen anterior"
                onClick={showPrevious}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            )}
            <img
              className="public-image-carousel__lightbox-image"
              src={activeImage}
              alt=""
              onError={handleImageError}
            />
            {hasNavigation && (
              <button
                type="button"
                className="public-image-carousel__lightbox-control public-image-carousel__lightbox-control--next"
                aria-label="Imagen siguiente"
                onClick={showNext}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            )}
            <p className="public-image-carousel__lightbox-counter" aria-live="polite">
              Imagen {activeIndex + 1} de {resolvedImages.length}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default PublicImageCarousel;
