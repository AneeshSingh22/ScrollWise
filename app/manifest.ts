import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scrollwise",
    short_name: "Scrollwise",
    description:
      "Swap the scroll for something that sticks. A feed of short learning cards you can actually finish.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0c11",
    theme_color: "#0b0c11",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
