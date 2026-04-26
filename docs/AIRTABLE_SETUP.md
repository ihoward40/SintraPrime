# Airtable CRM Setup Guide — SintraPrime-CRM

## Overview

This guide provides step-by-step instructions to build the **SintraPrime-CRM** Airtable base — the single source of truth for all leads, deals, clients, and revenue tracking.

**Base Purpose**: Operational CRM that integrates with intake forms, Stripe, and internal agents to manage the complete sales lifecycle.

---

## Part 1: Create the Base and Tables

### 1.1 Create a New Airtable Base

1. Go to [airtable.com](https://airtable.com) and log in
2. Click **"Create"** → **"Create a blank base"**
3. Name it: **`SintraPrime-CRM`**
4. Click **"Create base"**

You'll now have an empty workspace. Rename the default "Table 1" to **"Leads"** and we'll add the remaining tables.

---

## Part 2: Table Schemas

### Table 1: Leads

**Purpose**: Store all inbound leads from intake forms, web inquiries, and referrals.

#### Fields to Create

| Field Name | Type | Configuration |
|---|---|---|
| **LeadID** | Text | Unique, required. Format: `LEAD-001`, `LEAD-002`, etc. |
| **FirstName** | Text | Required |
| **LastName** | Text | Required |
| **Email** | Email | Required, validates email format |
| **Phone** | Phone Number | Optional |
| **Location** | Text | Optional. City/State or region |
| **LegalSituation** | Multiple select | Options: Trust, Estate, Business, Credit, Family Law, Bankruptcy |
| **FinancialSnapshot** | Long text | Optional. Summarize income, debt, assets from intake |
| **Goals** | Multiple select | Options: Tax Savings, Credit Repair, Trust Structure, Business Formation, Asset Protection |
| **QualificationScore** | Number | Range: 0-100. Updated based on intake responses |
| **AssignedAgent** | Single select | Options: Legal Specialist, Financial Specialist, Combined, Pending Review |
| **Status** | Single select | Options: New, Contacted, Demo Scheduled, Demo Completed, Proposal Sent, Won, Lost |
| **SubmittedAt** | Date | Timestamp when lead was created |
| **Notes** | Long text | Internal notes, conversation summaries |
| **Link to Deals** | Link to Deals | Links to associated deals (one-to-many) |

#### Setup Instructions

1. In your SintraPrime-CRM base, click the **Leads** table (or rename it)
2. For each field above, click **"+"** to add a field
3. Set field name, type, and options as shown
4. Make **LeadID**, **FirstName**, **LastName**, **Email** required
5. For `AssignedAgent` and `Status`, add the exact options listed

---

### Table 2: Deals

**Purpose**: Track sales opportunities and progression from discovery to closed-won.

#### Fields to Create

| Field Name | Type | Configuration |
|---|---|---|
| **DealID** | Text | Unique, required. Format: `DEAL-001`, `DEAL-002`, etc. |
| **LeadID** | Link to another table | Link to **Leads** table. One lead → many deals |
| **ClientName** | Rollup | Rollup from `LeadID` field, combine FirstName + LastName with formula: `CONCATENATE(values[0], ' ', values[1])` |
| **ContractValue** | Currency | USD, annual expected revenue |
| **Stage** | Single select | Options: Discovery, Proposal, Negotiation, Closed Won, Closed Lost |
| **CloseDate** | Date | Target/actual close date |
| **DaysToClose** | Formula | Formula: `DATETIME_DIFF({CloseDate}, NOW(), 'days')` |
| **Notes** | Long text | Deal notes, objections, negotiation points |
| **Link to Payments** | Link to Payments | Links to subscription payments (one-to-many) |

#### Setup Instructions

1. Create a new table: Click **"+"** at bottom → **"Add another table"** → Name: **Deals**
2. Create fields as shown above
3. For **LeadID** link field:
   - Type: Link to another table
   - Link to: **Leads**
   - This creates a two-way relationship
4. For **ClientName** rollup:
   - Type: Rollup
   - Based on: **LeadID**
   - Aggregation function: Use formula → `CONCATENATE(values[0], ' ', values[1])`
5. For **DaysToClose** formula:
   - Type: Formula
   - Formula: `DATETIME_DIFF({CloseDate}, NOW(), 'days')`

---

### Table 3: Payments

**Purpose**: Track recurring and one-time payments, subscription status, and next billing dates.

#### Fields to Create

| Field Name | Type | Configuration |
|---|---|---|
| **PaymentID** | Text | Unique, required. Format: `PAY-001`, `PAY-002`, etc. |
| **DealID** | Link to another table | Link to **Deals** table. One deal → many payments |
| **ClientEmail** | Rollup | Rollup from `DealID.LeadID.Email`. Shows email address |
| **Amount** | Currency | Monthly/annual amount for this subscription |
| **Frequency** | Single select | Options: One-time, Monthly, Quarterly, Annual |
| **Status** | Single select | Options: Pending, Active, Paid, Failed, Canceled |
| **NextBillingDate** | Date | Next charge date (used by automations) |
| **StripeSubscriptionID** | Text | Stripe subscription ID for API sync |
| **Notes** | Long text | Payment notes, cancellation reasons, etc. |

#### Setup Instructions

1. Create a new table: Name: **Payments**
2. Create fields as shown above
3. For **DealID** link field:
   - Link to: **Deals** table
4. For **ClientEmail** rollup:
   - Based on: **DealID**
   - Rollup field to use: Go through LeadID → Email
   - In Airtable UI: Select DealID → expand to LeadID → select Email field
   - Aggregation: This automatically pulls the email value

---

### Table 4: Agents

**Purpose**: Track team members, their specialties, and performance metrics.

#### Fields to Create

| Field Name | Type | Configuration |
|---|---|---|
| **AgentName** | Text | Unique, required. Full name. |
| **Specialty** | Single select | Options: Legal, Financial, Combined |
| **CurrentLeads** | Count | Count of linked Leads where Status = "Demo Scheduled" OR "Proposal Sent" |
| **DealsWon** | Rollup | Rollup from linked Leads → linked Deals → count where Stage = "Closed Won" |
| **AnnualRevenue** | Rollup | Rollup from linked Leads → linked Deals → sum of ContractValue |
| **Notes** | Long text | Agent bio, certifications, availability |
| **Link to Leads** | Link to Leads | Links to leads assigned to this agent (one-to-many) |

#### Setup Instructions

1. Create a new table: Name: **Agents**
2. Create fields as shown above
3. For **CurrentLeads** count:
   - Type: Count
   - Count linked records from: **Link to Leads** field
   - Filter: Where Status = "Demo Scheduled" OR "Proposal Sent"
4. For **DealsWon** rollup:
   - Type: Rollup
   - Based on: **Link to Leads** field
   - Rollup field: From each Leads record, go to **Link to Deals** → count records
   - Filter: Where Stage = "Closed Won"
5. For **AnnualRevenue** rollup:
   - Type: Rollup
   - Based on: **Link to Leads** field
   - Rollup field: From each Leads record, go to **Link to Deals** → sum ContractValue
6. For **Link to Leads**:
   - Type: Link to another table
   - Link to: **Leads** table
   - Bidirectionally link to **Leads.AssignedAgent** field

---

## Part 3: Create Views

Views are filtered, sorted, and grouped presentations of your data. Create all 4 views in the **Deals** and **Leads** tables.

### View 1: Sales Pipeline (in Deals table)

**Purpose**: See all deals grouped by stage, sorted by close date.

**Configuration**:
1. In **Deals** table, click **"+"** next to view name
2. Name: **Sales Pipeline**
3. Type: Grid
4. Grouping: Group by **Stage**
5. Sort: By **CloseDate** (ascending)
6. Fields visible (hide others):
   - DealID
   - ClientName
   - ContractValue
   - Stage
   - CloseDate
7. Click **"Save"**

**Result**: See all deals organized by discovery → proposal → negotiation → closed.

---

### View 2: Hot Leads (in Leads table)

**Purpose**: Show high-quality leads ready for demo or proposal.

**Configuration**:
1. In **Leads** table, click **"+"** next to view name
2. Name: **Hot Leads**
3. Type: Grid
4. Filter: 
   - Add filter: Status is **Demo Scheduled**
   - Add filter (OR): Status is **Proposal Sent**
   - Add filter (AND): QualificationScore ≥ **70**
5. Sort: By **SubmittedAt** (newest first)
6. Fields visible:
   - LeadID
   - FirstName
   - LastName
   - Email
   - AssignedAgent
   - QualificationScore
   - Status
7. Click **"Save"**

**Result**: Your sales team sees only warm leads with high qualification scores.

---

### View 3: Agent Performance (in Agents table)

**Purpose**: Leaderboard showing agent productivity and revenue.

**Configuration**:
1. In **Agents** table, click **"+"** next to view name
2. Name: **Agent Performance**
3. Type: Grid
4. Sort: By **AnnualRevenue** (descending)
5. Fields visible:
   - AgentName
   - Specialty
   - CurrentLeads
   - DealsWon
   - AnnualRevenue
6. Click **"Save"**

**Result**: See top-performing agents by revenue generated.

---

### View 4: Revenue Tracker (in Payments table)

**Purpose**: Monitor recurring revenue and billing schedule.

**Configuration**:
1. In **Payments** table, click **"+"** next to view name
2. Name: **Revenue Tracker**
3. Type: Grid
4. Filter: Status is **Active**
5. Group by: **Frequency** (groups by Monthly, Quarterly, Annual)
6. Fields visible:
   - PaymentID
   - ClientEmail
   - Amount
   - Frequency
   - NextBillingDate
7. Add summary at bottom:
   - Field: **Amount**
   - Aggregation: **Sum**
   - This shows total monthly recurring revenue per group
8. Click **"Save"**

**Result**: See all active subscriptions grouped by billing frequency, with MRR total.

---

## Part 4: Airtable Automations

Automations trigger on events (new record, status change, date match) and perform actions.

### Automation 1: New Lead Auto-Notify

**Trigger**: A new record is created in **Leads**  
**Action**: Send email to assigned agent

**Setup**:
1. Click **"Automations"** at top of base
2. Click **"Create automation"**
3. **Trigger**:
   - Trigger type: **When a record is created**
   - In table: **Leads**
4. **Action**:
   - Add action: **Send email**
   - To: Use field → **AssignedAgent** email (or create a junction table mapping agent names to emails)
   - Subject: `New Lead: {FirstName} {LastName}`
   - Body: 
   ```
   Hi {AssignedAgent},
   
   A new lead has been assigned to you:
   
   Name: {FirstName} {LastName}
   Email: {Email}
   Phone: {Phone}
   Location: {Location}
   Legal Situation: {LegalSituation}
   Qualification Score: {QualificationScore}
   Goals: {Goals}
   Notes: {Notes}
   
   Please review and reach out within 24 hours.
   
   Best regards,
   SintraPrime CRM
   ```
5. Click **"Test"** to verify
6. Click **"Publish"** when ready

---

### Automation 2: Demo Scheduled Alert

**Trigger**: Status field changes to "Demo Scheduled"  
**Action**: Send calendar invite to client

**Setup**:
1. Click **"Create automation"**
2. **Trigger**:
   - Trigger type: **When record matches conditions**
   - In table: **Leads**
   - When Status **changes to** "Demo Scheduled"
3. **Action**:
   - Add action: **Send email**
   - To: **{Email}**
   - Subject: `Your SintraPrime Demo is Scheduled`
   - Body:
   ```
   Hi {FirstName},
   
   Great news! Your personalized SintraPrime demo is scheduled.
   
   Date & Time: [Agent to fill manually for now, or use Stripe integration]
   Duration: 30 minutes
   
   Your dedicated specialist will walk you through:
   - Trust & estate planning solutions
   - Tax optimization strategies
   - Asset protection structures
   
   We'll answer all your questions about {Goals}.
   
   Please reply to confirm your attendance.
   
   Looking forward to meeting you!
   ```
4. Click **"Publish"**

*Note*: For full calendar integration, connect Stripe or a calendar service. Currently, this sends email confirmation.

---

### Automation 3: Payment Reminder

**Trigger**: NextBillingDate = TODAY  
**Action**: Send renewal reminder to client

**Setup**:
1. Click **"Create automation"**
2. **Trigger**:
   - Trigger type: **At a specific time**
   - In table: **Payments**
   - When **NextBillingDate** **is today**
   - Time: 9:00 AM
3. **Action**:
   - Add action: **Send email**
   - To: **ClientEmail** (rollup field)
   - Subject: `SintraPrime Renewal Tomorrow`
   - Body:
   ```
   Hi [Client],
   
   This is a reminder that your SintraPrime subscription renews tomorrow.
   
   Plan: [Frequency]
   Amount: [Amount]
   
   Your payment method is on file. If you need to update your billing info or have questions, please reply to this email.
   
   Thank you for being part of the SintraPrime community!
   ```
4. Click **"Publish"**

---

## Part 5: API Key & Environment Setup

### Get Your Airtable API Key

1. Go to [airtable.com/account](https://airtable.com/account)
2. Click **"API"** in the left sidebar
3. Click **"Generate a token"**
4. Give it a name: **SintraPrime-CRM-API**
5. Grant scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
6. Copy the token (you'll only see it once!)

### Get Your Base ID

1. Go to your **SintraPrime-CRM** base
2. Copy the base ID from the URL: `airtable.com/appXXXXXXXXXXXX`
3. The base ID is: `appXXXXXXXXXXXX`

### Set Environment Variables

Create a `.env` file in your project root:

```bash
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
```

**Never commit `.env` to GitHub** — add it to `.gitignore`:

```
.env
.env.local
*.key
```

---

## Part 6: Connect Stripe to Airtable (Optional)

This enables automated payment syncing from Stripe subscriptions.

### Prerequisites

- Active Stripe account
- Stripe API key

### Setup Steps

1. In Airtable, go to **Integrations** or **Extensions**
2. Search for **Stripe**
3. Click **"Install"**
4. Authenticate with your Stripe account
5. Configure the Stripe sync:
   - Source: Your Stripe account
   - Destination: **Payments** table
   - Map fields:
     - Stripe subscription ID → **StripeSubscriptionID**
     - Amount → **Amount**
     - Frequency → **Frequency**
     - Status → **Status**
     - Next billing date → **NextBillingDate**
6. Set sync frequency: **Every 6 hours** (or real-time if available)

### Manual Alternative

If Stripe integration isn't available, use our Python sync client (`airtable_client.py`) to pull from Stripe API and push to Airtable.

---

## Part 7: Testing Checklist

### Schema Tests

- [ ] All 4 tables created (Leads, Deals, Payments, Agents)
- [ ] All fields created with correct types
- [ ] Link fields work bidirectionally (create a test record in Leads, verify it appears in Deals)
- [ ] Rollup fields calculate correctly (create deals, verify AnnualRevenue updates)
- [ ] Formula fields work (DaysToClose shows correct value)

### View Tests

- [ ] Sales Pipeline view shows deals grouped by stage
- [ ] Hot Leads view filters for Score ≥ 70 and correct statuses
- [ ] Agent Performance view sorts by revenue (descending)
- [ ] Revenue Tracker sums active payments correctly

### Automation Tests

- [ ] Create a new Leads record → check email received by assigned agent
- [ ] Change Leads status to "Demo Scheduled" → check client email received
- [ ] Set a NextBillingDate to today in Payments → check reminder email arrives

### Python Client Tests

```bash
# From repo root:
cd backend/airtable_sync/

# Install dependencies
pip install requests python-dotenv

# Run tests
python3 -c "
from airtable_client import AirtableClient, Lead
import os
from dotenv import load_dotenv

load_dotenv()
client = AirtableClient(os.getenv('AIRTABLE_API_KEY'), os.getenv('AIRTABLE_BASE_ID'))

# Test: Create a lead
lead = Lead('TEST-001', 'Test', 'User', 'test@example.com')
record, is_new = client.sync_lead(lead)
print(f'✓ Lead created: {record[\"id\"]}')

# Test: Get pipeline
pipeline = client.get_pipeline_summary()
print(f'✓ Pipeline: {pipeline}')

# Test: Get MRR
mrr = client.get_mrr()
print(f'✓ MRR: \${mrr:,.2f}')
"
```

---

## Part 8: Usage Guide for Team

### For Sales Agents

1. **Check Hot Leads view** each morning
2. **Click a lead** to see full details (qualification score, goals, notes)
3. **Update status** as you progress: New → Contacted → Demo Scheduled → Demo Completed → Proposal Sent → Won/Lost
4. **Add notes** after each interaction
5. **Check Agent Performance view** to see how you rank (friendly competition!)

### For Finance Team

1. **Check Revenue Tracker view** to see all active subscriptions
2. **Monitor total MRR** (shown as summary)
3. **Review Payments with Status = Pending** and follow up on overdue payments
4. **Watch NextBillingDate** for upcoming renewals

### For Management

1. **Check Sales Pipeline view** to see deal progression
2. **Filter by stage** to monitor bottlenecks
3. **Review Agent Performance** to identify top performers
4. **Run analytics** using our Python client:
   ```python
   from airtable_client import AirtableClient
   client = AirtableClient(api_key, base_id)
   
   # Get pipeline snapshot
   print(client.get_pipeline_summary())
   
   # Get agent rankings
   print(client.get_agent_performance())
   ```

---

## Part 9: Troubleshooting

### "Link field not working"

- Ensure you selected the correct table to link to
- Verify both tables exist before creating the link field
- For two-way links, Airtable automatically creates the reverse field

### "Rollup field shows error"

- Check that you're rolling up from a linked table
- Verify the field you're rolling up exists in the target table
- If using a formula, check syntax (CONCATENATE vs CONCAT, proper quotes, etc.)

### "Automation didn't trigger"

- Check that you published the automation (draft automations don't run)
- Verify trigger conditions match exactly (e.g., "Demo Scheduled" not "demo scheduled")
- For time-based triggers, check timezone settings

### "Python client getting 401 error"

- Verify API key is correct (starts with `pat_`)
- Check that API key isn't expired
- Ensure `.env` file is in the right directory and loaded

### "Records not syncing from Stripe"

- Verify Stripe API key is valid
- Check that subscription IDs in Stripe match StripeSubscriptionID in Airtable
- For manual sync, run: `python3 airtable_client.py` after setting env vars

---

## Part 10: Next Steps

1. **Create sample data** in each table to test views and automations
2. **Train your team** on how to use the CRM (send them Part 8)
3. **Set up webhooks** if you want real-time Stripe → Airtable sync
4. **Schedule weekly reviews** of Agent Performance and Sales Pipeline
5. **Integrate with other tools**:
   - Slack notifications for new leads
   - Google Calendar for demos
   - Zapier for advanced automations

---

## Appendix: SQL Schema Reference

If you're building reports with SQL, here's the table structure:

```sql
-- Leads table (source of truth for prospects)
CREATE TABLE Leads (
  LeadID TEXT PRIMARY KEY,
  FirstName TEXT NOT NULL,
  LastName TEXT NOT NULL,
  Email TEXT NOT NULL,
  Phone TEXT,
  Location TEXT,
  LegalSituation TEXT,
  FinancialSnapshot TEXT,
  Goals TEXT,
  QualificationScore INTEGER DEFAULT 0,
  AssignedAgent TEXT,
  Status TEXT DEFAULT 'New',
  SubmittedAt TIMESTAMP,
  Notes TEXT
);

-- Deals table (linked to Leads)
CREATE TABLE Deals (
  DealID TEXT PRIMARY KEY,
  LeadID TEXT NOT NULL REFERENCES Leads(LeadID),
  ContractValue DECIMAL(10,2),
  Stage TEXT DEFAULT 'Discovery',
  CloseDate DATE,
  Notes TEXT
);

-- Payments table (linked to Deals)
CREATE TABLE Payments (
  PaymentID TEXT PRIMARY KEY,
  DealID TEXT NOT NULL REFERENCES Deals(DealID),
  Amount DECIMAL(10,2),
  Frequency TEXT DEFAULT 'Monthly',
  Status TEXT DEFAULT 'Pending',
  NextBillingDate DATE,
  StripeSubscriptionID TEXT,
  Notes TEXT
);

-- Agents table (team members)
CREATE TABLE Agents (
  AgentName TEXT PRIMARY KEY,
  Specialty TEXT,
  Notes TEXT
);
```

---

## Support & Documentation

- **Airtable API Docs**: https://airtable.com/api
- **Python Airtable Library**: https://github.com/gtalarico/pyairtable
- **Stripe API Docs**: https://stripe.com/docs/api
- **Questions?** Contact your SintraPrime administrator

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Status**: Production Ready
