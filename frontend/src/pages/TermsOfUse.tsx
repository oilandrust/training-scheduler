import { LegalLayout } from './LegalLayout';

const UPDATED = '25 September 2026';
const CONTACT = 'o.rouiller@gmail.com';
const SITE = 'https://training-scheduler.lefolio.fr';

export default function TermsOfUse() {
  return (
    <LegalLayout title="Terms of Use" updated={UPDATED}>
      <p>
        These Terms of Use govern access to <strong>Training Scheduler</strong> at {SITE}{' '}
        (the “Service”). By creating an account or using the Service, you agree to these
        terms.
      </p>

      <h2>The Service</h2>
      <p>
        Training Scheduler lets you create, edit, import, and share training schedules. The
        Service is provided as a personal / early-access product and may change, interrupt,
        or discontinue features without notice.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must provide a valid email address you control.</li>
        <li>
          You are responsible for activity under your account and for keeping access to your
          email or Google account secure.
        </li>
        <li>
          We may suspend or terminate accounts that abuse the Service, attempt unauthorized
          access, or violate these terms.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of schedules and other content you submit. You grant us a
        limited license to host, process, and display that content solely to operate the
        Service (including generating share links you create and running optional document
        import).
      </p>
      <p>
        You must not upload or import content you do not have the right to use, or content
        that is unlawful, harmful, or infringes others’ rights.
      </p>

      <h2>Share links</h2>
      <p>
        Public share links make a schedule viewable by anyone who has the URL. You are
        responsible for what you share and for revoking links you no longer want public.
      </p>

      <h2>Third-party services</h2>
      <p>
        Sign-in, email delivery, Google Drive import, and AI-assisted import rely on
        third-party providers. Their terms and privacy policies also apply when you use
        those features. We are not responsible for outages or changes by those providers.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Probe, disrupt, or overload the Service;</li>
        <li>Bypass authentication or access another user’s data;</li>
        <li>Use the Service to send spam or malicious content;</li>
        <li>Reverse engineer the Service except where allowed by law.</li>
      </ul>

      <h2>Disclaimer</h2>
      <p>
        The Service is provided “as is” and “as available”, without warranties of any kind,
        whether express or implied, including fitness for a particular purpose and
        non-infringement. Schedule suggestions from document import may be inaccurate; you
        are responsible for reviewing them before relying on them.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect, incidental,
        special, consequential, or punitive damages, or for loss of data, profits, or
        goodwill arising from your use of the Service. Our total liability for any claim
        relating to the Service is limited to the greater of (a) the amount you paid us for
        the Service in the twelve months before the claim, or (b) €50.
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle personal data is described in our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The “Last updated” date will change when we do. Continued
        use after changes constitutes acceptance of the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}
