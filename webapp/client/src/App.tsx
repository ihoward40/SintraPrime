import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/DashboardModern";
import CaseDetail from "./pages/CaseDetail";
import Documents from "./pages/Documents";
import Evidence from "./pages/Evidence";
import QuantumWorkspace from "./pages/QuantumWorkspaceEnhanced";
import AICompanion from "./pages/AICompanion";
import Coalitions from "./pages/Coalitions";
import WarfareStrategies from "./pages/WarfareStrategies";
import LegalAlerts from "./pages/LegalAlerts";
import DeadlineCalculator from "./pages/DeadlineCalculator";
import Pricing from "./pages/Pricing";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import CaseEmails from "./pages/CaseEmails";
import FilingChecklists from "./pages/FilingChecklists";
import ResearchLibrary from "./pages/ResearchLibrary";
import CaseExport from "./pages/CaseExport";
import CalendarExport from "./pages/CalendarExport";
import Settings from "./pages/Settings";
import BulkCaseImport from "./pages/BulkCaseImport";
import CommandCenter from "./pages/CommandCenter";
import WorkspaceManagement from "./pages/WorkspaceManagement";
import LegalAgents from "./pages/LegalAgents";
import AutonomousAgent from "./pages/AutonomousAgent";
import WorkflowTemplates from "./pages/WorkflowTemplates";
import ContractDrafting from "./pages/ContractDrafting";
import ContractReview from "./pages/ContractReview";
import TrustCreationWizard from "./pages/TrustCreationWizard";
import TrustManagement from "./pages/TrustManagement";
import NanobotDashboard from "./pages/NanobotDashboard";
import AIAssistant from "./pages/AIAssistant";
import AgentZero from "./pages/AgentZero";
import SlideGenerator from "./pages/SlideGenerator";
import DigitalProductCreator from "./pages/DigitalProductCreator";
import CaseTemplates from "./pages/CaseTemplates";
import CaseTemplate from "./pages/CaseTemplate";
import WakeWordSettings from "./pages/WakeWordSettings";
import KeyboardShortcuts from "./pages/KeyboardShortcuts";
import CaseAnalytics from "./pages/CaseAnalytics";
import CaseTemplatesLibrary from "./pages/CaseTemplatesLibrary";
import AutomationDemo from "./pages/AutomationDemo";
import AutomationHistory from "./pages/AutomationHistory";
import IntelligenceCenter from "./pages/IntelligenceCenter";
import PACERSettings from "./pages/PACERSettings";
import CourtMonitoring from "./pages/CourtMonitoring";
import AgentZeroChat from "./pages/AgentZeroChat";
import NotebookLM from "./pages/NotebookLM";
import MissionControl from "./pages/MissionControl";
import { ModerationDashboard } from "./pages/ModerationDashboard";
import UsageAnalytics from "./pages/UsageAnalytics";
import Circular230 from "./pages/Circular230";
import TaxAgent from "./pages/TaxAgent";
import IRSSettings from "./pages/IRSSettings";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentDashboard from "./pages/PaymentDashboard";
import BeneficiaryPortal from "./pages/BeneficiaryPortal";
import DisputeManagementPage from "./pages/DisputeManagementPage";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import Governance from "./pages/Governance";
import NotificationSettings from "./pages/NotificationSettings";
import GovernanceAnalytics from "./pages/GovernanceAnalytics";
import BeneficiaryManagement from "./pages/BeneficiaryManagement";
import ApprovalWorkflow from './pages/ApprovalWorkflow';
import AdminDashboard from './pages/AdminDashboard';
import GovernanceSettings from './pages/GovernanceSettings';
import GovernanceAuditLog from './pages/GovernanceAuditLog';
import PolicyTemplates from './pages/PolicyTemplates';
import AlertSettings from './pages/AlertSettings';
import ComplianceReports from "./pages/ComplianceReports";
import TimelineBuilder from "./pages/TimelineBuilder";
import IngestMonitoring from "./pages/IngestMonitoring";
import WebMonitoring from "./pages/WebMonitoring";
import WorkflowTriggers from "./pages/WorkflowTriggers";
import MakeIntegration from "./pages/MakeIntegration";
import TriggerAnalytics from "./pages/TriggerAnalytics";
import TriggerTester from "./pages/TriggerTester";
import TriggerAlertSettings from "./pages/TriggerAlertSettings";
import TriggerExecutionHistory from "./pages/TriggerExecutionHistory";
import TriggerDashboard from "./pages/TriggerDashboard";
import TriggerOptimizer from "./pages/TriggerOptimizer";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/analytics/cases" component={CaseAnalytics} />
      <Route path="/templates/library" component={CaseTemplatesLibrary} />
       <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/cases/:id"} component={CaseDetail} />
      <Route path={"/cases/:id/template"} component={CaseTemplate} />
      <Route path={"/documents"} component={Documents} />
      <Route path={"/evidence"} component={Evidence} />
      <Route path={"/workspace"} component={QuantumWorkspace} />
      <Route path="/ai" component={AICompanion} />
      <Route path="/ai-companion" component={AICompanion} />
      <Route path={"/ai-assistant"} component={AIAssistant} />
      <Route path={"/agent-zero"} component={AgentZero} />
      <Route path={"/slides"} component={SlideGenerator} />
      <Route path={"/digital-products"} component={DigitalProductCreator} />
      <Route path={"/case-templates"} component={CaseTemplates} />
      <Route path={"/coalitions"} component={Coalitions} />
      <Route path={"/strategies"} component={WarfareStrategies} />
      <Route path={"/alerts"} component={LegalAlerts} />
      <Route path={"/deadlines"} component={DeadlineCalculator} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/emails"} component={CaseEmails} />
      <Route path={"/filing-checklists"} component={FilingChecklists} />
      <Route path={"/research"} component={ResearchLibrary} />
      <Route path={"/case-export"} component={CaseExport} />
      <Route path={"/calendar"} component={CalendarExport} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/settings/wake-word"} component={WakeWordSettings} />
      <Route path={"/settings/keyboard-shortcuts"} component={KeyboardShortcuts} />
      <Route path={"/bulk-import"} component={BulkCaseImport} />
      <Route path={"/command-center"} component={CommandCenter} />
      <Route path={"/workspaces"} component={WorkspaceManagement} />
      <Route path={"/legal-agents"} component={LegalAgents} />
      <Route path={"/autonomous-agent"} component={AutonomousAgent} />
      <Route path={"/workflows"} component={WorkflowTemplates} />
      <Route path={"/contracts/draft"} component={ContractDrafting} />
      <Route path={"/contracts/review"} component={ContractReview} />
      <Route path={"/trusts"} component={TrustManagement} />
      <Route path={"/trusts/create"} component={TrustCreationWizard} />
      <Route path={"/nanobot"} component={NanobotDashboard} />
      <Route path={"/automation-demo"} component={AutomationDemo} />
      <Route path={"/automation-history"} component={AutomationHistory} />
          <Route path="/intelligence-center" component={IntelligenceCenter} />
          <Route path="/settings/pacer" component={PACERSettings} />
      <Route path="/court-monitoring" component={CourtMonitoring} />
      <Route path="/agent-zero-chat" component={AgentZeroChat} />
      <Route path="/notebooklm" component={NotebookLM} />
      <Route path="/mission-control" component={MissionControl} />
      <Route path="/moderation" component={ModerationDashboard} />
      <Route path="/usage-analytics" component={UsageAnalytics} />
      <Route path="/circular-230" component={Circular230} />
          <Route path="/tax-agent" component={TaxAgent} />
          <Route path="/irs-settings" component={IRSSettings} />
          <Route path="/payment/success" component={PaymentSuccess} />
          <Route path="/payment/cancel" component={PaymentCancel} />
          <Route path="/payments/dashboard" component={PaymentDashboard} />
          <Route path="/disputes" component={DisputeManagementPage} />
          <Route path="/subscriptions" component={SubscriptionManagement} />
      <Route path="/governance" component={Governance} />
      <Route path="/settings/notifications" component={NotificationSettings} />
      <Route path={"/governance/analytics"} component={GovernanceAnalytics} />
      <Route path={"/ingest-monitoring"} component={IngestMonitoring} />
      <Route path={"/web-monitoring"} component={WebMonitoring} />
      <Route path={"/workflow-triggers"} component={WorkflowTriggers} />
      <Route path={"/integrations/make"} component={MakeIntegration} />
      <Route path={"/trigger-analytics"} component={TriggerAnalytics} />
      <Route path={"/trigger-test"} component={TriggerTester} />
      <Route path={"/trigger-alert-settings"} component={TriggerAlertSettings} />      <Route path={" /trigger-history"} component={TriggerExecutionHistory} />
      <Route path={" /trigger-dashboard"} component={TriggerDashboard} />
      <Route path={" /trigger-optimizer"} component={TriggerOptimizer} />      <Route path="/governance/approvals" component={ApprovalWorkflow} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/governance/settings" component={GovernanceSettings} />
      <Route path="/governance/audit-log" component={GovernanceAuditLog} />
      <Route path="/governance/policy-templates" component={PolicyTemplates} />
      <Route path="/governance/alert-settings" component={AlertSettings} />
      <Route path="/governance/compliance-reports" component={ComplianceReports} />
      <Route path="/cases/:caseId/timeline" component={TimelineBuilder} />
      <Route path="/beneficiary-portal" component={BeneficiaryPortal} />
      <Route path="/beneficiaries" component={BeneficiaryManagement} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
