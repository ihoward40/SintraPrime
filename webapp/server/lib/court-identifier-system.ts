/**
 * Court Identifier Tracking System
 * 
 * Unified system for tracking cases across multiple jurisdictions:
 * - Federal courts (PACER)
 * - State courts
 * - Local courts
 * - International courts
 * 
 * Each case gets a unique SintraPrime identifier that links to:
 * - External court identifiers (case numbers, docket numbers)
 * - Internal case management system
 * - Automated monitoring and alerts
 */

import { getDb } from "../db";
import { courtIdentifiers, courtMonitoringRules, courtAlerts } from "../../drizzle/schema";
import { eq, and, or, desc } from "drizzle-orm";

export interface CourtIdentifier {
  id: number;
  sintraPrimeId: string; // Internal unique ID
  externalCaseNumber: string; // Court's case number
  courtSystem: CourtSystem;
  courtId: string; // Specific court (e.g., "cacd", "nysd")
  courtName: string;
  jurisdiction: Jurisdiction;
  caseTitle: string;
  filedDate: Date;
  status: CaseStatus;
  lastChecked?: Date;
  lastDocketEntry?: number;
  monitoringEnabled: boolean;
  userId: number;
  internalCaseId?: number; // Link to internal case management
  createdAt: Date;
  updatedAt: Date;
}

export enum CourtSystem {
  FEDERAL_DISTRICT = "federal_district",
  FEDERAL_CIRCUIT = "federal_circuit",
  FEDERAL_SUPREME = "federal_supreme",
  STATE_SUPREME = "state_supreme",
  STATE_APPELLATE = "state_appellate",
  STATE_TRIAL = "state_trial",
  LOCAL_MUNICIPAL = "local_municipal",
  INTERNATIONAL = "international",
}

export enum Jurisdiction {
  FEDERAL = "federal",
  STATE = "state",
  LOCAL = "local",
  INTERNATIONAL = "international",
}

export enum CaseStatus {
  ACTIVE = "active",
  PENDING = "pending",
  CLOSED = "closed",
  APPEALED = "appealed",
  SETTLED = "settled",
  DISMISSED = "dismissed",
}

export interface MonitoringRule {
  id: number;
  courtIdentifierId: number;
  ruleType: MonitoringRuleType;
  keywords?: string[];
  documentTypes?: string[];
  partyNames?: string[];
  alertOnAnyChange: boolean;
  notificationMethod: NotificationMethod[];
  enabled: boolean;
  createdAt: Date;
}

export enum MonitoringRuleType {
  NEW_DOCKET_ENTRY = "new_docket_entry",
  SPECIFIC_DOCUMENT = "specific_document",
  PARTY_FILING = "party_filing",
  JUDGE_ORDER = "judge_order",
  HEARING_SCHEDULED = "hearing_scheduled",
  STATUS_CHANGE = "status_change",
  DEADLINE_APPROACHING = "deadline_approaching",
}

export enum NotificationMethod {
  EMAIL = "email",
  SMS = "sms",
  IN_APP = "in_app",
  WEBHOOK = "webhook",
  SLACK = "slack",
}

export interface CourtAlert {
  id: number;
  courtIdentifierId: number;
  monitoringRuleId?: number;
  alertType: string;
  title: string;
  description: string;
  docketEntryNumber?: number;
  documentNumber?: string;
  severity: AlertSeverity;
  read: boolean;
  createdAt: Date;
}

export enum AlertSeverity {
  INFO = "info",
  WARNING = "warning",
  URGENT = "urgent",
  CRITICAL = "critical",
}

