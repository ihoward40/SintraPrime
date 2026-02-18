CREATE TABLE `audit_trail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('document_upload','document_processing','document_verification','journal_entry_create','journal_entry_update','journal_entry_delete','trust_account_create','trust_account_update','dni_calculation','k1_generation','form1041_generation','efile_submission') NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`beforeData` json,
	`afterData` json,
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_trail_id` PRIMARY KEY(`id`)
);
