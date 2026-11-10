import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorker } from "@/components/pwa/service-worker";
import "./globals.css";
import "../styles/display.css";

// Same font as Church Workflow. next/font serves it from this app, so it
// still loads when the laptop is offline.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Service Timer",
    template: "%s | Service Timer",
  },
  description: "A countdown timer for church services that keeps running when the internet drops.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0C5FB3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className} antialiased`}>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
