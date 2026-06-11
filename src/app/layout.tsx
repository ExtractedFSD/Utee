import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Utee Portal",
  description: "Track your UTI test, manage orders and subscriptions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
