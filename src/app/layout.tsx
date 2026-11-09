import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../styles/timer.css";

export const metadata: Metadata = {
  title: "Service Timer",
  description: "A countdown timer for church services that keeps running when the internet drops.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c1a4d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
