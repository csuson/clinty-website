import { Link } from 'react-router-dom'
import SocialLinks from './SocialLinks'

export default function Footer() {
  return (
    <footer className="border-t border-navy-900/5 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
                <span className="text-teal-400 font-bold text-sm">C</span>
              </div>
              <span className="font-semibold text-lg text-navy-900">Clinty</span>
            </Link>
            <p className="text-sm text-navy-600 leading-relaxed">
              AI agents for every customer touchpoint — communication, scheduling, inventory, and paid media.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-navy-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-navy-600">
              <li><Link to="/#ad-campaigns" className="hover:text-navy-900 transition-colors">Ad Campaigns</Link></li>
              <li><Link to="/#features" className="hover:text-navy-900 transition-colors">Features</Link></li>
              <li><Link to="/#roi" className="hover:text-navy-900 transition-colors">ROI Calculator</Link></li>
              <li><Link to="/#pricing" className="hover:text-navy-900 transition-colors">Pricing</Link></li>
              <li><Link to="/#integrations" className="hover:text-navy-900 transition-colors">Integrations</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-navy-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-navy-600">
              <li><a href="#" className="hover:text-navy-900 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-navy-900 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-navy-900 transition-colors">Careers</a></li>
              <li><Link to="/contact" className="hover:text-navy-900 transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-navy-900 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-navy-600">
              <li><Link to="/privacy" className="hover:text-navy-900 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-navy-900 transition-colors">Terms of Service</Link></li>
              <li><Link to="/contact" className="hover:text-navy-900 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-900/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-navy-600 text-center md:text-left">
            <p>&copy; {new Date().getFullYear()} Clinty, Inc. All rights reserved.</p>
          </div>
          <SocialLinks />
        </div>
      </div>
    </footer>
  )
}
