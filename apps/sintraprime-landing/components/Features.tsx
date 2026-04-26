import React from 'react';

interface Feature {
  id: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
}

const features: Feature[] = [
  {
    id: 1,
    icon: "⚖️",
    title: "AI Legal Analysis",
    description: "Advanced legal intelligence powered by LLMs trained on case law and regulations",
    details: [
      "Contract review and risk analysis",
      "Trust and estate law optimization",
      "Regulatory compliance monitoring",
      "Real-time legal updates"
    ]
  },
  {
    id: 2,
    icon: "💳",
    title: "Credit Optimization",
    description: "Autonomous credit score improvement and debt management strategies",
    details: [
      "Credit report analysis and disputes",
      "Creditor negotiation automation",
      "Strategic debt payoff planning",
      "Credit score projections"
    ]
  },
  {
    id: 3,
    icon: "📋",
    title: "Autonomous Filing",
    description: "100% automated document generation and government filing",
    details: [
      "LLC/Corporation formation",
      "Tax filings (1040, 1065, S-Corp)",
      "State compliance documents",
      "Real-time filing status tracking"
    ]
  },
  {
    id: 4,
    icon: "🔐",
    title: "Sovereign Data Security",
    description: "Your data stays yours. Enterprise-grade encryption and privacy controls",
    details: [
      "End-to-end encryption",
      "Zero-knowledge architecture",
      "GDPR & CCPA compliant",
      "Personal data vault control"
    ]
  },
  {
    id: 5,
    icon: "🤖",
    title: "24/7 AI Assistant",
    description: "Instant answers to legal and financial questions anytime",
    details: [
      "Real-time legal Q&A",
      "Financial strategy guidance",
      "Custom compliance alerts",
      "No waiting for callbacks"
    ]
  },
  {
    id: 6,
    icon: "💰",
    title: "Transparent Pricing",
    description: "Flat-rate plans with no hidden fees or surprise lawyer bills",
    details: [
      "Starting at $99/month",
      "All features included in tier",
      "Money-back guarantee",
      "Cancel anytime"
    ]
  }
];

export const Features: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Why Choose SintraPrime Over Traditional Law Firms?
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            We're not replacing lawyers—we're replacing the need for expensive hourly consultations. Here's how:
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="card bg-slate-900 border border-slate-700 hover:border-accent hover:bg-slate-800 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
            >
              <div className="card-body">
                {/* Icon */}
                <div className="text-5xl mb-4">{feature.icon}</div>

                {/* Title */}
                <h3 className="card-title text-white text-lg mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-300 text-sm mb-4">
                  {feature.description}
                </p>

                {/* Details List */}
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                      <span className="text-accent flex-shrink-0 mt-1">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Section */}
        <div className="bg-slate-900 rounded-lg p-8 border border-slate-700">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            SintraPrime vs. Traditional Approach
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-accent font-bold">Factor</th>
                  <th className="text-center py-3 px-4 text-white font-bold">Traditional Lawyers</th>
                  <th className="text-center py-3 px-4 text-accent font-bold">SintraPrime</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700">
                  <td className="py-3 px-4 text-slate-300">Cost</td>
                  <td className="py-3 px-4 text-center text-red-400">$300-800/hour</td>
                  <td className="py-3 px-4 text-center text-accent font-bold">$99-999/mo</td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="py-3 px-4 text-slate-300">Response Time</td>
                  <td className="py-3 px-4 text-center text-red-400">24-48 hours</td>
                  <td className="py-3 px-4 text-center text-accent font-bold">Instant (24/7)</td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="py-3 px-4 text-slate-300">Document Filing</td>
                  <td className="py-3 px-4 text-center text-red-400">7-14 days + fees</td>
                  <td className="py-3 px-4 text-center text-accent font-bold">1-2 days automated</td>
                </tr>
                <tr className="border-b border-slate-700">
                  <td className="py-3 px-4 text-slate-300">Availability</td>
                  <td className="py-3 px-4 text-center text-red-400">Business hours only</td>
                  <td className="py-3 px-4 text-center text-accent font-bold">Always on</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300">Scalability</td>
                  <td className="py-3 px-4 text-center text-red-400">Limited capacity</td>
                  <td className="py-3 px-4 text-center text-accent font-bold">Unlimited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
