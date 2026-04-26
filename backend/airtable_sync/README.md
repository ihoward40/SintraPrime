# Airtable CRM Sync Client

Python library for synchronizing SintraPrime CRM data with Airtable API.

## Features

✅ **CRUD Operations**: Create, read, update, delete records  
✅ **Upsert Support**: Automatic insert-or-update based on unique fields  
✅ **Batch Operations**: Process 10+ records in single API call  
✅ **Linked Tables**: Support for Airtable relationships (Leads → Deals → Payments)  
✅ **Rollup Fields**: Automatic aggregations (sums, counts, concatenations)  
✅ **Analytics**: Built-in pipeline summary, MRR calculation, agent performance  
✅ **Error Handling**: Graceful error recovery and logging  

## Installation

```bash
pip install -r requirements.txt
```

## Quick Start

```python
from airtable_client import AirtableClient, Lead
import os

# Initialize client
api_key = os.getenv("AIRTABLE_API_KEY")
base_id = os.getenv("AIRTABLE_BASE_ID")
client = AirtableClient(api_key, base_id)

# Create a lead
lead = Lead(
    lead_id="LEAD-001",
    first_name="John",
    last_name="Doe",
    email="john@example.com",
    phone="+1-555-0123",
    location="New York",
    legal_situation=["Trust", "Estate"],
    goals=["Tax Savings"],
    qualification_score=85,
    assigned_agent="Legal Specialist",
    status="New"
)

record, is_new = client.sync_lead(lead)
print(f"Lead synced: {record['id']}")

# Get pipeline summary
summary = client.get_pipeline_summary()
print(f"Pipeline value: ${summary['total_value']:,.2f}")

# Calculate MRR
mrr = client.get_mrr()
print(f"Monthly recurring revenue: ${mrr:,.2f}")
```

## Configuration

Create a `.env` file in your project root:

```bash
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
```

### Get Your Credentials

