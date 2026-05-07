import React, { useState } from 'react';
import { useImageCache } from '../../hooks/useImageCache';

interface ImageCacheProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  disableCompression?: boolean;
  cacheMaxWidth?: number;
  cacheQuality?: number;
  maxCacheSize?: number;
  cacheVariant?: string;
}

const ImageCacheComponent: React.FC<ImageCacheProps> = ({
  src,
  fallbackSrc,
  disableCompression = false,
  cacheMaxWidth,
  cacheQuality,
  maxCacheSize,
  cacheVariant,
  onError,
  ...props
}) => {
  const { imageSrc, loading } = useImageCache(src, fallbackSrc, disableCompression, {
    maxWidth: cacheMaxWidth,
    quality: cacheQuality,
    maxBlobSize: maxCacheSize,
    cacheVariant
  });
  const [hasError, setHasError] = useState(false);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log('[ImageCache] img-error', {
      originalSrc: src,
      renderedSrc: event.currentTarget.src,
      fallbackSrc,
      hasError,
      naturalWidth: event.currentTarget.naturalWidth,
      naturalHeight: event.currentTarget.naturalHeight
    });

    if (!hasError && fallbackSrc && event.currentTarget.src !== fallbackSrc) {
      setHasError(true);
    }
    if (onError) {
      onError(event);
    }
  };

  const displaySrc = hasError ? fallbackSrc || imageSrc : imageSrc;

  return (
    <img
      {...props}
      src={displaySrc || null}
      onLoad={(event) => {
        console.log('[ImageCache] img-load', {
          originalSrc: src,
          renderedSrc: event.currentTarget.src,
          naturalWidth: event.currentTarget.naturalWidth,
          naturalHeight: event.currentTarget.naturalHeight
        });
        props.onLoad?.(event);
      }}
      onError={handleError}
      style={{ opacity: loading ? 0.5 : 1, ...props.style }}
    />
  );
};

export const ImageCache = React.memo(ImageCacheComponent);
