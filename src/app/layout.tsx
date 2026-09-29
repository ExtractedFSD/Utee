import type { Metadata } from "next";
import { cooper, poppins } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Utee Portal",
  description: "Track your UTI test, manage orders and subscriptions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cooper.variable} ${poppins.variable}`}>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
