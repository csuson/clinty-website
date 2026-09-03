import { Link } from 'react-router-dom'
import LegalPageLayout, { LegalSection } from '../components/LegalPageLayout'

const LAST_UPDATED = 'July 10, 2026'

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      path="/terms"
      description="Clinty Terms of Service — rules for using AI agents, connected accounts, subscriptions, and ad campaign features."
    >
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Clinty platform
        and services provided by Clinty, Inc. (&ldquo;Clinty,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;). By creating an account or using our services, you agree to these Terms.
      </p>

      <LegalSection title="1. Description of Service">
        <p>
          Clinty provides AI-powered agents that automate customer email correspondence and appointment
          scheduling for small businesses. Our services include email reading and response, calendar
          management, appointment booking, reminders, and related automation features.
        </p>
      </LegalSection>

      <LegalSection title="2. Account Registration">
        <p>
          You must provide accurate and complete information when creating an account. You are
          responsible for maintaining the confidentiality of your login credentials and for all
          activity that occurs under your account. Notify us immediately through our{' '}
          <Link to="/contact" className="text-teal-500 hover:underline">contact page</Link>{' '}
          if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="3. Authorized Use">
        <p>You agree to use Clinty only for lawful business purposes. You may not:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use the service to send spam, phishing, or unsolicited bulk messages</li>
          <li>Impersonate another person or misrepresent your affiliation with any entity</li>
          <li>Attempt to reverse engineer, scrape, or interfere with our systems</li>
          <li>Use Clinty in a way that violates applicable laws or third-party terms of service</li>
          <li>Share account access with unauthorized parties</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. AI Agent Behavior">
        <p>
          Clinty&apos;s AI agents act on your behalf based on the rules, preferences, and permissions you
          configure. You are ultimately responsible for the communications sent through your account,
          including AI-generated emails and calendar actions.
        </p>
        <p>
          We recommend reviewing agent activity regularly, especially during the initial setup period.
          Clinty provides tools to require manual approval before messages are sent, and we encourage
          you to use these controls until you are confident in your agent&apos;s configuration.
        </p>
      </LegalSection>

      <LegalSection title="5. Connected Accounts">
        <p>
          Clinty requires access to your email and calendar accounts to function. By connecting these
          accounts, you grant Clinty permission to read, draft, and send emails and manage calendar
          events as configured. You may revoke this access at any time through your account settings
          or by disconnecting the integration.
        </p>
      </LegalSection>

      <LegalSection title="6. Subscription and Billing">
        <p>
          Paid plans are billed monthly or annually as selected at signup. Fees are non-refundable
          except as required by law or as stated in our refund policy. We offer a 14-day free trial
          for new accounts; you will not be charged until the trial period ends unless you cancel
          beforehand.
        </p>
        <p>
          We reserve the right to change pricing with 30 days&apos; notice. Price changes apply to
          subsequent billing cycles and do not affect your current term.
        </p>
      </LegalSection>

      <LegalSection title="7. Service Availability">
        <p>
          We strive to maintain 99.7% uptime but do not guarantee uninterrupted access. Scheduled
          maintenance, third-party outages, and events beyond our reasonable control may cause
          temporary disruptions. We are not liable for delays or failures in email delivery or
          calendar synchronization caused by third-party providers.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual Property">
        <p>
          Clinty and its original content, features, and functionality are owned by Clinty, Inc. and
          protected by copyright, trademark, and other intellectual property laws. You retain ownership
          of your business data, email content, and customer information processed through the platform.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Clinty shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, including lost profits, lost
          business, or missed appointments, arising from your use of the service.
        </p>
        <p>
          Our total liability for any claim related to the service is limited to the amount you paid
          Clinty in the 12 months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection title="10. Termination">
        <p>
          You may cancel your account at any time through your account settings or by contacting
          support. We may suspend or terminate your account if you violate these Terms or if
          continued service poses a security or legal risk. Upon termination, your right to use Clinty
          ceases immediately and we will delete your data in accordance with our{' '}
          <Link to="/privacy" className="text-teal-500 hover:underline">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="11. Dispute Resolution">
        <p>
          These Terms are governed by the laws of the State of California, without regard to
          conflict-of-law principles. Any disputes shall be resolved through binding arbitration in
          San Francisco, California, except that either party may seek injunctive relief in court
          for intellectual property violations.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to These Terms">
        <p>
          We may modify these Terms at any time. We will provide notice of material changes via email
          or through the platform. Your continued use of Clinty after changes take effect constitutes
          acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Questions about these Terms? Reach us through our{' '}
          <Link to="/contact" className="text-teal-500 hover:underline">contact page</Link>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
