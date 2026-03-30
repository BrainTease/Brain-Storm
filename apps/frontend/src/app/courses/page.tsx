import Link from 'next/link';

export default function CoursesPage() {
  const courses = [
    { id: 1, title: 'Intro to Stellar Blockchain', level: 'Beginner', duration: '4h' },
    { id: 2, title: 'Soroban Smart Contracts', level: 'Intermediate', duration: '8h' },
    { id: 3, title: 'DeFi on Stellar', level: 'Advanced', duration: '12h' },
  ];

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Courses</h1>
      <div className="grid gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900 hover:shadow-md dark:hover:shadow-gray-800 transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {course.level} · {course.duration}
            </p>
            <Link
              href={`/courses/${course.id}`}
              className="mt-3 inline-block text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Course →
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
