interface CompressImageOptions {
  maxWidth?: number;
  quality?: number;
  minSizeToCompress?: number;
}

const loadImage = async (file: File): Promise<HTMLImageElement> => {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    image.src = objectUrl;
  });
};

export const compressImageFile = async (
  file: File,
  options: CompressImageOptions = {}
): Promise<File> => {
  const {
    maxWidth = 640,
    quality = 0.74,
    minSizeToCompress = 120 * 1024
  } = options;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  const image = await loadImage(file);
  const shouldResize = image.width > maxWidth;

  if (!shouldResize && file.size <= minSizeToCompress) {
    return file;
  }

  const ratio = shouldResize ? maxWidth / image.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));

  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const compressedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

  if (!compressedBlob || compressedBlob.size >= file.size) {
    return file;
  }

  const compressedName = file.name.replace(/\.[^.]+$/, '') || 'avatar';

  return new File([compressedBlob], `${compressedName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
};
