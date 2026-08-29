import { Link } from 'react-router-dom'

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
              AI agents that handle your customer emails and appointment scheduling.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-navy-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-navy-600">
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
          <div className="flex gap-4">
            <a href="#" className="text-navy-600 hover:text-navy-900 transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" className="text-navy-600 hover:text-navy-900 transition-colors" aria-label="LinkedIn">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.062 2.062 0 114.126 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
