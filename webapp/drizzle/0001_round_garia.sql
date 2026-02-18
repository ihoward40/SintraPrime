CREATE TABLE `aiChats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` int,
	`sessionId` varchar(100) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiChats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` int,
	`url` text NOT NULL,
	`title` varchar(500),
	`description` text,
	`category` varchar(100),
	`tags` json,
	`screenshotUrl` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caseEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`eventType` varchar(100),
	`eventDate` timestamp NOT NULL,
	`dueDate` timestamp,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`relatedDocumentId` int,
	`relatedEvidenceId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caseEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caseNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`noteType` varchar(100),
	`isPinned` boolean NOT NULL DEFAULT false,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caseNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`caseNumber` varchar(100),
	`description` text,
	`status` enum('draft','active','pending','won','lost','settled','archived') NOT NULL DEFAULT 'draft',
	`caseType` varchar(100),
	`jurisdiction` varchar(100),
	`court` varchar(200),
	`filingDate` timestamp,
	`trialDate` timestamp,
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`tags` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coalitionMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coalitionId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coalitionMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coalitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`creatorId` int NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT false,
	`memberCount` int NOT NULL DEFAULT 1,
	`tags` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coalitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`documentType` varchar(100),
	`fileUrl` text,
	`fileKey` varchar(500),
	`fileName` varchar(300),
	`mimeType` varchar(100),
	`fileSize` int,
	`content` text,
	`version` int NOT NULL DEFAULT 1,
	`isTemplate` boolean NOT NULL DEFAULT false,
	`templateCategory` varchar(100),
	`tags` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`evidenceType` varchar(100),
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(300),
	`mimeType` varchar(100),
	`fileSize` int,
	`sourceUrl` text,
	`captureMethod` varchar(100),
	`blockchainHash` varchar(200),
	`blockchainTimestamp` timestamp,
	`blockchainVerified` boolean NOT NULL DEFAULT false,
	`chainOfCustody` json,
	`tags` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legalAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`caseId` int,
	`alertType` varchar(100) NOT NULL,
	`jurisdiction` varchar(100),
	`title` varchar(500) NOT NULL,
	`description` text,
	`sourceUrl` text,
	`relevanceScore` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legalAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`name` varchar(300) NOT NULL,
	`type` enum('plaintiff','defendant','creditor','attorney','witness','other') NOT NULL,
	`entityType` enum('individual','corporation','llc','partnership','government','other'),
	`contactInfo` json,
	`corporateInfo` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warfareStrategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`strategyName` varchar(300) NOT NULL,
	`front` enum('legal','regulatory','technical','information','financial','political','unconventional') NOT NULL,
	`description` text,
	`tactics` json,
	`status` enum('planned','active','completed','abandoned') NOT NULL DEFAULT 'planned',
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warfareStrategies_id` PRIMARY KEY(`id`)
);
