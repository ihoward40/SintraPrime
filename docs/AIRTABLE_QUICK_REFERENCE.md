# Airtable CRM — Quick Reference

## Base Structure at a Glance

```
SintraPrime-CRM
├── Leads (464 fields)
│   ├── LeadID (text, unique)
│   ├── FirstName, LastName (text, required)
│   ├── Email (email, required)
│   ├── Phone (phone)
│   ├── Location (text)
│   ├── LegalSituation (multi-select)
│   ├── FinancialSnapshot (long text)
│   ├── Goals (multi-select)
│   ├── QualificationScore (number 0-100)
│   ├── AssignedAgent (single select)
│   ├── Status (single select) → [New | Contacted | Demo Scheduled | Demo Completed | Proposal Sent | Won | Lost]
│   ├── SubmittedAt (date)
│   ├── Notes (long text)
│   └── Link to Deals ← Deals.LeadID
│
├── Deals (9 fields)
│   ├── DealID (text, unique)
│   ├── LeadID (link to Leads) → [One Leads : Many Deals]
│   ├── ClientName (rollup) = CONCATENATE(FirstName, LastName)
│   ├── ContractValue (currency)
│   ├── Stage (single select) → [Discovery | Proposal | Negotiation | Closed Won | Closed Lost]
│   ├── CloseDate (date)
│   ├── DaysToClose (formula) = DATETIME_DIFF(CloseDate, NOW(), 'days')
│   ├── Notes (long text)
│   └── Link to Payments ← Payments.DealID
│
├── Payments (9 fields)
│   ├── PaymentID (text, unique)
│   ├── DealID (link to Deals) → [One Deals : Many Payments]
│   ├── ClientEmail (rollup) = DealID → LeadID → Email
│   ├── Amount (currency)
│   ├── Frequency (single select) → [One-time | Monthly | Quarterly | Annual]
│   ├── Status (single select) → [Pending | Active | Paid | Failed | Canceled]
│   ├── NextBillingDate (date) ← Trigger for automations
│   ├── StripeSubscriptionID (text)
│   └── Notes (long text)
│
└── Agents (6 fields)
    ├── AgentName (text, unique)
    ├── Specialty (single select) → [Legal | Financial | Combined]
    ├── CurrentLeads (count) = Count of Leads where Status in [Demo Scheduled, Proposal Sent]
    ├── DealsWon (rollup) = Count of Deals where Stage = "Closed Won"
    ├── AnnualRevenue (rollup) = Sum of Deals.ContractValue
    ├── Notes (long text)
    └── Link to Leads ← Leads.AssignedAgent
```

---

## Views Summary

| View | Table | Purpose | Filter | Sort | Group |
|---|---|---|---|---|---|
| **Sales Pipeline** | Deals | See all deals by stage | None | CloseDate ↑ | By Stage |
| **Hot Leads** | Leads | High-value, ready-to-demo | Score≥70 & (Status=Demo Scheduled OR Proposal Sent) | SubmittedAt ↓ | None |
| **Agent Performance** | Agents | Leaderboard | None | AnnualRevenue ↓ | None |
| **Revenue Tracker** | Payments | Monitor recurring revenue | Status = Active | None | By Frequency |

---

## Automations Quick Reference

### Automation 1: New Lead Alert
- **Trigger**: New record created in Leads
- **Action**: Send email to AssignedAgent with lead summary

### Automation 2: Demo Scheduled
- **Trigger**: Status changes to "Demo Scheduled"
- **Action**: Send email to client confirming demo

### Automation 3: Payment Reminder
- **Trigger**: NextBillingDate = TODAY at 9 AM
- **Action**: Send renewal reminder to ClientEmail

---

## Python API Usage Examples

### 1. Initialize Client

```python
from airtable_client import AirtableClient
import os

api_key = os.getenv("AIRTABLE_API_KEY")
base_id = os.getenv("AIRTABLE_BASE_ID")
client = AirtableClient(api_key, base_id)
```

### 2. Create a Lead

```python
from airtable_client import Lead

lead = Lead(
    lead_id="LEAD-001",
    first_name="Alice",
    last_name="Smith",
    email="alice@example.com",
    phone="+1-555-0123",
    location="San Francisco",
    legal_situation=["Trust", "Estate"],
    goals=["Tax Savings"],
    qualification_score=85,
    assigned_agent="Legal Specialist",
    status="New"
)

record, is_new = client.sync_lead(lead)
print(f"Lead created: {record['id']}, New: {is_new}")
```

### 3. Update Lead Status

```python
# Move lead through pipeline
client.update_lead_status("LEAD-001", "Contacted")
client.update_lead_status("LEAD-001", "Demo Scheduled")
client.update_lead_status("LEAD-001", "Demo Completed")
client.update_lead_status("LEAD-001", "Proposal Sent")
client.update_lead_status("LEAD-001", "Won")
```

### 4. Create a Deal

```python
from airtable_client import Deal

deal = Deal(
    deal_id="DEAL-001",
    lead_id="LEAD-001",
    contract_value=50000.00,
    stage="Discovery",
    notes="High-net-worth individual, interested in trust setup"
)

record, is_new = client.sync_deal(deal)
```

### 5. Track Pipeline

```python
# Get deals by stage
discovery = client.get_deals("Discovery")
proposal = client.get_deals("Proposal")
closed = client.get_deals("Closed Won")

# Get pipeline summary
summary = client.get_pipeline_summary()
print(f"Total Deals: {summary['total_deals']}")
print(f"Total Value: ${summary['total_value']:,.2f}")
for stage, data in summary['stages'].items():
    print(f"  {stage}: {data['count']} deals, ${data['value']:,.2f}")
```

