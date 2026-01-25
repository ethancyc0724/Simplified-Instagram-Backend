'use client';

import { useState } from 'react';

interface ImageCarouselProps {
  images: Array<{ url: string }>;
  alt?: string;
  className?: string;
}

export default function ImageCarousel({
  images,
  alt = '',
  className = '',
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative w-full aspect-square bg-gray-100 overflow-hidden select-none ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Images container */}
      <div
        className="flex h-full w-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="min-w-full w-full h-full flex-shrink-0 relative"
          >
            <img
              src={image.url}
              alt={`${alt} ${index + 1}`}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center center' }}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 active:bg-black/80 text-white rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20 touch-none"
            aria-label="Previous image"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 active:bg-black/80 text-white rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20 touch-none"
            aria-label="Next image"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? 'bg-white w-6 h-1.5'
                  : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/75'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter (top right) */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs z-10">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
