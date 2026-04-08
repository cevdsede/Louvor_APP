import React, { useState } from 'react';
import { useImageCache } from '../../hooks/useImageCache';

interface ImageCacheProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  disableCompression?: boolean;
}

const ImageCacheComponent: React.FC<ImageCacheProps> = ({ src, fallbackSrc, disableCompression = false, onError, ...props }) => {
  const { imageSrc, loading } = useImageCache(src, fallbackSrc, disableCompression);
  const [hasError, setHasError] = useState(false);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
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
      src={displaySrc || null}
      onError={handleError}
      {...props}
      style={{ opacity: loading ? 0.5 : 1, ...props.style }}
    />
  );
};

export const ImageCache = React.memo(ImageCacheComponent);