export class CourtIdentifierSystem {
  /**
   * Create a new court identifier
   */
  async createIdentifier(data: {
    externalCaseNumber: string;
    courtSystem: CourtSystem;
    courtId: string;
    courtName: string;
    jurisdiction: Jurisdiction;
    caseTitle: string;
    filedDate: Date;
    status: CaseStatus;
    userId: number;
    internalCaseId?: number;
  }): Promise<CourtIdentifier> {
    const sintraPrimeId = this.generateSintraPrimeId(data.courtSystem, data.courtId);

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db
      .insert(courtIdentifiers)
      .values({
        sintraPrimeId,
        externalCaseNumber: data.externalCaseNumber,
        courtSystem: data.courtSystem,
        courtId: data.courtId,
        courtName: data.courtName,
        jurisdiction: data.jurisdiction,
        caseTitle: data.caseTitle,
        filedDate: data.filedDate,
        status: data.status,
        monitoringEnabled: true,
        userId: data.userId,
        internalCaseId: data.internalCaseId,
      });

    // Retrieve the inserted identifier
    const [identifier] = await db
      .select()
      .from(courtIdentifiers)
      .where(eq(courtIdentifiers.sintraPrimeId, sintraPrimeId))
      .limit(1);

    return identifier as CourtIdentifier;
  }

  /**
   * Generate unique SintraPrime ID
   */
  private generateSintraPrimeId(courtSystem: CourtSystem, courtId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `SP-${courtSystem.substring(0, 3).toUpperCase()}-${courtId.toUpperCase()}-${timestamp}-${random}`;
  }

  /**
   * Get identifier by SintraPrime ID
   */
  async getIdentifier(sintraPrimeId: string): Promise<CourtIdentifier | null> {
    const db = await getDb();
    if (!db) return null;
    
    const [identifier] = await db
      .select()
      .from(courtIdentifiers)
      .where(eq(courtIdentifiers.sintraPrimeId, sintraPrimeId))
      .limit(1);

    return (identifier as CourtIdentifier) || null;
  }

  /**
   * Get all identifiers for a user
   */
  async getUserIdentifiers(userId: number): Promise<CourtIdentifier[]> {
    const db = await getDb();
    if (!db) return [];
    
    const identifiers = await db
      .select()
      .from(courtIdentifiers)
      .where(eq(courtIdentifiers.userId, userId))
      .orderBy(desc(courtIdentifiers.createdAt));

    return identifiers as CourtIdentifier[];
  }

