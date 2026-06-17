"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  source: string;
};

export function ThumbnailImage({ src, alt, source }: Props) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900">
        <span className="text-sm font-semibold text-neutral-600">{source}</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