1. **API Key**: Visit [airtable.com/account/api](https://airtable.com/account/api)
   - Click "Generate a token"
   - Grant `data.records:read` and `data.records:write` scopes
   - Copy the token (shown only once)

2. **Base ID**: Open your SintraPrime-CRM base
   - Copy from URL: `airtable.com/appXXXXXXXXXXXX`

## API Reference

### AirtableClient

Main client for interacting with Airtable base.

#### Initialization

```python
from airtable_client import AirtableClient

client = AirtableClient(api_key, base_id)
```

#### Core Methods

**get_records(table_name, formula=None, fields=None, max_records=100)**
- Fetch records with optional filtering and field selection
- Formula example: `{Status} = 'Won'`

```python
leads = client.get_records("Leads", formula="{Status} = 'New'", max_records=50)
```

**create_record(table_name, fields)**
- Create a new record

```python
record = client.create_record("Leads", {
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john@example.com"
})
```

**update_record(table_name, record_id, fields)**
- Update an existing record by Airtable ID

```python
record = client.update_record("Leads", "rec123", {"Status": "Contacted"})
```

**upsert_record(table_name, unique_field, unique_value, fields)**
- Insert if new, update if exists

```python
record, is_new = client.upsert_record("Leads", "LeadID", "LEAD-001", {
    "LeadID": "LEAD-001",
    "FirstName": "John",
    "LastName": "Doe"
})
```

**delete_record(table_name, record_id)**
- Delete a record

```python
success = client.delete_record("Leads", "rec123")
```

**batch_create(table_name, records)**
- Create up to 10 records per request

```python
records = [
    {"LeadID": "LEAD-100", "FirstName": "Alice", "Email": "alice@example.com"},
    {"LeadID": "LEAD-101", "FirstName": "Bob", "Email": "bob@example.com"},
]
created = client.batch_create("Leads", records)
```

**batch_update(table_name, updates)**
- Update up to 10 records per request

```python
updates = [
    ("rec123", {"Status": "Contacted"}),
    ("rec456", {"Status": "Demo Scheduled"}),
]
updated = client.batch_update("Leads", updates)
```

#### Lead Methods

**sync_lead(lead)**
- Upsert a Lead object to Airtable

```python
from airtable_client import Lead

lead = Lead("LEAD-001", "John", "Doe", "john@example.com")
record, is_new = client.sync_lead(lead)
```

**get_leads(status=None)**
- Fetch leads, optionally filtered by status

```python
won_leads = client.get_leads("Won")
```

**update_lead_status(lead_id, new_status)**
- Update a lead's status in the pipeline

```python
client.update_lead_status("LEAD-001", "Demo Scheduled")
```

#### Deal Methods

**sync_deal(deal)**
- Upsert a Deal object to Airtable

```python
from airtable_client import Deal

deal = Deal("DEAL-001", "LEAD-001", 50000.00)
record, is_new = client.sync_deal(deal)
```

**get_deals(stage=None)**
- Fetch deals, optionally filtered by stage

```python
proposals = client.get_deals("Proposal")
```

**update_deal_stage(deal_id, new_stage)**
- Update a deal's stage

```python
client.update_deal_stage("DEAL-001", "Closed Won")
```

#### Payment Methods

**sync_payment(payment)**
- Upsert a Payment object to Airtable

```python
from airtable_client import Payment

payment = Payment("PAY-001", "DEAL-001", 1000.00, "Monthly")
record, is_new = client.sync_payment(payment)
```

**get_active_payments()**
- Fetch all active (recurring) payments

```python
active = client.get_active_payments()
```

**update_payment_status(payment_id, new_status)**
- Update a payment's status

```python
client.update_payment_status("PAY-001", "Active")
```

#### Agent Methods

**sync_agent(agent)**
- Upsert an Agent object to Airtable

```python
from airtable_client import Agent

agent = Agent("Sarah Johnson", "Legal")
client.sync_agent(agent)
```

**get_agents(specialty=None)**
- Fetch agents, optionally filtered by specialty

```python
legal = client.get_agents("Legal")
```

#### Analytics Methods

**get_pipeline_summary()**
- Get deal count and value by stage

```python
summary = client.get_pipeline_summary()
# Returns:
# {
#   "stages": {
#     "Discovery": {"count": 5, "value": 250000},
#     "Proposal": {"count": 3, "value": 150000},
#     ...
#   },
#   "total_deals": 15,
#   "total_value": 1500000
# }
```

**get_mrr()**
- Calculate Monthly Recurring Revenue from active subscriptions

```python
mrr = client.get_mrr()  # Returns float like 15000.00
```

**get_agent_performance()**
- Get agents ranked by revenue

```python
performance = client.get_agent_performance()
# Returns list of agents sorted by annual_revenue (descending)
```

### Data Classes

#### Lead

```python
from airtable_client import Lead

lead = Lead(
    lead_id="LEAD-001",                          # Required
    first_name="John",                           # Required
    last_name="Doe",                             # Required
    email="john@example.com",                    # Required
    phone="+1-555-0123",                         # Optional
    location="New York",                         # Optional
    legal_situation=["Trust", "Estate"],         # Optional
    financial_snapshot="Income: $500k, Debt: $0", # Optional
    goals=["Tax Savings", "Asset Protection"],   # Optional
    qualification_score=85,                      # Optional (0-100)
    assigned_agent="Legal Specialist",           # Default: "Pending Review"
    status="New",                                # Default: "New"
    submitted_at="2026-04-26T14:27:00",         # Optional (auto-set to now)
    notes="High-value prospect"                  # Optional
)
```

#### Deal

```python
from airtable_client import Deal

deal = Deal(
    deal_id="DEAL-001",              # Required
    lead_id="LEAD-001",              # Required (links to Leads table)
    contract_value=50000.00,         # Required
    stage="Discovery",               # Default: "Discovery"
    close_date="2026-06-30",        # Optional
    notes="High complexity, needs legal review"  # Optional
)
```

#### Payment

```python
from airtable_client import Payment

payment = Payment(
    payment_id="PAY-001",                       # Required
    deal_id="DEAL-001",                        # Required (links to Deals)
    amount=1000.00,                            # Required
    frequency="Monthly",                       # Default: "Monthly"
    status="Pending",                          # Default: "Pending"
    next_billing_date="2026-05-26",           # Optional
    stripe_subscription_id="sub_123456",       # Optional
    notes="Monthly retainer"                   # Optional
)
```

#### Agent

```python
from airtable_client import Agent

agent = Agent(
    agent_name="Sarah Johnson",     # Required
    specialty="Legal",              # Required
    notes="10+ years experience"    # Optional
)
```

## Error Handling

```python
import requests
from airtable_client import AirtableClient

client = AirtableClient(api_key, base_id)

try:
    record = client.update_lead_status("LEAD-999", "Won")
except ValueError as e:
    print(f"Lead not found: {e}")
except requests.HTTPError as e:
    print(f"API error ({e.response.status_code}): {e}")
```

## Testing

```bash
# Run all tests
pytest test_airtable_client.py -v

# Run specific test
pytest test_airtable_client.py::TestAirtableClient::test_get_records -v

# Run with coverage
pytest test_airtable_client.py --cov=airtable_client --cov-report=html
```

## Advanced Usage

### Filtering with Airtable Formulas

```python
# Get all leads with score >= 70
formula = "{QualificationScore} >= 70"
hot_leads = client.get_records("Leads", formula=formula)

# Get deals closed in last 30 days
formula = "IS_AFTER({CloseDate}, TODAY() - 30)"
recent_deals = client.get_records("Deals", formula=formula)

# Get payments due this week
formula = "AND({NextBillingDate} >= TODAY(), {NextBillingDate} <= TODAY() + 7)"
upcoming = client.get_records("Payments", formula=formula)
```

### Integration with Stripe

```python
import stripe

# Sync a Stripe subscription to Airtable
subscription = stripe.Subscription.retrieve("sub_123456")

payment = Payment(
    payment_id=f"PAY-{subscription.id}",
    deal_id="DEAL-001",
    amount=subscription.plan.amount / 100,
    frequency="Monthly",
    status="Active",
    next_billing_date=datetime.fromtimestamp(subscription.current_period_end),
    stripe_subscription_id=subscription.id
)

client.sync_payment(payment)
```

### Bulk Import from CSV

```python
import csv
from airtable_client import Lead

with open("leads_import.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        lead = Lead(
            lead_id=row["LeadID"],
            first_name=row["FirstName"],
            last_name=row["LastName"],
            email=row["Email"],
            qualification_score=int(row.get("Score", 0))
        )
        client.sync_lead(lead)
```

## Logging

```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Now all API calls are logged
client = AirtableClient(api_key, base_id)
records = client.get_records("Leads")  # Logs: GET https://api.airtable.com/v0/...
```

## Rate Limits

Airtable API has these limits:
- **Authenticated requests**: 5,000 per hour
- **Batch operations**: Max 10 records per request
- **Pagination**: Max 100 records per page

The client handles pagination automatically for `get_records()`.

## Troubleshooting

### 401 Unauthorized

```python
# Check your API key
# Error: Invalid API key
# Solution: Regenerate at airtable.com/account/api
```

### 404 Not Found

```python
# Check that table name and base ID are correct
# Error: Could not find table Leads in application appXXX
# Solution: Verify table name matches exactly (case-sensitive)
```

### Link field not created

```python
# Make sure target table exists before creating link field
# Lead → Deal → Payment chain must be created in order
```

### Formula field shows #ERROR

```python
# Check field names and formula syntax
# Common mistake: {FieldName} vs field_name
# Solution: Use exact field name from Airtable UI
```

## Contributing

To contribute improvements:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Add tests for new functionality
4. Run tests: `pytest test_airtable_client.py -v`
5. Submit a pull request

## License

MIT License — See LICENSE file for details

## Support

- **Airtable API Docs**: https://airtable.com/api
- **GitHub Issues**: https://github.com/ihoward40/SintraPrime/issues
- **Email**: support@sintraprime.com

---

**Maintained by**: SintraPrime Team  
**Last Updated**: April 2026  
**Version**: 1.0.0
