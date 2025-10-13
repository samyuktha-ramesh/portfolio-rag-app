import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio Chat",
  description: "Chat interface for your structured portfolio data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mx-2 bg-background text-gray-800 text-lg`}
      >       
        <header className="fixed top-0 left-0 w-full z-50 sm:p-4 mb-6 flex flex-row items-center">
          <div className="flex items-center">
            <div className="text-2xl font-semibold">Portfolio Chat</div>
            <img src="/portfolio_logo.png" alt="Portfolio Chat Logo" className="h-7 ml-2" />
          </div>
          <div className="flex-1" />
          <img src="/eth_logo.svg" alt="ETH Zurich Logo" className="h-12 mx-4" />
        </header> 
        {children}
      </body>
    </html>
  );
}
