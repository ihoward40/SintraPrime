"""
Airtable CRM Sync Client
========================

Manages synchronization between SintraPrime intake forms, Stripe, and Airtable CRM.
Handles upsert operations, relationship management, and data reconciliation.

API Documentation: https://airtable.com/api
"""

import os
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Lead:
    """Represents a Lead record in Airtable"""
    lead_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    legal_situation: Optional[List[str]] = None
    financial_snapshot: Optional[str] = None
    goals: Optional[List[str]] = None
    qualification_score: Optional[int] = None
    assigned_agent: str = "Pending Review"
    status: str = "New"
    submitted_at: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class Deal:
    """Represents a Deal record in Airtable"""
    deal_id: str
    lead_id: str
    contract_value: float
    stage: str = "Discovery"
    close_date: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class Payment:
    """Represents a Payment record in Airtable"""
    payment_id: str
    deal_id: str
    amount: float
    frequency: str = "Monthly"
    status: str = "Pending"
    next_billing_date: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class Agent:
    """Represents an Agent record in Airtable"""
    agent_name: str
    specialty: str
    notes: Optional[str] = None


class AirtableClient:
    """
    Client for interacting with Airtable API.
    Handles CRUD operations, upserts, and relationship management.
    """

    def __init__(self, api_key: str, base_id: str):
        """
        Initialize Airtable client.
        
        Args:
            api_key: Airtable API key (from account settings)
            base_id: Base ID (from base URL like airtable.com/appXXXXXXXXXXXX)
        """
        self.api_key = api_key
        self.base_id = base_id
        self.base_url = f"https://api.airtable.com/v0/{base_id}"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """
        Make HTTP request to Airtable API.
        
        Args:
            method: HTTP method (GET, POST, PATCH, PUT, DELETE)
            endpoint: Table name or specific record endpoint
            data: Request body data
            params: Query parameters
            
        Returns:
            Response JSON
            
        Raises:
            requests.HTTPError: If request fails
        """
        url = f"{self.base_url}/{endpoint}"
        logger.info(f"{method} {url}")
        
        response = self.session.request(method, url, json=data, params=params)
        response.raise_for_status()
        
        return response.json() if response.text else {}

    def get_records(
        self,
        table_name: str,
        formula: Optional[str] = None,
        fields: Optional[List[str]] = None,
        max_records: int = 100,
        page_size: int = 100
    ) -> List[Dict]:
        """
        Fetch records from a table with optional filtering.
        
        Args:
            table_name: Name of the table
            formula: Airtable formula filter (e.g., "{Status} = 'Won'")
            fields: List of field names to retrieve
            max_records: Maximum number of records to return
            page_size: Records per page (max 100)
            
        Returns:
            List of record dictionaries
        """
        all_records = []
        offset = None
        
        while len(all_records) < max_records:
            params = {"pageSize": min(page_size, max_records - len(all_records))}
            
            if formula:
                params["filterByFormula"] = formula
            if fields:
                params["fields"] = fields
            if offset:
                params["offset"] = offset
            
            try:
                response = self._make_request("GET", table_name, params=params)
                records = response.get("records", [])
                
                if not records:
                    break
                
                all_records.extend(records)
                offset = response.get("offset")
                
                if not offset:
                    break
                    
            except requests.HTTPError as e:
                logger.error(f"Error fetching records from {table_name}: {e}")
                break
        
        return all_records[:max_records]

    def create_record(self, table_name: str, fields: Dict) -> Dict:
        """
        Create a new record in a table.
        
        Args:
            table_name: Name of the table
            fields: Field data dictionary
            
        Returns:
            Created record with ID
        """
        data = {"fields": fields}
        
        try:
            response = self._make_request("POST", table_name, data=data)
            logger.info(f"Created record in {table_name}: {response.get('id')}")
            return response
        except requests.HTTPError as e:
            logger.error(f"Error creating record in {table_name}: {e}")
            raise

    def update_record(self, table_name: str, record_id: str, fields: Dict) -> Dict:
        """
        Update an existing record.
        
        Args:
            table_name: Name of the table
            record_id: Airtable record ID
            fields: Fields to update
            
        Returns:
            Updated record
        """
        data = {"fields": fields}
        endpoint = f"{table_name}/{record_id}"
        
        try:
            response = self._make_request("PATCH", endpoint, data=data)
            logger.info(f"Updated record in {table_name}: {record_id}")
            return response
        except requests.HTTPError as e:
            logger.error(f"Error updating record in {table_name}: {e}")
            raise

    def upsert_record(
        self,
        table_name: str,
        unique_field: str,
        unique_value: str,
        fields: Dict
    ) -> Tuple[Dict, bool]:
        """
        Upsert: Update if exists (by unique field), create if not.
        
        Args:
            table_name: Name of the table
            unique_field: Field to check for uniqueness
            unique_value: Value to match
            fields: All fields for record (including unique field)
            
        Returns:
            Tuple of (record, is_new) where is_new indicates if record was created
        """
        formula = f"{{{{unique_field}}}} = '{unique_value}'"
        formula = f"{{{{{unique_field}}}}} = '{unique_value}'"
        
        existing = self.get_records(table_name, formula=formula, max_records=1)
        
        if existing:
            record = self.update_record(table_name, existing[0]["id"], fields)
            return record, False
        else:
            record = self.create_record(table_name, fields)
            return record, True

    def delete_record(self, table_name: str, record_id: str) -> bool:
        """
        Delete a record.
        
        Args:
            table_name: Name of the table
            record_id: Airtable record ID
            
        Returns:
            True if deleted successfully
        """
        endpoint = f"{table_name}/{record_id}"
        
        try:
            self._make_request("DELETE", endpoint)
            logger.info(f"Deleted record in {table_name}: {record_id}")
            return True
        except requests.HTTPError as e:
            logger.error(f"Error deleting record in {table_name}: {e}")
            return False

    def batch_create(self, table_name: str, records: List[Dict]) -> List[Dict]:
        """
        Create multiple records in a batch (max 10 per request).
        
        Args:
            table_name: Name of the table
            records: List of record data dictionaries
            
        Returns:
            List of created records
        """
        created = []
        batch_size = 10
        
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            data = {"records": [{"fields": r} for r in batch]}
            
            try:
                response = self._make_request("POST", table_name, data=data)
                created.extend(response.get("records", []))
                logger.info(f"Batch created {len(batch)} records in {table_name}")
            except requests.HTTPError as e:
                logger.error(f"Error batch creating records in {table_name}: {e}")
        
        return created

    def batch_update(self, table_name: str, updates: List[Tuple[str, Dict]]) -> List[Dict]:
        """
        Update multiple records in a batch (max 10 per request).
        
        Args:
            table_name: Name of the table
            updates: List of (record_id, fields) tuples
            
        Returns:
            List of updated records
        """
        updated = []
        batch_size = 10
        
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i + batch_size]
            records = [{"id": rid, "fields": fields} for rid, fields in batch]
            data = {"records": records}
            
            try:
                response = self._make_request("PATCH", table_name, data=data)
                updated.extend(response.get("records", []))
                logger.info(f"Batch updated {len(batch)} records in {table_name}")
            except requests.HTTPError as e:
                logger.error(f"Error batch updating records in {table_name}: {e}")
        
        return updated

    # ============ Lead Operations ============

    def sync_lead(self, lead: Lead) -> Tuple[Dict, bool]:
        """
        Sync a lead to Airtable. Upserts by LeadID.
        
        Args:
            lead: Lead dataclass instance
            
        Returns:
            Tuple of (record, is_new)
        """
        fields = {
            "LeadID": lead.lead_id,
            "FirstName": lead.first_name,
            "LastName": lead.last_name,
            "Email": lead.email,
        }
        
        if lead.phone:
            fields["Phone"] = lead.phone
        if lead.location:
            fields["Location"] = lead.location
        if lead.legal_situation:
            fields["LegalSituation"] = lead.legal_situation
        if lead.financial_snapshot:
            fields["FinancialSnapshot"] = lead.financial_snapshot
        if lead.goals:
            fields["Goals"] = lead.goals
        if lead.qualification_score is not None:
            fields["QualificationScore"] = lead.qualification_score
        
        fields["AssignedAgent"] = lead.assigned_agent
        fields["Status"] = lead.status
        
        if lead.submitted_at:
            fields["SubmittedAt"] = lead.submitted_at
        else:
            fields["SubmittedAt"] = datetime.utcnow().isoformat()
        
        if lead.notes:
            fields["Notes"] = lead.notes
        
        return self.upsert_record("Leads", "LeadID", lead.lead_id, fields)

    def get_leads(self, status: Optional[str] = None) -> List[Dict]:
        """
        Fetch leads, optionally filtered by status.
        
        Args:
            status: Optional status filter (e.g., "Won", "Contacted")
            
        Returns:
            List of lead records
        """
        formula = f"{{Status}} = '{status}'" if status else None
        return self.get_records("Leads", formula=formula)

    def update_lead_status(self, lead_id: str, new_status: str) -> Dict:
        """
        Update a lead's status and stage progression.
        
        Args:
            lead_id: LeadID value
            new_status: New status value
            
        Returns:
            Updated record
        """
        formula = f"{{LeadID}} = '{lead_id}'"
        records = self.get_records("Leads", formula=formula, max_records=1)
        
        if not records:
            raise ValueError(f"Lead not found: {lead_id}")
        
        return self.update_record("Leads", records[0]["id"], {"Status": new_status})

    # ============ Deal Operations ============

    def sync_deal(self, deal: Deal) -> Tuple[Dict, bool]:
        """
        Sync a deal to Airtable. Upserts by DealID.
        
        Args:
            deal: Deal dataclass instance
            
        Returns:
            Tuple of (record, is_new)
        """
        fields = {
            "DealID": deal.deal_id,
            "LeadID": [deal.lead_id],  # Link to Leads table by LeadID
            "ContractValue": deal.contract_value,
            "Stage": deal.stage,
        }
        
        if deal.close_date:
            fields["CloseDate"] = deal.close_date
        if deal.notes:
            fields["Notes"] = deal.notes
        
        return self.upsert_record("Deals", "DealID", deal.deal_id, fields)

    def get_deals(self, stage: Optional[str] = None) -> List[Dict]:
        """
        Fetch deals, optionally filtered by stage.
        
        Args:
            stage: Optional stage filter (e.g., "Closed Won")
            
        Returns:
            List of deal records
        """
        formula = f"{{Stage}} = '{stage}'" if stage else None
        return self.get_records("Deals", formula=formula)

    def update_deal_stage(self, deal_id: str, new_stage: str) -> Dict:
        """
        Update a deal's stage.
        
        Args:
            deal_id: DealID value
            new_stage: New stage value
            
        Returns:
            Updated record
        """
        formula = f"{{DealID}} = '{deal_id}'"
        records = self.get_records("Deals", formula=formula, max_records=1)
        
        if not records:
            raise ValueError(f"Deal not found: {deal_id}")
        
        return self.update_record("Deals", records[0]["id"], {"Stage": new_stage})

    # ============ Payment Operations ============

    def sync_payment(self, payment: Payment) -> Tuple[Dict, bool]:
        """
        Sync a payment to Airtable. Upserts by PaymentID.
        
        Args:
            payment: Payment dataclass instance
            
        Returns:
            Tuple of (record, is_new)
        """
        fields = {
            "PaymentID": payment.payment_id,
            "DealID": [payment.deal_id],  # Link to Deals table
            "Amount": payment.amount,
            "Frequency": payment.frequency,
            "Status": payment.status,
        }
        
        if payment.next_billing_date:
            fields["NextBillingDate"] = payment.next_billing_date
        if payment.stripe_subscription_id:
            fields["StripeSubscriptionID"] = payment.stripe_subscription_id
        if payment.notes:
            fields["Notes"] = payment.notes
        
        return self.upsert_record("Payments", "PaymentID", payment.payment_id, fields)

    def get_active_payments(self) -> List[Dict]:
        """
        Fetch all active payments (for revenue tracking).
        
        Returns:
            List of active payment records
        """
        return self.get_records("Payments", formula="{Status} = 'Active'")

    def update_payment_status(self, payment_id: str, new_status: str) -> Dict:
        """
        Update a payment's status.
        
        Args:
            payment_id: PaymentID value
            new_status: New status value
            
        Returns:
            Updated record
        """
        formula = f"{{PaymentID}} = '{payment_id}'"
        records = self.get_records("Payments", formula=formula, max_records=1)
        
        if not records:
            raise ValueError(f"Payment not found: {payment_id}")
        
        return self.update_record("Payments", records[0]["id"], {"Status": new_status})

    # ============ Agent Operations ============

    def sync_agent(self, agent: Agent) -> Dict:
        """
        Sync an agent to Airtable. Creates if new, updates if exists.
        
        Args:
            agent: Agent dataclass instance
            
        Returns:
            Created or updated record
        """
        fields = {
            "AgentName": agent.agent_name,
            "Specialty": agent.specialty,
        }
        
        if agent.notes:
            fields["Notes"] = agent.notes
        
        record, _ = self.upsert_record("Agents", "AgentName", agent.agent_name, fields)
        return record

    def get_agents(self, specialty: Optional[str] = None) -> List[Dict]:
        """
        Fetch agents, optionally filtered by specialty.
        
        Args:
            specialty: Optional specialty filter (e.g., "Legal")
            
        Returns:
            List of agent records
        """
        formula = f"{{Specialty}} = '{specialty}'" if specialty else None
        return self.get_records("Agents", formula=formula)

    # ============ Analytics & Reporting ============

    def get_pipeline_summary(self) -> Dict:
        """
        Get sales pipeline summary by stage.
        
        Returns:
            Dictionary with stage counts and total value
        """
        deals = self.get_deals()
        stages = {}
        total_value = 0
        
        for deal in deals:
            stage = deal["fields"].get("Stage", "Unknown")
            value = deal["fields"].get("ContractValue", 0)
            
            if stage not in stages:
                stages[stage] = {"count": 0, "value": 0}
            
            stages[stage]["count"] += 1
            stages[stage]["value"] += value
            total_value += value
        
        return {
            "stages": stages,
            "total_value": total_value,
            "total_deals": len(deals)
        }

    def get_mrr(self) -> float:
        """
        Calculate Monthly Recurring Revenue (MRR).
        
        Returns:
            Total MRR from active subscriptions
        """
        payments = self.get_active_payments()
        mrr = 0
        
        for payment in payments:
            amount = payment["fields"].get("Amount", 0)
            frequency = payment["fields"].get("Frequency", "Monthly")
            
            if frequency == "Monthly":
                mrr += amount
            elif frequency == "Annual":
                mrr += amount / 12
            elif frequency == "Quarterly":
                mrr += amount / 3
        
        return mrr

    def get_agent_performance(self) -> List[Dict]:
        """
        Get performance metrics for all agents.
        
        Returns:
            List of agents with their KPIs
        """
        agents = self.get_agents()
        performance = []
        
        for agent in agents:
            agent_name = agent["fields"].get("AgentName")
            
            # These would typically be rollup fields in Airtable
            performance.append({
                "name": agent_name,
                "specialty": agent["fields"].get("Specialty"),
                "current_leads": agent["fields"].get("CurrentLeads", 0),
                "deals_won": agent["fields"].get("DealsWon", 0),
                "annual_revenue": agent["fields"].get("AnnualRevenue", 0),
            })
        
        return sorted(performance, key=lambda x: x["annual_revenue"], reverse=True)


# Example usage
if __name__ == "__main__":
    # Initialize client
    api_key = os.getenv("AIRTABLE_API_KEY")
    base_id = os.getenv("AIRTABLE_BASE_ID")
    
    if not api_key or not base_id:
        print("Error: Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables")
        exit(1)
    
    client = AirtableClient(api_key, base_id)
    
    # Example: Create a lead
    lead = Lead(
        lead_id="LEAD-001",
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        phone="+1-555-0123",
        location="New York",
        legal_situation=["Trust", "Estate"],
        goals=["Tax Savings", "Asset Protection"],
        qualification_score=85,
        assigned_agent="Legal Specialist",
        status="Demo Scheduled",
        notes="High-value prospect, referred by existing client"
    )
    
    record, is_new = client.sync_lead(lead)
    print(f"Lead synced: {record['id']} (new: {is_new})")
    
    # Get pipeline summary
    summary = client.get_pipeline_summary()
    print(f"Pipeline: {summary}")
    
    # Calculate MRR
    mrr = client.get_mrr()
    print(f"Monthly Recurring Revenue: ${mrr:,.2f}")
