import type { RunRecord, CaseRecord } from './types.js';

export interface SlackAlert {
  header: string;
  fields: Record<string, string>;
  links: Record<string, string>;
  footer: string;
}

export class SlackAlertFormatter {
  format(run: RunRecord, caseRecord?: CaseRecord): SlackAlert {
    const header = `${run.severity} • Credit ${run.variance_multiplier >= 2 ? 'Spike' : 'Event'} • ${run.scenario_name}`;

    const fields = {
      Credits: `${run.credits_total} (Baseline ${run.baseline_expected_credits}) → ${run.variance_multiplier.toFixed(2)}×`,
      'Job Type': run.job_type,
      'Misconfig Likelihood': run.misconfig_likelihood,
      'Risk Flags': run.risk_flags.join(', ') || 'none',
    };

    const links: Record<string, string> = {
      'Open Run': run.artifacts_link || `runs/${run.run_id}`,
    };

    if (caseRecord) {
      links['Open Case'] = `[Notion Case URL for ${caseRecord.case_id}]`;
    }

    const footer = this.generateFooter(run);

    return { header, fields, links, footer };
  }

  private generateFooter(run: RunRecord): string {
    const actions: string[] = [];

    if (run.severity === 'SEV0') {
      actions.push('Quarantined artifacts', 'Downstream dispatch blocked');
    } else if (run.severity === 'SEV1') {
      actions.push('Require approval before rerun');
    }

    return actions.length > 0
      ? `Auto-actions: ${actions.join(' / ')}`
      : 'No auto-actions taken';
  }

  renderMarkdown(alert: SlackAlert): string {
    let md = `**${alert.header}**\n\n`;
    
    for (const [key, value] of Object.entries(alert.fields)) {
      md += `• **${key}:** ${value}\n`;
    }

    md += `\n**Links:**\n`;
    for (const [label, url] of Object.entries(alert.links)) {
      md += `• ${label}: ${url}\n`;
    }

    md += `\n_${alert.footer}_`;

    return md;
  }
}
