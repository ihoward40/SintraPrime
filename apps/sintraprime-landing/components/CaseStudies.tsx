import React from 'react';

interface CaseStudy {
  id: number;
  title: string;
  industry: string;
  problem: string;
  solution: string;
  results: string[];
  metric: string;
  icon: string;
}

const caseStudies: CaseStudy[] = [
  {
    id: 1,
    title: "Family Trust Restructuring",
    industry: "Wealth Management",
    problem: "Sarah inherited a $2.3M family trust but faced complex tax obligations and inefficient distribution structures. Traditional estate planning would have cost $15K and taken 6 months.",
    solution: "SintraPrime analyzed the trust structure, identified optimal distribution strategies, and automated the filing process using AI-powered legal templates.",
    results: [
      "$47K in first-year tax savings through optimized trust structure",
      "Distribution setup completed in 2 weeks (vs. 6 months traditional)",
      "Ongoing compliance monitoring automated"
    ],
    metric: "$47K Tax Savings",
    icon: "💎"
  },
  {
    id: 2,
    title: "Credit Score Recovery",
    industry: "Personal Finance",
    problem: "Michael had a 580 credit score due to 3 delinquent accounts and was unable to qualify for a business loan. He needed rapid credit recovery.",
    solution: "SintraPrime analyzed his credit report, negotiated with creditors, disputed incorrect entries, and created an automated repayment strategy.",
    results: [
      "Credit score improved from 580 to 720 in 6 months",
      "Successfully qualified for $250K business line of credit",
      "Saved $45K in avoided high-interest loans"
    ],
    metric: "580→720 Score",
    icon: "📈"
  },
  {
    id: 3,
    title: "Autonomous Business Incorporation",
    industry: "Entrepreneurship",
    problem: "Jennifer wanted to launch an e-commerce business but was overwhelmed by LLC formation, tax ID registration, and compliance requirements. Manual process would take weeks.",
    solution: "SintraPrime autonomously completed entity formation, secured EIN, filed state documents, and set up compliant accounting records.",
    results: [
      "Full business entity established in 3 days",
      "Saved $2,500 in legal and accounting fees",
      "Automated tax filing reminders and compliance tracking"
    ],
    metric: "3 Days, $2.5K Saved",
    icon: "🏢"
  }
];

export const CaseStudies: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Real Results. Real People.
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            See how SintraPrime has helped individuals and entrepreneurs reclaim control of their legal and financial lives
          </p>
        </div>

        {/* Case Studies Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {caseStudies.map((study) => (
            <div
              key={study.id}
              className="card bg-slate-800 border border-slate-700 hover:border-accent hover:shadow-xl hover:shadow-accent/20 transition-all duration-300"
            >
              <div className="card-body">
                {/* Icon and Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-4xl">{study.icon}</span>
                  </div>
                  <span className="badge badge-sm badge-accent text-slate-900 font-bold">
                    {study.industry}
                  </span>
                </div>

                {/* Title */}
                <h3 className="card-title text-white text-lg mb-2">
                  {study.title}
                </h3>

                {/* Problem */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-amber-300 mb-1">Challenge</p>
                  <p className="text-slate-300 text-sm">
                    {study.problem}
                  </p>
                </div>

                {/* Solution */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-amber-300 mb-1">SintraPrime Solution</p>
                  <p className="text-slate-300 text-sm">
                    {study.solution}
                  </p>
                </div>

                {/* Results */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-accent mb-2">Results</p>
                  <ul className="space-y-2">
                    {study.results.map((result, idx) => (
                      <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-accent mt-1">→</span>
                        <span>{result}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Metric Badge */}
                <div className="card-actions">
                  <div className="badge badge-lg badge-outline badge-accent font-bold text-accent">
                    {study.metric}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-400 mb-4">Ready to see your results?</p>
          <a href="/demo" className="btn btn-accent btn-lg font-bold text-slate-900">
            Explore Your Possibilities
          </a>
        </div>
      </div>
    </section>
  );
};
