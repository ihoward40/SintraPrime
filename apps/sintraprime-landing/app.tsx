import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { CaseStudies } from './components/CaseStudies';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import './styles/globals.css';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      {/* Navigation */}
      <nav className="navbar bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
        <div className="navbar-start">
          <div className="dropdown">
            <button
              tabIndex={0}
              className="btn btn-ghost btn-circle lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            {menuOpen && (
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-slate-800 rounded-box w-52"
              >
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#pricing">Pricing</a>
                </li>
                <li>
                  <a href="#faq">FAQ</a>
                </li>
                <li>
                  <a href="/demo">Demo</a>
                </li>
              </ul>
            )}
          </div>
          <a href="/" className="btn btn-ghost normal-case text-xl font-bold">
            <span className="text-2xl">✦</span>
            SintraPrime
          </a>
        </div>

        {/* Desktop Menu */}
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <a href="#features" className="hover:text-accent">Features</a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-accent">Pricing</a>
            </li>
            <li>
              <a href="#faq" className="hover:text-accent">FAQ</a>
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="navbar-end gap-2">
          <a href="/demo" className="btn btn-ghost hidden sm:flex text-accent hover:text-accent">
            Explore Demo
          </a>
          <a href="/intake" className="btn btn-accent btn-sm font-bold text-slate-900">
            Get Started
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <Hero />

        {/* Case Studies */}
        <CaseStudies />

        {/* Features */}
        <section id="features">
          <Features />
        </section>

        {/* Pricing */}
        <section id="pricing">
          <Pricing />
        </section>

        {/* FAQ */}
        <FAQ />

        {/* Final CTA */}
        <section className="py-20 px-4 bg-gradient-to-b from-slate-800 to-slate-900">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to take control?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Join thousands of people who've reclaimed their legal and financial independence with SintraPrime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/demo" className="btn btn-accent btn-lg font-bold text-slate-900 hover:shadow-2xl hover:shadow-amber-400">
                Explore Demo Now
              </a>
              <a href="/intake" className="btn btn-outline btn-lg text-accent border-accent hover:bg-accent hover:text-slate-900">
                Start Your Journey
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 btn btn-circle btn-accent text-slate-900 opacity-0 hover:opacity-100 transition-opacity"
        title="Scroll to top"
      >
        ↑
      </button>
    </div>
  );
}
