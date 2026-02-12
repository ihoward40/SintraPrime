import type { RunRecord } from './types.js';

export interface CreditReviewReport {
  period_days: number;
  top_scenarios_by_spend: Array<{
    scenario_id: string;
    total_credits: number;
    run_count: number;
    avg_credits: number;
  }>;
  top_spikes: RunRecord[];
  baseline_candidates: string[];
}

export class CreditAggregator {
  generateWeeklyReport(runs: RunRecord[], days: number = 7): CreditReviewReport {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recentRuns = runs.filter(
      (r) => new Date(r.timestamp) >= cutoff
    );

    // Group by scenario
    const scenarioMap = new Map<string, { total: number; count: number }>();

    for (const run of recentRuns) {
      const existing = scenarioMap.get(run.scenario_id) || { total: 0, count: 0 };
      existing.total += run.credits_total;
      existing.count += 1;
      scenarioMap.set(run.scenario_id, existing);
    }

    const top_scenarios_by_spend = Array.from(scenarioMap.entries())
      .map(([scenario_id, { total, count }]) => ({
        scenario_id,
        total_credits: total,
        run_count: count,
        avg_credits: total / count,
      }))
      .sort((a, b) => b.total_credits - a.total_credits)
      .slice(0, 5);

    const top_spikes = recentRuns
      .filter((r) => r.variance_multiplier >= 2)
      .sort((a, b) => b.variance_multiplier - a.variance_multiplier)
      .slice(0, 5);

    const baseline_candidates: string[] = [];

    return {
      period_days: days,
      top_scenarios_by_spend,
      top_spikes,
      baseline_candidates,
    };
  }
}
