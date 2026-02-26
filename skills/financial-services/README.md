# Financial Services Skills

**Source:** [anthropics/financial-services-plugins](https://github.com/anthropics/financial-services-plugins)  
**Integrated:** February 26, 2026  

This directory contains skills sourced from Anthropic's Financial Services Plugins repository. These plugins provide institutional-quality financial analysis, wealth management, investment banking, private equity, and equity research capabilities.

## Available Plugins

| Plugin | Commands | Primary Agent | ROI |
|--------|----------|---------------|-----|
| Financial Analysis | /comps, /dcf, /lbo, /3statements, /check-deck, /check-model | Financial Analysis Agent | Replaces junior analyst ($80K-$120K savings) |
| Wealth Management | /client-review, /financial-plan, /rebalance, /client-report, /tlh, /proposal | Wealth Management Agent | $5K-$50K/year tax savings |
| Investment Banking | /cim, /pitch-deck, /merger-model, /buyer-list, /deal-tracker, /teaser, /process-letter | Investment Banking Agent | CIM drafting weeks → days |
| Private Equity | /source, /screen, /dd-checklist, /ic-memo, /returns, /value-creation, /portfolio-kpi | Private Equity Agent | 10x more deal screening |
| Equity Research | /earnings, /initiating-coverage, /morning-note, /one-pager, /thesis-tracker | Financial Analysis Agent | Supports AI Market Intel |

## MCP Data Connectors (11 total)

Daloopa, Morningstar, S&P Global, FactSet, Moodys, MT Newswires, Aiera, LSEG, PitchBook, Chronograph, Egnyte

## Partner-Built Plugins

- **LSEG Financial Data Plugin** — Bonds, FX, options, macro dashboards (8 commands)
- **S&P Global Data Plugin** — Company tearsheets, earnings previews, funding digests

## Setup

The financial services plugins are cloned at `/home/ubuntu/financial-services-plugins`. To integrate with SintraPrime agents, reference the plugin documentation in each subdirectory.
