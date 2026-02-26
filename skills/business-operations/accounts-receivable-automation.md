# Accounts Receivable Automation Skill

**Category:** Business Operations  
**Agent:** Accounts Receivable Agent  
**Version:** 1.0.0  
**Status:** Active  

## Purpose

Automate invoice tracking, payment reminders, and reconciliation to optimize cash flow.

## Capabilities

- Invoice generation and tracking via Stripe MCP integration
- Automated payment reminder sequences (7/14/30/60/90 days)
- Payment reconciliation across multiple channels
- Aging report generation
- DSO (Days Sales Outstanding) optimization
- Bad debt identification and escalation

## Reminder Sequence

| Day | Action | Channel |
|-----|--------|---------|
| 7 | Friendly reminder | Email |
| 14 | Second notice | Email |
| 30 | Urgent notice | Email + Slack |
| 60 | Final notice | Email + Phone |
| 90 | Bad debt escalation | Legal team |

## Integration Points

- Stripe (via MCP server) for payment processing
- Notion for client and invoice tracking
- Gmail for reminder emails
- Slack for internal notifications (#sintraprime-ops)

## ROI Impact

- Reduces DSO by 20-40%
- Saves 15+ hours/week for finance teams
- Reduces bad debt write-offs by 30%
- Improves cash flow predictability
