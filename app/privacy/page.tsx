import Link from 'next/link'
import { Calendar } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">Syncthesis</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              Syncthesis ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our calendar scheduling service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Personal Information</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              When you use Syncthesis, we may collect the following personal information:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Name and email address</li>
              <li>Calendar provider credentials (via OAuth)</li>
              <li>Meeting details and scheduling preferences</li>
              <li>Payment information (processed securely through Stripe)</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Calendar Data</h3>
            <p className="text-slate-700 leading-relaxed">
              We access your calendar data only to provide our scheduling service. We read your free/busy information to suggest optimal meeting times but do not store your full calendar events. Calendar access is provided through secure OAuth connections with Google Calendar and Microsoft Outlook.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Usage Data</h3>
            <p className="text-slate-700 leading-relaxed">
              We automatically collect certain information about your device and how you interact with our service, including:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>IP address and browser type</li>
              <li>Pages visited and features used</li>
              <li>Date and time of visits</li>
              <li>Referring website addresses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Use Your Information</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Provide, operate, and maintain our scheduling service</li>
              <li>Analyze calendar availability and suggest optimal meeting times</li>
              <li>Create and manage calendar events on your behalf</li>
              <li>Send meeting invitations and reminders</li>
              <li>Process payments and maintain billing records</li>
              <li>Improve and optimize our service</li>
              <li>Communicate with you about updates and support</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Security</h2>
            <p className="text-slate-700 leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>All data transmissions are encrypted using SSL/TLS</li>
              <li>Calendar connections use secure OAuth 2.0 authentication</li>
              <li>We do not store your calendar provider passwords</li>
              <li>Payment information is processed by Stripe and never stored on our servers</li>
              <li>Regular security audits and updates</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-4">
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>With meeting participants:</strong> We share necessary information (name, email, meeting details) with other participants of scheduled meetings</li>
              <li><strong>Service providers:</strong> We use third-party services (Google Calendar API, Microsoft Graph API, Stripe) to provide our service</li>
              <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect our rights</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Rights and Choices</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct your information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Revoke access:</strong> Disconnect calendar providers at any time</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-4">
              To exercise any of these rights, please contact us at privacy@syncthesis.co or use the account settings in your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Retention</h2>
            <p className="text-slate-700 leading-relaxed">
              We retain your personal information only as long as necessary to provide our service and comply with legal obligations. When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Cookies and Tracking</h2>
            <p className="text-slate-700 leading-relaxed">
              We use cookies and similar tracking technologies to maintain your session and improve your experience. You can control cookies through your browser settings, but disabling them may affect functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Children's Privacy</h2>
            <p className="text-slate-700 leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">International Users</h2>
            <p className="text-slate-700 leading-relaxed">
              Syncthesis is operated in the United States. If you are located outside the United States, please be aware that information we collect will be transferred to and processed in the United States. By using our service, you consent to this transfer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <ul className="list-none pl-0 text-slate-700 space-y-2 mt-4">
              <li>Email: privacy@syncthesis.co</li>
              <li>Support: <Link href="/support" className="text-blue-600 hover:text-blue-700">syncthesis.co/support</Link></li>
            </ul>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Syncthesis</span>
            </div>
            <div className="flex space-x-6 text-sm text-slate-600">
              <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-900">Terms</Link>
              <Link href="/support" className="hover:text-slate-900">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
