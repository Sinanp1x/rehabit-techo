// src/pages/PrivacyPage.tsx — Premium, accessible Privacy Policy Page
import { ArrowLeft, Shield, Lock, HardDrive, Database, Mail } from 'lucide-react';
import { useStore } from '../store/useStore';

export const PrivacyPage = () => {
  const { setPage } = useStore();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden font-sans text-text-main">
      {/* Top Header */}
      <header className="shrink-0 bg-surface border-b border-border px-6 py-4 flex items-center gap-4 z-10">
        <button
          onClick={() => setPage('settings')}
          className="p-2 hover:bg-border rounded-full text-text-sub transition-colors active:scale-95"
          aria-label="Back to settings"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Privacy Policy</h1>
        </div>
      </header>

      {/* Content scroll box */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 max-w-2xl mx-auto">
        <section className="space-y-3">
          <p className="text-sm text-text-sub leading-relaxed">
            Welcome to <strong className="text-text-main">Rehabi Techo</strong>. Your privacy is our highest priority. We are committed to building a completely transparent, local-first, privacy-respecting tool where you own your personal habits data.
          </p>
          <p className="text-sm text-text-sub leading-relaxed">
            Unlike traditional tracking tools, we operate under a <strong className="text-text-main">Zero-Knowledge design</strong>. This means we design systems so that we cannot read your habits or track your personal schedules even if we wanted to.
          </p>
        </section>

        {/* Section 1: Data Collection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <Lock size={18} className="text-primary-light" />
            <h2 className="text-base font-bold text-text-main">1. What Data We Collect</h2>
          </div>
          <div className="space-y-3 text-sm text-text-sub">
            <p className="leading-relaxed">
              We collect only the bare minimum information needed to run a premium habit tracking experience:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-main">Account Details:</strong> Your email address, profile picture (if synced via Google), and a user display name to handle optional friend system connections.
              </li>
              <li>
                <strong className="text-text-main">Habits & Logs:</strong> The habit titles, schedules, logged completion items (done, partial, or skips with reasons), custom tags, and reminder times.
              </li>
              <li>
                <strong className="text-text-main">Security Keys:</strong> If End-to-End Encryption (E2EE) is enabled, we create a secure, localized cryptographic salt. Your master password <strong className="text-text-main">never</strong> leaves your device, and we never store or transmit it.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Storage & E2EE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <HardDrive size={18} className="text-primary-light" />
            <h2 className="text-base font-bold text-text-main">2. Local-First & Cryptography</h2>
          </div>
          <div className="space-y-3 text-sm text-text-sub">
            <p className="leading-relaxed">
              We employ a localized hybrid data architecture to guarantee optimal speed and bulletproof privacy:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-main">Primary Local Storage:</strong> All habits, logs, and user settings are committed directly to your device first using browser IndexedDB storage (via Dexie). The application operates 100% offline.
              </li>
              <li>
                <strong className="text-text-main">Zero-Knowledge E2EE:</strong> When E2EE is enabled in settings, all database rows are fully encrypted locally on your CPU using military-grade <strong className="text-text-main">AES-GCM (256-bit)</strong> before synchronizing to Firebase. They remain absolute unreadable blobs of gibberish to everyone else—including our server administrators.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Third Parties */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <Database size={18} className="text-primary-light" />
            <h2 className="text-base font-bold text-text-main">3. Infrastructure & Partners</h2>
          </div>
          <div className="space-y-3 text-sm text-text-sub">
            <p className="leading-relaxed">
              We leverage reliable and industry-standard hosting partners to sync your encrypted backups securely:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-main">Firebase (Google):</strong> Used for secure user authentication (email/password or OAuth) and Firestore database synchronization.
              </li>
              <li>
                <strong className="text-text-main">Cloudflare:</strong> Used to serve PWA static shell elements, cached service workers, icons, and assets securely under low latency.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Your Rights */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <Shield size={18} className="text-primary-light" />
            <h2 className="text-base font-bold text-text-main">4. Your Control & Rights</h2>
          </div>
          <p className="text-sm text-text-sub leading-relaxed">
            You maintain absolute sovereignty over your tracking metrics. In Settings, you can:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-text-sub">
            <li><strong className="text-text-main">Export Everything:</strong> Instantly download all compiled database rows in standard JSON format anytime.</li>
            <li><strong className="text-text-main">Import Anywhere:</strong> Migrate your local JSON backup into any device, with or without E2EE configurations.</li>
            <li><strong className="text-text-main">Erase Completely:</strong> Clear database structures completely, log out, or opt out of public sharing systems instantly.</li>
          </ul>
        </section>

        {/* Section 5: Contact */}
        <section className="space-y-4 pb-8">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <Mail size={18} className="text-primary-light" />
            <h2 className="text-base font-bold text-text-main">5. Get In Touch</h2>
          </div>
          <p className="text-sm text-text-sub leading-relaxed">
            If you have questions about our zero-knowledge cryptographic strategy, E2EE protocols, or want to contribute to our open-source codebase, reach out to us at:
          </p>
          <div className="bg-surface rounded-xl p-4 border border-border flex items-center justify-center text-sm font-semibold hover:border-primary transition-colors cursor-pointer">
            <a href="mailto:support@p1xion.com" className="text-primary flex items-center gap-2">
              <Mail size={16} /> support@p1xion.com
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
