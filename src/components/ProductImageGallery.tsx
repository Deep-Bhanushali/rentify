import Image from "next/image";
import { useState, useRef } from "react";

interface ProductImageGalleryProps {
  images?: string[]; // Array of image URLs
  title: string;
}

export default function ProductImageGallery({ images = [], title }: ProductImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Use placeholder image if no images are provided
  const displayImages = images.length > 0 ? images : ["/placeholder-product.jpg"];

  // Navigation functions
  const goToPrevious = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedImageIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setSelectedImageIndex(index);
  };

  // Auto-scroll thumbnails to show selected one
  const scrollToThumbnail = (index: number) => {
    if (thumbnailsRef.current) {
      const thumbnailElements = thumbnailsRef.current.children;
      if (thumbnailElements[index]) {
        thumbnailElements[index].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Image with Navigation */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 group">
        <Image
          src={displayImages[selectedImageIndex]}
          alt={`${title} - Image ${selectedImageIndex + 1}`}
          fill
          className="object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder-product.jpg";
          }}
        />

        {/* Navigation Arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={goToNext}
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {selectedImageIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Slider */}
      {displayImages.length > 1 && (
        <div className="relative">
          <div
            ref={thumbnailsRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayImages.map((image, index) => (
              <button
                key={index}
                className={`relative flex-shrink-0 w-20 h-20 overflow-hidden rounded-md border-2 ${
                  selectedImageIndex === index ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                }`}
                onClick={() => {
                  goToImage(index);
                  scrollToThumbnail(index);
                }}
                onMouseEnter={() => scrollToThumbnail(index)}
              >
                <Image
                  src={image}
                  alt={`${title} - Thumbnail ${index + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-product.jpg";
                  }}
                />
              </button>
            ))}
          </div>

          {/* Scroll Indicators (optional dots for larger galleries) */}
          {displayImages.length > 5 && (
            <div className="flex justify-center mt-2 gap-1">
              {displayImages.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    selectedImageIndex === index ? "bg-blue-500" : "bg-gray-300"
                  }`}
                  onClick={() => goToImage(index)}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Keyboard Navigation */}
      {displayImages.length > 1 && (
        <div className="sr-only">
          Use arrow keys to navigate images
        </div>
      )}
    </div>
  );
}
