'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const username = searchParams.get('username');
    const avatarUrl = searchParams.get('avatarUrl');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (token && username && avatarUrl) {
      localStorage.setItem('shout_token', token);
      setUser({
        id: '',
        githubId: 0,
        username,
        avatarUrl,
        createdAt: new Date().toISOString(),
      });
      router.replace('/');
    } else {
      setError('Missing authentication data');
    }
  }, [searchParams, router, setUser]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <svg
          className="w-12 h-12 text-shout-red mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h1 className="text-xl font-medium mb-2">Sign in failed</h1>
        <p className="text-shout-muted text-sm mb-6">
          {error === 'access_denied'
            ? 'You denied the authorization request.'
            : `Something went wrong (${error}).`}
        </p>
        <Link href="/" className="text-shout-accent hover:underline text-sm">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-2 border-shout-border border-t-shout-accent rounded-full mb-4"></div>
      <p className="text-shout-muted text-sm">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-shout-border border-t-shout-accent rounded-full mb-4"></div>
          <p className="text-shout-muted text-sm">Signing you in...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
