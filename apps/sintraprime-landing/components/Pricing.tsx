import React from 'react';

interface PricingTier {
  id: number;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  icon: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 1,
    name: "Starter",
    price: "$99",
    period: "per month",
    description: "Perfect for personal financial management and basic legal guidance",
    icon: "🌱",
    highlighted: false,
    features: [
      "AI Legal Q&A (unlimited)",
      "Basic trust analysis",
      "Credit report review",
      "Document templates",
      "Email support",
      "Mobile app access",
      "Monthly compliance alerts"
    ],
    cta: "Get Started"
  },
  {
    id: 2,
    name: "Pro",
    price: "$499",
    period: "per month",
    description: "For entrepreneurs and individuals managing complex finances",
    icon: "⚡",
    highlighted: true,
    features: [
      "Everything in Starter, plus:",
      "Advanced trust optimization",
      "Credit score recovery planning",
      "Autonomous document filing",
      "Entity formation (LLC/Corp)",
      "Tax planning and filing prep",
      "Quarterly compliance reviews",
      "Priority phone support",
      "Automated contract review"
    ],
    cta: "Start Free Trial"
  },
  {
    id: 3,
    name: "Enterprise",
    price: "Custom",
    period: "based on needs",
    description: "White-label and custom solutions for larger organizations",
    icon: "🏆",
    highlighted: false,
    features: [
      "Everything in Pro, plus:",
      "Dedicated AI strategist",
      "Custom integrations",
      "Multi-user accounts",
      "Advanced compliance automation",
      "White-label options",
      "API access",
      "SLA guarantees",
      "On-demand legal consultation"
    ],
    cta: "Contact Sales"
  }
];

export const Pricing: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            No hidden fees. No surprise bills. Choose the plan that fits your life.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4">
            <span className="text-slate-400">Monthly</span>
            <input type="checkbox" className="toggle toggle-accent" defaultChecked />
            <span className="text-slate-400">Annual <span className="text-accent text-sm ml-1">(20% off)</span></span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`card transition-all duration-300 ${
                tier.highlighted
                  ? 'bg-gradient-to-br from-amber-900 to-slate-900 border-2 border-accent shadow-2xl shadow-accent/30 scale-105'
                  : 'bg-slate-800 border border-slate-700 hover:border-accent/50'
              }`}
            >
              <div className="card-body">
                {/* Popular Badge */}
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="badge badge-accent badge-lg text-slate-900 font-bold">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Icon and Name */}
                <div className="mb-2">
                  <span className="text-5xl mb-2 block">{tier.icon}</span>
                  <h3 className="card-title text-white text-2xl">
                    {tier.name}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-slate-300 text-sm mb-4">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold text-accent">{tier.price}</span>
                  <span className="text-slate-400 ml-2 text-sm">{tier.period}</span>
                </div>

                {/* CTA Button */}
                <div className="mb-6">
                  <a
                    href={tier.highlighted ? '/demo?plan=pro' : '/demo?plan=' + tier.name.toLowerCase()}
                    className={`btn btn-block font-bold ${
                      tier.highlighted
                        ? 'btn-accent text-slate-900 hover:shadow-xl'
                        : 'btn-outline btn-accent text-accent border-accent hover:bg-accent hover:text-slate-900'
                    }`}
                  >
                    {tier.cta}
                  </a>
                </div>

                {/* Features List */}
                <div className="divider my-2" />
                <ul className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-3 text-sm ${
                        feature.startsWith('Everything')
                          ? 'font-semibold text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-accent flex-shrink-0 mt-0.5">
                        {feature.startsWith('Everything') ? '→' : '✓'}
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Assurance */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Money-Back Guarantee</h3>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            We're confident you'll love SintraPrime. If you're not satisfied in your first 30 days, we'll refund 100% of your subscription cost. No questions asked.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">30</div>
              <div className="text-sm text-slate-400">Day Money-Back</div>
            </div>
            <div className="divider divider-horizontal" />
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">0</div>
              <div className="text-sm text-slate-400">Credit Card Required</div>
            </div>
            <div className="divider divider-horizontal" />
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">∞</div>
              <div className="text-sm text-slate-400">Cancel Anytime</div>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-slate-400 mb-4">Have billing questions?</p>
          <a href="#faq" className="link link-accent font-semibold">
            See our FAQ below
          </a>
        </div>
      </div>
    </section>
  );
};
