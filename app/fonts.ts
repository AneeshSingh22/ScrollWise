import { Unbounded, Figtree, JetBrains_Mono } from "next/font/google";

/**
 * The prototype loads these three from the Google Fonts CDN. next/font
 * self-hosts them instead, which removes a render-blocking round trip on the
 * phone. Families and weights match the prototype exactly.
 */

export const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display-src",
  display: "swap",
});

export const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body-src",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono-src",
  display: "swap",
});

export const fontClasses = [
  unbounded.variable,
  figtree.variable,
  jetbrainsMono.variable,
].join(" ");
