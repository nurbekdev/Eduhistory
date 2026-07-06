import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eduhistory.uz";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Eduhistory",
    short_name: "Eduhistory",
    description:
      "Eduhistory - kurslar, testlar, progress va sertifikatlar uchun professional LMS platformasi.",
    lang: "uz",
    dir: "ltr",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#065f46",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Kurslar",
        short_name: "Kurslar",
        description: "Kurslar katalogini ochish",
        url: "/kurslar?source=pwa-shortcut",
        icons: [{ src: "/icons/shortcut-courses.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Sertifikatlar",
        short_name: "Sertifikatlar",
        description: "Sertifikatlar sahifasini ochish",
        url: "/sertifikatlar?source=pwa-shortcut",
        icons: [{ src: "/icons/shortcut-certificates.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      {
        src: "/images/dashboard-preview.jpg",
        sizes: "1280x720",
        type: "image/jpeg",
        form_factor: "wide",
        label: "Eduhistory boshqaruv paneli",
      },
    ],
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=uz.eduhistory.app",
        id: "uz.eduhistory.app",
      },
    ],
    prefer_related_applications: false,
    launch_handler: {
      client_mode: "navigate-existing",
    },
    protocol_handlers: [
      {
        protocol: "web+eduhistory",
        url: `${siteUrl}/kurslar?source=%s`,
      },
    ],
  };
}
