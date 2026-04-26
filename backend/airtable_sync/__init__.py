"""
SintraPrime Airtable CRM Sync Package
====================================

Provides Python client for syncing leads, deals, payments, and agents with Airtable.

Usage:
    from airtable_client import AirtableClient, Lead, Deal, Payment, Agent
    
    client = AirtableClient(api_key, base_id)
    
    # Sync a lead
    lead = Lead("LEAD-001", "John", "Doe", "john@example.com")
    record, is_new = client.sync_lead(lead)
"""

from .airtable_client import (
    AirtableClient,
    Lead,
    Deal,
    Payment,
    Agent,
)

__version__ = "1.0.0"
__author__ = "SintraPrime Team"
__all__ = [
    "AirtableClient",
    "Lead",
    "Deal",
    "Payment",
    "Agent",
]
