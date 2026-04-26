import React, { useState } from 'react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: 1,
    question: "Is SintraPrime a substitute for hiring a lawyer?",
    answer: "SintraPrime handles 80-90% of common legal and financial tasks: trust analysis, document preparation, filing, compliance monitoring, and credit optimization. For complex litigation or specialized court representation, you'd still hire a lawyer. But for routine legal work, SintraPrime is faster and cheaper than a law firm."
  },
  {
    id: 2,
    question: "Is my data secure and private?",
    answer: "Yes. We use enterprise-grade AES-256 encryption, zero-knowledge architecture (we can't see your data), and comply with GDPR, CCPA, and other privacy laws. Your documents are stored in encrypted vaults that only you control. We never sell or share your data."
  },
  {
    id: 3,
    question: "How fast can SintraPrime file documents?",
    answer: "Most filings complete within 1-3 business days, depending on government processing times. For example: LLC formation typically takes 2-5 business days after filing, tax ID assignment is instant, and contract reviews happen in minutes."
  },
  {
    id: 4,
    question: "What's included in each pricing tier?",
    answer: "Starter ($99/mo): AI Q&A, basic trust analysis, credit review, templates. Pro ($499/mo): Everything in Starter + autonomous filing, entity formation, tax planning, priority support. Enterprise: Everything in Pro + white-label, API access, dedicated strategist."
  },
  {
    id: 5,
    question: "Do you offer a free trial?",
    answer: "We offer a 30-day money-back guarantee on all plans. If you're not satisfied, we refund 100% with no questions asked. You can also explore our demo app to see the platform in action before signing up."
  },
  {
    id: 6,
    question: "How does SintraPrime handle tax filings?",
    answer: "We analyze your income, deductions, and filing status; prepare your 1040, 1065, S-Corp, or other returns; and help you file or work with a CPA. We're not a CPA firm, but we handle prep and filing coordination to make taxes simple."
  },
  {
    id: 7,
    question: "Can I use SintraPrime for my business?",
    answer: "Yes! SintraPrime handles LLC/Corp formation, business tax planning, compliance monitoring, and contract review. Our Pro and Enterprise plans are designed for entrepreneurs."
  },
  {
    id: 8,
    question: "What if I need human support?",
    answer: "Starter plans get email support. Pro and Enterprise get priority phone support during business hours and access to our network of vetted lawyers for consultation. You can also request a full demo with our team anytime."
  },
  {
    id: 9,
    question: "Can I cancel anytime?",
    answer: "Yes. Cancel your subscription anytime with no penalty. If you cancel within 30 days, we refund your full subscription. After 30 days, you keep access through the end of your billing cycle."
  },
  {
    id: 10,
    question: "How does the AI actually work?",
    answer: "SintraPrime uses large language models trained on legal case law, tax codes, and financial best practices. It analyzes your situation, identifies risks and opportunities, and generates customized strategies. All recommendations are reviewed by our compliance team."
  }
];

export const FAQ: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 px-4 bg-slate-800">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-slate-300">
            Got questions? We've got answers. Check out our most common inquiries below.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {faqItems.map((item) => (
            <div
              key={item.id}
              className="collapse collapse-arrow border border-slate-700 bg-slate-900 hover:border-accent/50 transition-all duration-200"
              onClick={() => toggleExpanded(item.id)}
            >
              <input
                type="checkbox"
                checked={expandedId === item.id}
                onChange={() => toggleExpanded(item.id)}
                className="cursor-pointer"
              />
              <div className="collapse-title text-lg font-semibold text-white">
                <span className="flex items-center gap-2">
                  <span className="text-accent text-xl">
                    {expandedId === item.id ? '−' : '+'}
                  </span>
                  {item.question}
                </span>
              </div>
              <div className="collapse-content bg-slate-800 border-t border-slate-700">
                <p className="text-slate-300 pt-4">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions? */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-8 border border-slate-700 text-center mt-12">
          <h3 className="text-2xl font-bold text-white mb-2">Still have questions?</h3>
          <p className="text-slate-300 mb-6">
            Our team is ready to help. Schedule a personalized demo or reach out to our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/demo" className="btn btn-accent btn-sm font-bold text-slate-900">
              Schedule Demo
            </a>
            <a href="/contact" className="btn btn-outline btn-sm text-accent border-accent">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
