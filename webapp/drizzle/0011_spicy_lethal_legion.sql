CREATE TABLE `beneficiaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustId` int NOT NULL,
	`name` varchar(300) NOT NULL,
	`relationship` varchar(100),
	`beneficiaryType` enum('primary','contingent','remainder') NOT NULL,
	`distributionShare` varchar(100),
	`distributionConditions` text,
	`contactInfo` json,
	`status` enum('active','removed','deceased') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beneficiaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_clauses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`category` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`description` text,
	`riskLevel` enum('low','medium','high'),
	`tags` json,
	`isStandard` boolean NOT NULL DEFAULT false,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_clauses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_negotiations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`version` int NOT NULL,
	`changes` json,
	`changedBy` varchar(255) NOT NULL,
	`notes` text,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_negotiations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_obligations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`responsibleParty` varchar(255) NOT NULL,
	`dueDate` timestamp,
	`status` enum('pending','completed','overdue') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `contract_obligations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(500) NOT NULL,
	`contractType` varchar(100) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`placeholders` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`userId` int,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`contractType` varchar(100) NOT NULL,
	`status` enum('draft','under_review','negotiation','executed','terminated') NOT NULL DEFAULT 'draft',
	`parties` json,
	`effectiveDate` timestamp,
	`expirationDate` timestamp,
	`content` text NOT NULL,
	`metadata` json,
	`riskScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fiduciary_duties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustId` int NOT NULL,
	`dutyType` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`dueDate` timestamp,
	`completedDate` timestamp,
	`status` enum('pending','completed','overdue') NOT NULL DEFAULT 'pending',
	`evidence` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fiduciary_duties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_amendments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustId` int NOT NULL,
	`amendmentNumber` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`changes` json,
	`effectiveDate` timestamp NOT NULL,
	`documentUrl` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trust_amendments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustId` int NOT NULL,
	`assetType` enum('real_estate','cash','securities','business_interest','personal_property','intellectual_property','other') NOT NULL,
	`description` text NOT NULL,
	`estimatedValue` int,
	`acquisitionDate` timestamp,
	`location` varchar(500),
	`documentation` json,
	`status` enum('active','sold','distributed','transferred') NOT NULL DEFAULT 'active',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trust_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_distributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustId` int NOT NULL,
	`beneficiaryId` int NOT NULL,
	`amount` int NOT NULL,
	`distributionType` enum('income','principal','discretionary') NOT NULL,
	`purpose` varchar(500),
	`distributionDate` timestamp NOT NULL,
	`method` varchar(100),
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trust_distributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trustees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustId` int NOT NULL,
	`name` varchar(300) NOT NULL,
	`role` enum('primary','successor','co_trustee') NOT NULL,
	`contactInfo` json,
	`appointedDate` timestamp,
	`removedDate` timestamp,
	`status` enum('active','removed','deceased') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trustees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trusts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` int,
	`trustName` varchar(500) NOT NULL,
	`trustType` enum('revocable_living','irrevocable','testamentary','charitable','special_needs','spendthrift','asset_protection') NOT NULL,
	`status` enum('draft','active','amended','terminated') NOT NULL DEFAULT 'draft',
	`settlor` varchar(300) NOT NULL,
	`establishedDate` timestamp,
	`terminationDate` timestamp,
	`purpose` text,
	`terms` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trusts_id` PRIMARY KEY(`id`)
);
