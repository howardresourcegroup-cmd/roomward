import type { MetadataRoute } from "next";

// Allow crawling of the public marketing/auth pages; keep the app + API out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/", "/landing", "/login", "/signup", "/blog", "/privacy", "/terms",
        "/hotel-work-order-software",
        "/hotel-preventive-maintenance-software",
        "/hotel-housekeeping-software",
        "/hotel-operations-software",
        "/hotel-cmms-software",
        "/roommaster-integration",
      ],
      // /demo provisions a sandbox on every visit — keep crawlers out of it
      disallow: ["/api/", "/demo", "/buildings", "/work-orders", "/housekeeping", "/settings", "/reports", "/assets", "/messages", "/technicians", "/help", "/front-desk", "/property", "/auth/"],
    },
    sitemap: "https://roomward.app/sitemap.xml",
    host: "https://roomward.app",
  };
}
