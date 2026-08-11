import { Link } from 'react-router-dom'
import LegalPageLayout, { LegalSection } from '../components/LegalPageLayout'

const LAST_UPDATED = 'July 10, 2026'

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        Clinty, Inc. (&ldquo;Clinty,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) provides AI-powered
        email and calendar automation services for small businesses. This Privacy Policy explains how we
        collect, use, disclose, and safeguard your information when you use our website and services.
      </p>

      <LegalSection title="1. Information We Collect">
        <p>
          <strong className="text-navy-900">Account information.</strong> When you sign up, we collect
          your name, email address, business name, and billing details.
        </p>
        <p>
          <strong className="text-navy-900">Connected service data.</strong> With your authorization,
          Clinty accesses your email inbox and calendar to read, draft, and send messages and manage
          appointments on your behalf. We only access the data necessary to perform these tasks.
        </p>
        <p>
          <strong className="text-navy-900">Usage data.</strong> We collect information about how you
          interact with our platform, including feature usage, log data, device information, and IP address.
        </p>
        <p>
          <strong className="text-navy-900">Communications.</strong> If you contact us via email or our
          contact form, we retain the content of those messages to respond to your inquiry.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide, operate, and maintain our AI agent services</li>
          <li>Process and respond to customer emails and schedule appointments on your behalf</li>
          <li>Improve and personalize your experience with Clinty</li>
          <li>Process billing and send account-related communications</li>
          <li>Monitor for security threats, fraud, and abuse</li>
          <li>Comply with legal obligations</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. AI Processing">
        <p>
          Clinty uses artificial intelligence to analyze email content and calendar data in order to
          generate responses and manage scheduling. AI-generated drafts are created based on your
          configured preferences and business rules. You retain control over whether messages are sent
          automatically or require your approval.
        </p>
        <p>
          We do not use your email content or customer data to train general-purpose AI models shared
          across other customers without your explicit consent.
        </p>
      </LegalSection>

      <LegalSection title="4. Data Sharing">
        <p>We do not sell your personal information. We may share data with:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-navy-900">Service providers</strong> who assist with hosting,
            payment processing, analytics, and customer support, under strict confidentiality agreements
          </li>
          <li>
            <strong className="text-navy-900">Integration partners</strong> such as Google and Microsoft,
            solely to connect your email and calendar accounts at your direction
          </li>
          <li>
            <strong className="text-navy-900">Legal authorities</strong> when required by law or to
            protect the rights and safety of Clinty, our users, or others
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Data Retention">
        <p>
          We retain your account data for as long as your account is active. Email and calendar data
          processed by Clinty is retained only as long as needed to provide the service. Upon account
          cancellation, we delete or anonymize your data within 30 days, except where retention is
          required by law.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          We implement industry-standard security measures including encryption in transit and at rest,
          access controls, and regular security audits. No method of transmission over the internet is
          100% secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="7. Your Rights">
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Access, correct, or delete your personal data</li>
          <li>Export your data in a portable format</li>
          <li>Opt out of marketing communications</li>
          <li>Revoke access to connected email and calendar accounts at any time</li>
          <li>Lodge a complaint with a data protection authority</li>
        </ul>
        <p>
          To exercise these rights, please{' '}
          <Link to="/contact" className="text-teal-500 hover:underline">
            contact us
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Our website uses essential cookies to maintain your session and preferences. We may also use
          analytics cookies to understand how visitors use our site. You can control cookie preferences
          through your browser settings.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          Clinty is not intended for individuals under 18 years of age. We do not knowingly collect
          personal information from children.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes
          via email or a notice on our website. Continued use of Clinty after changes take effect
          constitutes acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact Us">
        <p>
          If you have questions about this Privacy Policy, please visit our{' '}
          <Link to="/contact" className="text-teal-500 hover:underline">contact page</Link>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
