CREATE TABLE `dispute_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disputeId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileName` varchar(300) NOT NULL,
	`fileType` varchar(100) NOT NULL,
	`mimeType` varchar(100),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dispute_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`paymentTransactionId` int,
	`stripeDisputeId` varchar(255) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'usd',
	`status` enum('warning_needs_response','warning_under_review','warning_closed','needs_response','under_review','charge_refunded','won','lost') NOT NULL DEFAULT 'needs_response',
	`reason` varchar(100) NOT NULL,
	`evidenceDetails` json,
	`evidenceSubmitted` boolean NOT NULL DEFAULT false,
	`evidenceDueBy` timestamp,
	`isRefundable` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`),
	CONSTRAINT `disputes_stripeDisputeId_unique` UNIQUE(`stripeDisputeId`)
);
