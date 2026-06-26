import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://roomward.app";
  const now = new Date();
  const posts: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date), changeFrequency: "monthly", priority: 0.7,
  }));
  return [
    { url: `${base}/`,         lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${base}/landing`,  lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/hotel-work-order-software`,             lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/hotel-preventive-maintenance-software`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/hotel-housekeeping-software`,           lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/hotel-operations-software`,             lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/hotel-cmms-software`,                   lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/roommaster-integration`,                lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/eptura-integration`,                    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/opera-pms-integration`,                 lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/cloudbeds-integration`,                 lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/quore-alternative`,                     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog`,     lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/signup`,   lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`,    lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    ...posts,
  ];
}
