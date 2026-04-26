import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 border-t border-slate-700 text-slate-300">
      {/* Main Footer Content */}
      <div className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Company */}
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">SintraPrime</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/" className="hover:text-accent transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/demo" className="hover:text-accent transition-colors">
                    Demo
                  </a>
                </li>
                <li>
                  <a href="/blog" className="hover:text-accent transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="/careers" className="hover:text-accent transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/terms" className="hover:text-accent transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-accent transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/disclaimer" className="hover:text-accent transition-colors">
                    Legal Disclaimer
                  </a>
                </li>
                <li>
                  <a href="/security" className="hover:text-accent transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/help" className="hover:text-accent transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-accent transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="/faq" className="hover:text-accent transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="/status" className="hover:text-accent transition-colors">
                    System Status
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://twitter.com/sintraprime" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com/company/sintraprime" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://github.com/sintraprime" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@sintraprime.com" className="hover:text-accent transition-colors">
                    Email
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 pt-8">
            {/* Bottom Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Copyright */}
              <div className="text-sm text-slate-500">
                © {currentYear} SintraPrime, Inc. All rights reserved.
              </div>

              {/* Social Icons */}
              <div className="flex gap-6">
                <a
                  href="https://twitter.com/sintraprime"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-accent transition-colors"
                  title="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 9-1 9-5.6a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com/company/sintraprime"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-accent transition-colors"
                  title="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                <a
                  href="https://github.com/sintraprime"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-accent transition-colors"
                  title="GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>

              {/* Trust Badge */}
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>🔒 SSL Encrypted</span>
                <span>•</span>
                <span>GDPR Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div className="bg-slate-950 border-t border-slate-700 px-4 py-4">
        <div className="max-w-6xl mx-auto text-xs text-slate-500">
          <p>
            <strong>Disclaimer:</strong> SintraPrime provides AI-powered legal and financial guidance for informational purposes only and does not constitute legal advice. For specific legal matters, consult a licensed attorney in your jurisdiction. We are not a law firm.
          </p>
        </div>
      </div>
    </footer>
  );
};
