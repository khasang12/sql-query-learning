import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PGliteProvider } from "@/components/PGliteProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Data Gravity | Database Internals",
  description: "Interactive, premium educational experience for learning database internals (Connection Pooling, Indexes, DB Locking, ACID)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <PGliteProvider>
          {children}
        </PGliteProvider>
      </body>
    </html>
  );
}