  /**
   * Update identifier status
   */
  async updateStatus(sintraPrimeId: string, status: CaseStatus): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(courtIdentifiers)
      .set({ status, updatedAt: new Date() })
      .where(eq(courtIdentifiers.sintraPrimeId, sintraPrimeId));
  }

  /**
   * Update last checked timestamp
   */
  async updateLastChecked(sintraPrimeId: string, lastDocketEntry?: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(courtIdentifiers)
      .set({
        lastChecked: new Date(),
        lastDocketEntry,
        updatedAt: new Date(),
      })
      .where(eq(courtIdentifiers.sintraPrimeId, sintraPrimeId));
  }

  /**
   * Enable/disable monitoring
   */
  async setMonitoring(sintraPrimeId: string, enabled: boolean): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(courtIdentifiers)
      .set({ monitoringEnabled: enabled, updatedAt: new Date() })
      .where(eq(courtIdentifiers.sintraPrimeId, sintraPrimeId));
  }

  /**
   * Create monitoring rule
   */
  async createMonitoringRule(data: {
    courtIdentifierId: number;
    ruleType: MonitoringRuleType;
    keywords?: string[];
    documentTypes?: string[];
    partyNames?: string[];
    alertOnAnyChange: boolean;
    notificationMethod: NotificationMethod[];
  }): Promise<MonitoringRule> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db
      .insert(courtMonitoringRules)
      .values({
        ...data,
        enabled: true,
      });

    // Retrieve the inserted rule
    const [rule] = await db
      .select()
      .from(courtMonitoringRules)
      .where(eq(courtMonitoringRules.courtIdentifierId, data.courtIdentifierId))
      .orderBy(desc(courtMonitoringRules.id))
      .limit(1);

    return rule as MonitoringRule;
  }

  /**
   * Get monitoring rules for identifier
   */
  async getMonitoringRules(courtIdentifierId: number): Promise<MonitoringRule[]> {
    const db = await getDb();
    if (!db) return [];
    
    const rules = await db
      .select()
      .from(courtMonitoringRules)
      .where(eq(courtMonitoringRules.courtIdentifierId, courtIdentifierId));

    return rules as MonitoringRule[];
  }

  /**
   * Create alert
   */
  async createAlert(data: {
    courtIdentifierId: number;
    monitoringRuleId?: number;
    alertType: string;
    title: string;
    description: string;
    docketEntryNumber?: number;
    documentNumber?: string;
    severity: AlertSeverity;
  }): Promise<CourtAlert> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db
      .insert(courtAlerts)
      .values({
        ...data,
        read: false,
      });

    // Retrieve the inserted alert
    const [alert] = await db
      .select()
      .from(courtAlerts)
      .where(eq(courtAlerts.courtIdentifierId, data.courtIdentifierId))
      .orderBy(desc(courtAlerts.id))
      .limit(1);

    return alert as CourtAlert;
  }

  /**
   * Get alerts for identifier
   */
  async getAlerts(courtIdentifierId: number, unreadOnly: boolean = false): Promise<CourtAlert[]> {
    const db = await getDb();
    if (!db) return [];
    
    const conditions: any[] = [eq(courtAlerts.courtIdentifierId, courtIdentifierId)];

    if (unreadOnly) {
      conditions.push(eq(courtAlerts.read, false));
    }

    const alerts = await db
      .select()
      .from(courtAlerts)
      .where(and(...conditions))
      .orderBy(desc(courtAlerts.createdAt));
    return alerts as CourtAlert[];
  }

  /**
   * Mark alert as read
   */
  async markAlertRead(alertId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    await db.update(courtAlerts).set({ read: true }).where(eq(courtAlerts.id, alertId));
  }

  /**
   * Get identifiers that need monitoring check
   */
  async getIdentifiersForMonitoring(maxAgeMinutes: number = 15): Promise<CourtIdentifier[]> {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const db = await getDb();
    if (!db) return [];
    
    const identifiers = await db
      .select()
      .from(courtIdentifiers)
      .where(
        eq(courtIdentifiers.monitoringEnabled, true)
      );

    return identifiers as CourtIdentifier[];
  }

  /**
   * Link to internal case
   */
  async linkToInternalCase(sintraPrimeId: string, internalCaseId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(courtIdentifiers)
      .set({ internalCaseId, updatedAt: new Date() })
      .where(eq(courtIdentifiers.sintraPrimeId, sintraPrimeId));
  }

  /**
   * Search identifiers
   */
  async searchIdentifiers(query: {
    userId: number;
    caseNumber?: string;
    caseTitle?: string;
    courtSystem?: CourtSystem;
    jurisdiction?: Jurisdiction;
    status?: CaseStatus;
  }): Promise<CourtIdentifier[]> {
    const db = await getDb();
    if (!db) return [];
    
    const conditions: any[] = [eq(courtIdentifiers.userId, query.userId)];

    if (query.caseNumber) {
      conditions.push(eq(courtIdentifiers.externalCaseNumber, query.caseNumber));
    }

    if (query.courtSystem) {
      conditions.push(eq(courtIdentifiers.courtSystem, query.courtSystem));
    }

    if (query.jurisdiction) {
      conditions.push(eq(courtIdentifiers.jurisdiction, query.jurisdiction));
    }

    if (query.status) {
      conditions.push(eq(courtIdentifiers.status, query.status));
    }

    const identifiers = await db
      .select()
      .from(courtIdentifiers)
      .where(and(...conditions))
      .orderBy(desc(courtIdentifiers.createdAt));
    return identifiers as CourtIdentifier[];
  }
}

// Singleton instance
export const courtIdentifierSystem = new CourtIdentifierSystem();
