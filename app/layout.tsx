import type { Metadata, Viewport } from "next";
import { fontClasses } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scrollwise",
  description:
    "Swap the scroll for something that sticks. AI, how tech works, life skills, the world, and mental math in a feed you can finish.",
  applicationName: "Scrollwise",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // Opens full-screen, no Safari chrome, when launched from the home screen.
    capable: true,
    title: "Scrollwise",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The feed is a full-screen snap scroller; zooming breaks the snap points.
  maximumScale: 1,
  userScalable: false,
  // Lets the cards run under the notch and home indicator; the CSS uses
  // env(safe-area-inset-*) to keep content clear of them.
  viewportFit: "cover",
  themeColor: "#0b0c11",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontClasses}>
      <head>
        {/*
          Next emits the modern `mobile-web-app-capable`. Older iOS only looks
          for the apple-prefixed name, and without it the app opens inside
          Safari chrome instead of full-screen from the home screen.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
