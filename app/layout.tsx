// app/layout.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FeedRail API",
  description: "Headless Social Media Middleware",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}