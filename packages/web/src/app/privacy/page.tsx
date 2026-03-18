import Link from 'next/link';
import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy - shout',
};

export default function PrivacyPage() {
  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-shout-text mb-2">Privacy Policy</h1>
      <p className="text-sm text-shout-muted mb-10">Last updated: March 2026</p>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Data we collect</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-shout-border">
                  <th className="text-left py-3 pr-4 text-shout-text font-semibold">Category</th>
                  <th className="text-left py-3 pr-4 text-shout-text font-semibold">Data</th>
                  <th className="text-left py-3 text-shout-text font-semibold">Where stored</th>
                </tr>
              </thead>
              <tbody className="text-shout-muted">
                <tr className="border-b border-shout-border">
                  <td className="py-3 pr-4">Account</td>
                  <td className="py-3 pr-4">GitHub username, avatar URL (from OAuth)</td>
                  <td className="py-3">Turso DB (users table)</td>
                </tr>
                <tr className="border-b border-shout-border">
                  <td className="py-3 pr-4">Sessions</td>
                  <td className="py-3 pr-4">Terminal output, title, tags, timestamps, terminal dimensions</td>
                  <td className="py-3">Durable Object then R2 (sessions/ bucket)</td>
                </tr>
                <tr className="border-b border-shout-border">
                  <td className="py-3 pr-4">Session metadata</td>
                  <td className="py-3 pr-4">Status, visibility, viewer count, start/end times</td>
                  <td className="py-3">Turso DB (sessions table)</td>
                </tr>
                <tr className="border-b border-shout-border">
                  <td className="py-3 pr-4">Follows</td>
                  <td className="py-3 pr-4">Who follows whom</td>
                  <td className="py-3">Turso DB (follows table)</td>
                </tr>
                <tr className="border-b border-shout-border">
                  <td className="py-3 pr-4">Votes</td>
                  <td className="py-3 pr-4">Anonymous voter ID per session</td>
                  <td className="py-3">Cloudflare KV (30-day TTL)</td>
                </tr>
                <tr className="border-b border-shout-border">
                  <td className="py-3 pr-4">Analytics</td>
                  <td className="py-3 pr-4">Page views (aggregated, anonymous)</td>
                  <td className="py-3">Vercel Analytics</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Data we do not collect</h2>
          <ul className="list-disc list-inside text-shout-muted space-y-2">
            <li>Passwords (GitHub OAuth only)</li>
            <li>Payment data (no paid tier)</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">How we use your data</h2>
          <p className="text-shout-muted">
            We use collected data to display broadcasts, store replays for later viewing,
            show user profiles, and aggregate anonymous analytics to improve the service.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Third-party services</h2>
          <ul className="list-disc list-inside text-shout-muted space-y-2">
            <li>Cloudflare — Workers, R2 storage, KV, Durable Objects</li>
            <li>Vercel — Hosting and analytics</li>
            <li>GitHub — OAuth authentication</li>
            <li>Turso — Database (libSQL)</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Your rights</h2>
          <ul className="list-disc list-inside text-shout-muted space-y-2">
            <li>View all your data on your profile page</li>
            <li>Export recordings as .cast files (asciicast v2 format)</li>
            <li>
              Request account deletion by contacting{' '}
              <a href="mailto:privacy@shout.run" className="text-shout-accent hover:underline">
                privacy@shout.run
              </a>
            </li>
            <li>GDPR: Right to erasure and data portability</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Security</h2>
          <ul className="list-disc list-inside text-shout-muted space-y-2">
            <li>WSS (WebSocket Secure) encryption for all broadcasts</li>
            <li>JWT-based authentication</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Cookies and local storage</h2>
          <p className="text-shout-muted">
            We store <code className="bg-shout-surface px-1 py-0.5 rounded text-sm">shout-theme</code> in
            localStorage to remember your theme preference (dark or light mode). We do not use
            tracking cookies.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Changes to this policy</h2>
          <p className="text-shout-muted">
            We reserve the right to update this privacy policy. Changes will be announced on this
            website.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-shout-text mb-4">Contact</h2>
          <p className="text-shout-muted">
            For privacy-related inquiries, contact us at{' '}
            <a href="mailto:privacy@shout.run" className="text-shout-accent hover:underline">
              privacy@shout.run
            </a>
          </p>
        </section>

        <div className="pt-8 border-t border-shout-border">
          <Link href="/" className="text-shout-accent hover:underline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    <Footer />
    </>
  );
}
