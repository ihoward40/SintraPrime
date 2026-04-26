import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section className="hero min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="mb-6 inline-block">
            <span className="badge badge-accent badge-lg font-semibold">
              🚀 AI-Powered Legal & Financial Strategy
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Your AI Legal & Financial Strategist
            <span className="block text-accent">Available 24/7</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
            From trust law to credit optimization to autonomous filing. 
            <span className="block font-semibold text-accent">Sovereign AI for your life.</span>
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-col md:flex-row justify-center gap-8 mb-12 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg">✓</span>
              <span>No Lawyer Required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg">✓</span>
              <span>Instant Results</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent text-lg">✓</span>
              <span>Always Available</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/demo" className="btn btn-accent btn-lg font-bold text-slate-900 hover:shadow-2xl hover:shadow-amber-400">
              Explore Demo
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a href="/intake" className="btn btn-outline btn-lg text-accent border-accent hover:bg-accent hover:text-slate-900">
              Request Full Demo
            </a>
          </div>

          {/* Social Proof */}
          <div className="mt-16 pt-8 border-t border-slate-700">
            <p className="text-slate-400 text-sm mb-4">Trusted by individuals and small businesses</p>
            <div className="flex justify-center items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">2K+</div>
                <div className="text-xs text-slate-400">Active Users</div>
              </div>
              <div className="divider divider-horizontal" />
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">$50M+</div>
                <div className="text-xs text-slate-400">Client Assets Protected</div>
              </div>
              <div className="divider divider-horizontal" />
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">98%</div>
                <div className="text-xs text-slate-400">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
