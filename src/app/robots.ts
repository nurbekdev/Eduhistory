import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eduhistory.uz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/boshqaruv/", "/dashboard", "/profil", "/quiz/", "/mening-kurslarim"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
