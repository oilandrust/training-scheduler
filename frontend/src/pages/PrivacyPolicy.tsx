import { LegalLayout } from './LegalLayout';

const UPDATED = '25 September 2026';
const CONTACT = 'o.rouiller@gmail.com';
const SITE = 'https://training-scheduler.lefolio.fr';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy describes how <strong>Training Scheduler</strong> (“we”, “the
        Service”), available at {SITE}, collects and uses information when you use the
        website and related APIs.
      </p>

      <h2>Who we are</h2>
      <p>
        Training Scheduler is operated by Olivier Rouiller. For privacy questions, contact{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account identity.</strong> Email address when you sign in with a one-time
          email code or with Google (we receive your Google account email and basic profile
          identifiers needed to create or match your account).
        </li>
        <li>
          <strong>Session data.</strong> An HTTP-only session cookie so you stay signed in.
        </li>
        <li>
          <strong>Schedules and content you create.</strong> Training modules, days,
          activities, notes, and related metadata you save in the Service.
        </li>
        <li>
          <strong>Imported documents (optional).</strong> If you upload a PDF or connect
          Google Drive to import a document, we process the file content to extract a
          proposed schedule. Drive access is only requested when you choose that feature.
        </li>
        <li>
          <strong>Share links.</strong> If you create a public share link, anyone with the
          link can view that schedule without signing in.
        </li>
        <li>
          <strong>Technical logs.</strong> Standard server logs (for example request time,
          status codes, and IP address) used for security and reliability.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Authenticate you and keep your account secure.</li>
        <li>Provide, store, and display your schedules.</li>
        <li>Send one-time sign-in codes by email (via our email provider).</li>
        <li>
          When you import a document, send extracted text to an AI provider solely to
          structure a schedule draft for you.
        </li>
        <li>Operate share links you create, and improve reliability and security.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Google account and Google Drive</h2>
      <p>
        Google sign-in uses Google OAuth. We request basic profile scopes (
        <code>openid</code>, <code>email</code>, <code>profile</code>) for login. If you
        connect Drive for import, we additionally request read-only Drive access so we can
        export the document you select. You can revoke access at any time in your{' '}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noreferrer"
        >
          Google Account third-party settings
        </a>
        .
      </p>
      <p>
        Training Scheduler’s use and transfer of information received from Google APIs
        adhere to the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <h2>Processors we rely on</h2>
      <ul>
        <li>Hosting and database on our application server (schedules and accounts).</li>
        <li>Email delivery for one-time codes (Resend).</li>
        <li>AI extraction for imports (OpenRouter or another configured LLM provider).</li>
        <li>Google, when you choose Google sign-in or Drive import.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use essential cookies for sign-in (session and short-lived OAuth state). We do
        not use advertising cookies.
      </p>

      <h2>Retention</h2>
      <p>
        We keep your account and schedules while your account exists. Session cookies expire
        according to their configured lifetime. Server logs are retained for a limited
        operational period. You may ask us to delete your account and associated schedules
        by emailing {CONTACT}.
      </p>

      <h2>Sharing and public links</h2>
      <p>
        Schedules are private to your account unless you create a share link. Anyone with
        that link can view the shared schedule. Do not share links that contain sensitive
        personal data you are not willing to make public.
      </p>

      <h2>Security</h2>
      <p>
        We use HTTPS in production, hashed session tokens, and access controls so that
        authenticated APIs only return schedules you own. No method of transmission or
        storage is perfectly secure.
      </p>

      <h2>Children</h2>
      <p>
        The Service is not directed to children under 16. We do not knowingly collect
        personal information from children.
      </p>

      <h2>International users</h2>
      <p>
        The Service may be hosted in the European Union or other regions. By using the
        Service you understand that your information may be processed where we and our
        providers operate.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The “Last updated” date at the top
        will change when we do. Continued use of the Service after changes means you accept
        the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or deletion requests:{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}
