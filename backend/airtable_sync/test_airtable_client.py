"""
Unit tests for Airtable CRM client

Run with: pytest test_airtable_client.py -v
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from airtable_client import AirtableClient, Lead, Deal, Payment, Agent


class TestAirtableClient:
    """Test suite for AirtableClient"""
    
    @pytest.fixture
    def client(self):
        """Create a test client"""
        return AirtableClient("test_api_key", "appTestBase123")
    
    @pytest.fixture
    def sample_lead(self):
        """Sample lead for testing"""
        return Lead(
            lead_id="LEAD-001",
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="+1-555-0123",
            location="New York",
            legal_situation=["Trust"],
            goals=["Tax Savings"],
            qualification_score=85,
            assigned_agent="Legal Specialist",
            status="New"
        )
    
    @pytest.fixture
    def sample_deal(self):
        """Sample deal for testing"""
        return Deal(
            deal_id="DEAL-001",
            lead_id="LEAD-001",
            contract_value=50000.00,
            stage="Discovery"
        )
    
    def test_client_initialization(self):
        """Test client initialization with correct URLs and headers"""
        client = AirtableClient("pat_test123", "appXYZ123")
        
        assert client.api_key == "pat_test123"
        assert client.base_id == "appXYZ123"
        assert client.base_url == "https://api.airtable.com/v0/appXYZ123"
        assert "Bearer pat_test123" in client.headers["Authorization"]
    
    @patch('airtable_client.requests.Session.request')
    def test_get_records(self, mock_request, client):
        """Test fetching records from a table"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "records": [
                {"id": "rec001", "fields": {"LeadID": "LEAD-001", "FirstName": "John"}},
                {"id": "rec002", "fields": {"LeadID": "LEAD-002", "FirstName": "Jane"}},
            ]
        }
        mock_request.return_value = mock_response
        
        records = client.get_records("Leads")
        
        assert len(records) == 2
        assert records[0]["fields"]["LeadID"] == "LEAD-001"
        assert records[1]["fields"]["LeadID"] == "LEAD-002"
    
    @patch('airtable_client.requests.Session.request')
    def test_create_record(self, mock_request, client):
        """Test creating a new record"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "id": "rec123",
            "fields": {"LeadID": "LEAD-001", "FirstName": "John", "LastName": "Doe"}
        }
        mock_request.return_value = mock_response
        
        fields = {"LeadID": "LEAD-001", "FirstName": "John", "LastName": "Doe"}
        record = client.create_record("Leads", fields)
        
        assert record["id"] == "rec123"
        assert record["fields"]["LeadID"] == "LEAD-001"
    
    @patch('airtable_client.requests.Session.request')
    def test_update_record(self, mock_request, client):
        """Test updating an existing record"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "id": "rec123",
            "fields": {"Status": "Contacted"}
        }
        mock_request.return_value = mock_response
        
        record = client.update_record("Leads", "rec123", {"Status": "Contacted"})
        
        assert record["fields"]["Status"] == "Contacted"
    
    @patch('airtable_client.requests.Session.request')
    def test_upsert_record_new(self, mock_request, client):
        """Test upsert operation when record is new"""
        # First call: get_records (returns empty)
        # Second call: create_record (returns new record)
        mock_response_get = Mock()
        mock_response_get.json.return_value = {"records": []}
        mock_response_post = Mock()
        mock_response_post.json.return_value = {
            "id": "rec123",
            "fields": {"LeadID": "LEAD-001", "FirstName": "John"}
        }
        
        mock_request.side_effect = [mock_response_get, mock_response_post]
        
        record, is_new = client.upsert_record("Leads", "LeadID", "LEAD-001", 
                                               {"LeadID": "LEAD-001", "FirstName": "John"})
        
        assert is_new is True
        assert record["id"] == "rec123"
    
    @patch('airtable_client.requests.Session.request')
    def test_batch_create(self, mock_request, client):
        """Test batch creation of records"""
        mock_response = Mock()
        mock_response.json.return_value = {
            "records": [
                {"id": "rec001", "fields": {"LeadID": "LEAD-001"}},
                {"id": "rec002", "fields": {"LeadID": "LEAD-002"}},
            ]
        }
        mock_request.return_value = mock_response
        
        records_data = [
            {"LeadID": "LEAD-001", "FirstName": "John"},
            {"LeadID": "LEAD-002", "FirstName": "Jane"},
        ]
        
        created = client.batch_create("Leads", records_data)
        
        assert len(created) == 2
        assert created[0]["id"] == "rec001"
    
    @patch.object(AirtableClient, 'get_records')
    def test_update_lead_status(self, mock_get, client):
        """Test updating lead status"""
        mock_get.return_value = [{"id": "rec123", "fields": {"Status": "New"}}]
        
        with patch.object(client, 'update_record') as mock_update:
            mock_update.return_value = {"id": "rec123", "fields": {"Status": "Contacted"}}
            
            result = client.update_lead_status("LEAD-001", "Contacted")
            
            assert result["fields"]["Status"] == "Contacted"
            mock_update.assert_called_once()
    
    @patch.object(AirtableClient, 'get_records')
    def test_update_lead_status_not_found(self, mock_get, client):
        """Test error when lead not found"""
        mock_get.return_value = []
        
        with pytest.raises(ValueError) as exc_info:
            client.update_lead_status("LEAD-999", "Contacted")
        
        assert "Lead not found" in str(exc_info.value)
    
    @patch.object(AirtableClient, 'sync_lead')
    @patch.object(AirtableClient, 'sync_deal')
    def test_sync_lead(self, mock_deal, mock_lead, client, sample_lead):
        """Test syncing a lead"""
        mock_lead.return_value = ({"id": "rec123"}, True)
        
        record, is_new = client.sync_lead(sample_lead)
        
        assert is_new is True
        mock_lead.assert_called_once()
    
    @patch.object(AirtableClient, 'get_records')
    def test_get_leads_by_status(self, mock_get, client):
        """Test filtering leads by status"""
        expected = [
            {"id": "rec001", "fields": {"LeadID": "LEAD-001", "Status": "Won"}},
            {"id": "rec002", "fields": {"LeadID": "LEAD-002", "Status": "Won"}},
        ]
        mock_get.return_value = expected
        
        leads = client.get_leads("Won")
        
        assert len(leads) == 2
        mock_get.assert_called_once()
    
    @patch.object(AirtableClient, 'get_deals')
    def test_get_pipeline_summary(self, mock_get, client):
        """Test pipeline summary calculation"""
        mock_get.return_value = [
            {"id": "rec001", "fields": {"Stage": "Discovery", "ContractValue": 50000}},
            {"id": "rec002", "fields": {"Stage": "Proposal", "ContractValue": 75000}},
            {"id": "rec003", "fields": {"Stage": "Closed Won", "ContractValue": 100000}},
        ]
        
        summary = client.get_pipeline_summary()
        
        assert summary["total_deals"] == 3
        assert summary["total_value"] == 225000
        assert "Discovery" in summary["stages"]
        assert summary["stages"]["Discovery"]["count"] == 1
    
    @patch.object(AirtableClient, 'get_active_payments')
    def test_get_mrr(self, mock_get, client):
        """Test MRR calculation"""
        mock_get.return_value = [
            {"id": "pay001", "fields": {"Amount": 1000, "Frequency": "Monthly"}},
            {"id": "pay002", "fields": {"Amount": 3000, "Frequency": "Monthly"}},
            {"id": "pay003", "fields": {"Amount": 12000, "Frequency": "Annual"}},
        ]
        
        mrr = client.get_mrr()
        
        # 1000 + 3000 + (12000/12) = 5000
        assert mrr == 5000
    
    @patch.object(AirtableClient, 'get_agents')
    def test_get_agent_performance(self, mock_get, client):
        """Test agent performance ranking"""
        mock_get.return_value = [
            {
                "id": "agent001",
                "fields": {
                    "AgentName": "Alice",
                    "Specialty": "Legal",
                    "CurrentLeads": 5,
                    "DealsWon": 12,
                    "AnnualRevenue": 500000
                }
            },
            {
                "id": "agent002",
                "fields": {
                    "AgentName": "Bob",
                    "Specialty": "Financial",
                    "CurrentLeads": 3,
                    "DealsWon": 8,
                    "AnnualRevenue": 300000
                }
            },
        ]
        
        performance = client.get_agent_performance()
        
        assert performance[0]["name"] == "Alice"  # Highest revenue
        assert performance[1]["name"] == "Bob"
        assert performance[0]["annual_revenue"] == 500000


