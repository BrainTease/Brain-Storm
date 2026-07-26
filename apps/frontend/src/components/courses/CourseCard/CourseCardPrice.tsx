export interface CourseCardPriceProps {
  price?: number;
}

export function CourseCardPrice({ price }: CourseCardPriceProps) {
  return (
    <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
      <span className="sr-only">Price: </span>
      {price === 0 || price === undefined ? 'Free' : `$${price.toFixed(2)}`}
    </span>
  );
}
