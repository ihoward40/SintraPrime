CREATE TABLE `caseEmails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`fromAddress` varchar(320),
	`toAddress` varchar(320),
	`subject` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`htmlBody` text,
	`threadId` varchar(100),
	`attachments` json,
	`isStarred` boolean NOT NULL DEFAULT false,
	`isRead` boolean NOT NULL DEFAULT true,
	`sentAt` timestamp,
	`receivedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caseEmails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `filingChecklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`caseType` varchar(100) NOT NULL,
	`jurisdiction` varchar(100) NOT NULL,
	`court` varchar(200),
	`items` json,
	`progress` int NOT NULL DEFAULT 0,
	`status` enum('draft','in_progress','completed') NOT NULL DEFAULT 'draft',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filingChecklists_id` PRIMARY KEY(`id`)
);
