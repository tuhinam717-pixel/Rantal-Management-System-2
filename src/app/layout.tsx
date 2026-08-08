import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Rental Management System`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Manage the full rental lifecycle: quotations, pickups, returns, security deposits and late fees from a single dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
