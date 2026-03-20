import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service - shout',
};

export default function TermsPage() {
  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-2 text-shout-text">Terms of Service</h1>
      <p className="text-sm text-shout-muted mb-10">Last updated: March 2026</p>

      <div className="space-y-10 text-shout-muted leading-relaxed">
        {/* 1 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using shout (&quot;the Service&quot;), available at{' '}
            <a href="https://shout.run" className="text-shout-accent hover:underline">shout.run</a>,
            you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
          <p className="mt-2">
            You must be at least 13 years old to use shout. By using the Service, you represent that you
            meet this age requirement.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">2. Service Description</h2>
          <p>
            shout is a live terminal broadcasting and recording platform. It allows developers to stream
            their terminal output in real-time to viewers via the web. The platform consists of a CLI tool,
            a backend API, and a web viewer.
          </p>
          <p className="mt-2">
            shout is open-source software released under the MIT License. The source code is available at{' '}
            <a
              href="https://github.com/pavanmadiraju91/shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shout-accent hover:underline"
            >
              github.com/pavanmadiraju91/shout-run
            </a>.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">3. Accounts</h2>
          <p>
            shout uses GitHub OAuth for authentication. You may create one account per person. You are
            responsible for maintaining the security of your GitHub account and, by extension, your shout
            account.
          </p>
          <p className="mt-2">
            You must not share your account credentials or allow others to access your account. You are
            responsible for all activity that occurs under your account.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">4. User Content and Recordings</h2>
          <p>
            You retain ownership of all content you broadcast through shout, including terminal output,
            session titles, and tags (&quot;User Content&quot;).
          </p>
          <p className="mt-2">
            By broadcasting through shout, you grant us a limited, worldwide, royalty-free, non-exclusive
            license to store, transmit, and display your User Content on the platform for the purpose of
            operating and providing the Service. This license ends when you delete your content or your
            account.
          </p>
          <p className="mt-2">
            You may delete your recordings at any time. Upon account deletion, your User Content will be
            removed within 30 days.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">5. Acceptable Use</h2>
          <p>You agree not to use shout to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Broadcast illegal content or content that violates the rights of others</li>
            <li>Conduct unauthorized surveillance of others&apos; terminals or systems</li>
            <li>Circumvent rate limits or other technical restrictions</li>
            <li>Scrape, crawl, or automate access to the Service without permission</li>
            <li>Impersonate another person or entity</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
          </ul>
          <p className="mt-2">
            We reserve the right to suspend or terminate accounts that violate these rules.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">6. Open Source Components</h2>
          <p>
            shout incorporates third-party open-source software components, each governed by its own
            license. These components are provided &quot;as is&quot; without warranty. Our liability does
            not extend to third-party open-source components included in the Service.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">7. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
            ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="mt-2">
            We do not guarantee that the Service will be uninterrupted, error-free, or available at all
            times. We make no warranty regarding uptime, reliability, or data preservation.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL SHOUT, ITS CONTRIBUTORS, OR ITS
            SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR EXPOSURE OF SENSITIVE
            INFORMATION, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">9. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate your access to the
            Service at any time for violations of these Terms or for any other reason at our discretion,
            with or without notice.
          </p>
          <p className="mt-2">
            Upon termination, your right to use the Service ceases immediately. Your User Content will be
            deleted within 30 days of account termination.
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be posted on this page
            with an updated &quot;Last updated&quot; date. Your continued use of the Service after changes
            are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-xl font-semibold text-shout-text mb-3">11. Contact</h2>
          <p>
            For questions about these Terms, open an issue on{' '}
            <a href="https://github.com/pavanmadiraju91/shout-run/issues" target="_blank" rel="noopener noreferrer" className="text-shout-accent hover:underline">
              GitHub
            </a>.
          </p>
        </section>

        <div className="pt-8 border-t border-shout-border">
          <Link href="/" className="text-shout-accent hover:underline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