class TestLeadDataclass:
    """Test Lead dataclass"""
    
    def test_lead_creation(self):
        """Test creating a Lead"""
        lead = Lead(
            lead_id="LEAD-001",
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="+1-555-0123",
            legal_situation=["Trust"],
            goals=["Tax Savings"],
            qualification_score=85
        )
        
        assert lead.lead_id == "LEAD-001"
        assert lead.first_name == "John"
        assert lead.email == "john@example.com"
        assert lead.qualification_score == 85


class TestDealDataclass:
    """Test Deal dataclass"""
    
    def test_deal_creation(self):
        """Test creating a Deal"""
        deal = Deal(
            deal_id="DEAL-001",
            lead_id="LEAD-001",
            contract_value=50000.00
        )
        
        assert deal.deal_id == "DEAL-001"
        assert deal.lead_id == "LEAD-001"
        assert deal.contract_value == 50000.00
        assert deal.stage == "Discovery"  # Default


class TestPaymentDataclass:
    """Test Payment dataclass"""
    
    def test_payment_creation(self):
        """Test creating a Payment"""
        payment = Payment(
            payment_id="PAY-001",
            deal_id="DEAL-001",
            amount=1000.00,
            frequency="Monthly"
        )
        
        assert payment.payment_id == "PAY-001"
        assert payment.deal_id == "DEAL-001"
        assert payment.amount == 1000.00
        assert payment.frequency == "Monthly"


class TestAgentDataclass:
    """Test Agent dataclass"""
    
    def test_agent_creation(self):
        """Test creating an Agent"""
        agent = Agent(
            agent_name="Alice Johnson",
            specialty="Legal"
        )
        
        assert agent.agent_name == "Alice Johnson"
        assert agent.specialty == "Legal"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
