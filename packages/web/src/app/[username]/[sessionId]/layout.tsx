import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface SessionData {
  id: string;
  title: string;
  description?: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  username: string;
  avatarUrl: string;
}

async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; sessionId: string }>;
}): Promise<Metadata> {
  const { username, sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    return {
      title: 'Session not found - shout',
    };
  }

  const title = session.title || `${username}'s session`;
  const description = session.description || `Watch ${username}'s terminal session on shout`;
  const sessionUrl = `https://shout.run/${username}/${sessionId}`;
  const oembedUrl = `https://api.shout.run/api/oembed?url=${encodeURIComponent(sessionUrl)}&format=json`;

  return {
    title: `${title} - shout`,
    description,
    openGraph: {
      title,
      description,
      url: sessionUrl,
      siteName: 'shout',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      types: {
        'application/json+oembed': oembedUrl,
      },
    },
  };
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
