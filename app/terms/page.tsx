import Link from 'next/link'
import { Calendar } from 'lucide-react'

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Agreement to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing or using Syncthesis ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Description of Service</h2>
            <p className="text-slate-700 leading-relaxed">
              Syncthesis is an AI-powered calendar scheduling platform that helps users coordinate meetings by analyzing calendar availability and suggesting optimal meeting times. The Service integrates with Google Calendar and Microsoft Outlook to provide scheduling functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">User Accounts</h2>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Account Creation</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              To access certain features, you must create an account by connecting a supported calendar provider. You agree to:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
              <li>Not share your account with others</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Account Termination</h3>
            <p className="text-slate-700 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our discretion. You may delete your account at any time through the account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Subscription Plans and Billing</h2>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Subscription Tiers</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Syncthesis offers multiple subscription tiers:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Free:</strong> Limited features with usage restrictions</li>
              <li><strong>Professional ($15/month):</strong> Enhanced features for individuals</li>
              <li><strong>Business ($35/month):</strong> Team features and integrations</li>
              <li><strong>Coaching ($65/month):</strong> Advanced features for coaches and course creators</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Payment Terms</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Paid subscriptions are billed monthly in advance. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Provide valid payment information</li>
              <li>Authorize recurring monthly charges</li>
              <li>Pay all applicable taxes</li>
              <li>Accept that prices may change with 30 days notice</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Refund Policy</h3>
            <p className="text-slate-700 leading-relaxed">
              Refunds are provided at our discretion. If you cancel your subscription, you will retain access until the end of your current billing period. No refunds will be issued for partial months.
            </p>

            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">Cancellation</h3>
            <p className="text-slate-700 leading-relaxed">
              You may cancel your subscription at any time through your account settings or the Stripe billing portal. Cancellation takes effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Acceptable Use</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malicious code or malware</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Scrape or harvest data from the Service</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Use the Service in a way that could harm Syncthesis or its users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Calendar Integration and Data Access</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              By connecting your calendar, you grant Syncthesis permission to:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Read your calendar free/busy information</li>
              <li>Create, modify, and delete calendar events on your behalf</li>
              <li>Access event metadata necessary for scheduling</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-4">
              You can revoke calendar access at any time through your account settings or directly with your calendar provider.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Intellectual Property</h2>
            <p className="text-slate-700 leading-relaxed">
              The Service and its original content, features, and functionality are owned by Syncthesis and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">User Content</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              You retain ownership of any content you submit through the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and process your content solely to provide the Service.
            </p>
            <p className="text-slate-700 leading-relaxed">
              You are responsible for the accuracy and legality of your content and represent that you have all necessary rights to share it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Disclaimer of Warranties</h2>
            <p className="text-slate-700 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-slate-700 leading-relaxed mt-4">
              We do not warrant that:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>The Service will be uninterrupted or error-free</li>
              <li>Defects will be corrected</li>
              <li>The Service is free of viruses or harmful components</li>
              <li>Results obtained from the Service will be accurate or reliable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Limitation of Liability</h2>
            <p className="text-slate-700 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYNCTHESIS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="text-slate-700 leading-relaxed mt-4">
              Our total liability for any claims arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Indemnification</h2>
            <p className="text-slate-700 leading-relaxed">
              You agree to indemnify and hold harmless Syncthesis and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Third-Party Services</h2>
            <p className="text-slate-700 leading-relaxed">
              The Service integrates with third-party services including Google Calendar, Microsoft Outlook, and Stripe. Your use of these services is subject to their respective terms and conditions. We are not responsible for the availability, accuracy, or content of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Modifications to Service</h2>
            <p className="text-slate-700 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Governing Law</h2>
            <p className="text-slate-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of the United States.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Dispute Resolution</h2>
            <p className="text-slate-700 leading-relaxed">
              Any dispute arising from these Terms or the Service shall first be resolved through good faith negotiations. If negotiations fail, disputes may be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Severability</h2>
            <p className="text-slate-700 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="list-none pl-0 text-slate-700 space-y-2 mt-4">
              <li>Email: legal@syncthesis.co</li>
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
