import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.shout.run';

interface SessionEntry {
  id: string;
  username: string;
  updatedAt?: string;
  createdAt?: string;
}

async function fetchPublicSessions(): Promise<SessionEntry[]> {
  try {
    const res = await fetch(`${API_URL}/api/sessions/recent?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.sessions ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://shout.run', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    {
      url: 'https://shout.run/about',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://shout.run/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: 'https://shout.run/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const sessions = await fetchPublicSessions();

  // Collect unique usernames for profile pages
  const usernames = [...new Set(sessions.map((s) => s.username).filter(Boolean))];

  const profilePages: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `https://shout.run/${username}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  const sessionPages: MetadataRoute.Sitemap = sessions
    .filter((s) => s.username && s.id)
    .map((s) => ({
      url: `https://shout.run/${s.username}/${s.id}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : s.createdAt ? new Date(s.createdAt) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }));

  return [...staticPages, ...profilePages, ...sessionPages];
}
