interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search courses…',
  id = 'course-search',
}: SearchInputProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Search courses
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="sr-only">
        Results update automatically as you type.
      </p>
      <svg
        className="absolute left-3 top-3 h-4 w-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        />
      </svg>
    </div>
  );
}
