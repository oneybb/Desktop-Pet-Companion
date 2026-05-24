import React, { useEffect, useState } from 'react';

interface TransparentCatImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function TransparentCatImage({ src, alt, className, style }: TransparentCatImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    // If the image is a data URL already, or if loading fails, we will fall back safely.
    // Ensure we handle non-image files or pre-processed files
    if (!src || src.startsWith('data:image')) {
      setProcessedSrc(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessedSrc(src);
        return;
      }

      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Loop over pixels to key out solid white and bright off-white background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const a = data[i+3];

          // If the pixel is very bright white/off-white (all R, G, B channels are extremely light)
          if (r > 215 && g > 215 && b > 215) {
            const maxVal = Math.max(r, g, b);
            
            // For pure background whites, make completely transparent. For edges, apply a smooth anti-alias ramp
            if (maxVal > 235) {
              data[i+3] = 0;
            } else {
              const blendFactor = (maxVal - 215) / 20; // 0.0 to 1.0
              data[i+3] = Math.max(0, Math.min(a, Math.round(a * (1 - blendFactor))));
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        setProcessedSrc(canvas.toDataURL());
      } catch (err) {
        console.warn("Canvas background removal failed (possibly due to bundling protocol/sandboxing), using original image", err);
        setProcessedSrc(src);
      }
    };
    img.onerror = () => {
      setProcessedSrc(src);
    };
  }, [src]);

  return (
    <img
      src={processedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      style={style}
    />
  );
}