### 6. Track Revenue

```python
# Get Monthly Recurring Revenue (MRR)
mrr = client.get_mrr()
print(f"Current MRR: ${mrr:,.2f}")

# Get active payments
active_payments = client.get_active_payments()
for payment in active_payments:
    fields = payment["fields"]
    print(f"${fields['Amount']} / {fields['Frequency']} - {fields['ClientEmail']}")
```

### 7. Manage Agents

```python
from airtable_client import Agent

# Add agent
agent = Agent(
    agent_name="Sarah Johnson",
    specialty="Legal",
    notes="Specializes in trust structures and probate"
)
client.sync_agent(agent)

# Get agent performance
performance = client.get_agent_performance()
for agent in performance:
    print(f"{agent['name']} ({agent['specialty']})")
    print(f"  Current Leads: {agent['current_leads']}")
    print(f"  Deals Won: {agent['deals_won']}")
    print(f"  Annual Revenue: ${agent['annual_revenue']:,.2f}")
```

### 8. Batch Operations

```python
# Batch create leads
leads = [
    {"LeadID": "LEAD-100", "FirstName": "Bob", "LastName": "Jones", "Email": "bob@example.com"},
    {"LeadID": "LEAD-101", "FirstName": "Carol", "LastName": "White", "Email": "carol@example.com"},
]
created = client.batch_create("Leads", leads)

# Batch update statuses
updates = [
    ("recXXXXXXXXXXXX", {"Status": "Contacted"}),
    ("recYYYYYYYYYYYY", {"Status": "Demo Scheduled"}),
]
updated = client.batch_update("Leads", updates)
```

### 9. Error Handling

```python
try:
    record = client.update_lead_status("LEAD-999", "Won")
except ValueError as e:
    print(f"Error: {e}")  # Lead not found
except requests.HTTPError as e:
    print(f"API Error: {e.response.status_code}")
```

---

## Status Progression Flow

```
        ┌─────────┐
        │   New   │ (Lead submitted via intake form)
        └────┬────┘
             │
             ↓
        ┌──────────┐
        │ Contacted│ (Agent reaches out)
        └────┬─────┘
             │
             ↓
   ┌─────────────────────┐
   │ Demo Scheduled      │ (Automation: send calendar invite)
   └─────────┬───────────┘
             │
             ↓
   ┌─────────────────────┐
   │ Demo Completed      │ (Agent notes outcomes)
   └─────────┬───────────┘
             │
             ↓
   ┌─────────────────────┐
   │ Proposal Sent       │ (Contract presented)
   └─────────┬───────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
   ┌──────┐    ┌─────────┐
   │ Won  │    │  Lost   │
   └──────┘    └─────────┘
      │
      ↓
  (Link to Deals table, create Payment record)
```

---

## Qualification Score Guidelines

Use this to auto-score leads:

| Score | Assessment | Next Action |
|-------|---|---|
| 0-30 | Not qualified | Auto-reply, follow-up if interested |
| 31-50 | Maybe interested | Schedule intro call |
| 51-70 | Likely interested | Prepare demo, assign agent |
| 71-85 | **HOT LEAD** | Schedule demo immediately |
| 86-100 | **VIP** | White-glove service, management attention |

Increase score based on:
- Income level (higher = +20)
- Clear legal need (estate/business = +15)
- Multiple goal alignment (each = +10)
- Referral from existing client (= +20)

---

## Common Queries

### "Give me this week's new leads"
```python
# In Python or Airtable formula
formula = "{SubmittedAt} >= TODAY() - 7"
recent_leads = client.get_records("Leads", formula=formula)
```

### "Which leads are ready for follow-up?"
```python
# Use Hot Leads view directly (filtered in Airtable)
# Or query:
formula = "{Status} = 'Contacted' AND {QualificationScore} >= 70"
```

### "What's our pipeline value?"
```python
summary = client.get_pipeline_summary()
print(f"Total Pipeline: ${summary['total_value']:,.2f}")
```

### "Who's our top performer this month?"
```python
# Check Agent Performance view (sorted by AnnualRevenue)
# Or query:
agents = client.get_agent_performance()
top = agents[0]
print(f"{top['name']}: ${top['annual_revenue']:,.2f}")
```

### "When are our next payments due?"
```python
# Use Revenue Tracker view
# Or query:
formula = "{NextBillingDate} <= TODAY() + 7 AND {Status} = 'Active'"
upcoming = client.get_records("Payments", formula=formula)
```

---

## Airtable Pro Tips

1. **Use table grids for data entry**, views for analysis
2. **Color-code by Status** in Hot Leads view (green=won, red=lost)
3. **Pin important views** to your favorites for quick access
4. **Add collaborators** by sharing base (settings → share)
5. **Use forms** for intake (create a form view in Leads table)
6. **Export to CSV** anytime via grid menu → download
7. **Set up Slack integration** to get notified of new leads
8. **Use webhooks** for real-time integrations with external systems

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Link field empty | Make sure you created the record in the linked table first |
| Rollup shows #ERROR | Check field exists in target table; verify formula syntax |
| Automation not firing | Verify automation is published (not draft); check trigger conditions match exactly |
| Python client 401 | API key expired or invalid; regenerate in Airtable account settings |
| Slow performance | Archive old records; reduce number of visible fields in views |

---

## Environment Variables

```bash
# .env file
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
STRIPE_API_KEY=your_stripe_key_here
```

---

**Last Updated**: April 2026  
**Quick Reference v1.0**
