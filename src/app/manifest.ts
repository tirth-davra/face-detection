import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Face Recognition App",
    short_name: "FaceApp",
    description: "Progressive Web App for face recognition and detection",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#00ff00",
    icons: [
      {
        src: "/icons/icon-192-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-192-256.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/icons/icon-192-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
} 