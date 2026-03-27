// Root layout — locale-specific layout lives in app/[locale]/layout.tsx
// This file is required by Next.js but the [locale] segment handles rendering.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
