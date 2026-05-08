import React, { useState } from 'react';
import { useImageCache } from '../../hooks/useImageCache';
import { sanitizeImageUrl } from '../../utils/imageUrl';

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
  const cleanSrc = sanitizeImageUrl(src);
  const cleanFallbackSrc = sanitizeImageUrl(fallbackSrc) || fallbackSrc;
  const { imageSrc, loading } = useImageCache(cleanSrc, cleanFallbackSrc, disableCompression, {
    maxWidth: cacheMaxWidth,
    quality: cacheQuality,
    maxBlobSize: maxCacheSize,
    cacheVariant
  });
  const [hasError, setHasError] = useState(false);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && cleanFallbackSrc && event.currentTarget.src !== cleanFallbackSrc) {
      setHasError(true);
    }
    if (onError) {
      onError(event);
    }
  };

  const displaySrc = hasError ? cleanFallbackSrc || imageSrc : imageSrc;

  return (
    <img
      {...props}
      src={displaySrc || null}
      onLoad={(event) => {
        props.onLoad?.(event);
      }}
      onError={handleError}
      style={{ opacity: loading ? 0.5 : 1, ...props.style }}
    />
  );
};

export const ImageCache = React.memo(ImageCacheComponent);
