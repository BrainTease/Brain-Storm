import Image from 'next/image';

export interface CourseCardImageProps {
  title: string;
  imageUrl?: string;
  category?: string;
}

export function CourseCardImage({ title, imageUrl, category }: CourseCardImageProps) {
  return (
    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${title} course thumbnail`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
            />
          </svg>
        </div>
      )}
      {category && (
        <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded">
          <span className="sr-only">Category: </span>
          {category}
        </span>
      )}
    </div>
  );
}
