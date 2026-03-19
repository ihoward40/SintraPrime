-- ============================================================================
-- Migration 0051: Comprehensive Feature Tables
-- ============================================================================

-- Two-Factor Authentication
CREATE TABLE IF NOT EXISTS `user_totp` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `secret` varchar(64) NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `backupCodes` text,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- Rate Limiting Logs
CREATE TABLE IF NOT EXISTS `rate_limit_log` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `endpoint` varchar(128) NOT NULL,
  `ipAddress` varchar(64),
  `requestCount` int NOT NULL DEFAULT 1,
  `windowStart` timestamp NOT NULL DEFAULT NOW(),
  `blocked` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT NOW()
);

-- Time Tracking
CREATE TABLE IF NOT EXISTS `time_entries` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `caseId` int,
  `description` text NOT NULL,
  `category` enum('research','drafting','court','client_comm','admin','review','other') NOT NULL DEFAULT 'other',
  `startTime` timestamp NOT NULL,
  `endTime` timestamp,
  `durationMinutes` int,
  `billable` boolean NOT NULL DEFAULT true,
  `hourlyRate` decimal(10,2),
  `invoiced` boolean NOT NULL DEFAULT false,
  `invoiceId` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS `billing_invoices` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `caseId` int,
  `invoiceNumber` varchar(64) NOT NULL UNIQUE,
  `clientName` varchar(255) NOT NULL,
  `clientEmail` varchar(320),
  `totalAmount` decimal(10,2) NOT NULL DEFAULT 0,
  `status` enum('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
  `dueDate` timestamp,
  `paidAt` timestamp,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- Document Intelligence Results
CREATE TABLE IF NOT EXISTS `document_intelligence` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `documentId` int,
  `caseId` int,
  `fileName` varchar(512) NOT NULL,
  `extractedText` longtext,
  `entities` json,
  `clauses` json,
  `risks` json,
  `summary` text,
  `keyDates` json,
  `keyParties` json,
  `contradictions` json,
  `processingStatus` enum('pending','processing','complete','failed') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- LLM Router Config
CREATE TABLE IF NOT EXISTS `llm_router_config` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `defaultModel` varchar(64) NOT NULL DEFAULT 'gpt-4o',
  `reasoningModel` varchar(64) NOT NULL DEFAULT 'gpt-4o',
  `longDocModel` varchar(64) NOT NULL DEFAULT 'gpt-4o',
  `fastModel` varchar(64) NOT NULL DEFAULT 'gpt-4o-mini',
  `costOptimize` boolean NOT NULL DEFAULT false,
  `privacyMode` boolean NOT NULL DEFAULT false,
  `autoRoute` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- Plugin Registry
CREATE TABLE IF NOT EXISTS `plugins` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `slug` varchar(128) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` enum('ai','legal','productivity','integration','analytics','security','other') NOT NULL DEFAULT 'other',
  `author` varchar(255) NOT NULL,
  `version` varchar(32) NOT NULL DEFAULT '1.0.0',
  `repoUrl` varchar(512),
  `iconUrl` varchar(512),
  `stars` int NOT NULL DEFAULT 0,
  `downloads` int NOT NULL DEFAULT 0,
  `verified` boolean NOT NULL DEFAULT false,
  `tags` json,
  `createdAt` timestamp NOT NULL DEFAULT NOW()
);

-- Installed Plugins per User
CREATE TABLE IF NOT EXISTS `user_plugins` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `pluginId` int NOT NULL,
  `enabled` boolean NOT NULL DEFAULT true,
  `config` json,
  `installedAt` timestamp NOT NULL DEFAULT NOW()
);

-- Jurisdiction Database
CREATE TABLE IF NOT EXISTS `legal_jurisdictions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(16) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `country` varchar(64) NOT NULL DEFAULT 'US',
  `type` enum('federal','state','county','international','regulatory') NOT NULL DEFAULT 'state',
  `courtSystem` text,
  `filingDeadlines` json,
  `localRules` json,
  `resources` json,
  `createdAt` timestamp NOT NULL DEFAULT NOW()
);

-- Daily Activity Digest Settings
CREATE TABLE IF NOT EXISTS `digest_settings` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `enabled` boolean NOT NULL DEFAULT true,
  `frequency` enum('daily','weekly','never') NOT NULL DEFAULT 'daily',
  `sendTime` varchar(8) NOT NULL DEFAULT '08:00',
  `timezone` varchar(64) NOT NULL DEFAULT 'America/New_York',
  `includeDeadlines` boolean NOT NULL DEFAULT true,
  `includeCaseUpdates` boolean NOT NULL DEFAULT true,
  `includeAIInsights` boolean NOT NULL DEFAULT true,
  `includeTimeTracking` boolean NOT NULL DEFAULT true,
  `lastSentAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

