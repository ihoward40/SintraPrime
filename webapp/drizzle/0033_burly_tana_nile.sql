CREATE TABLE `receipt_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptId` varchar(36) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`action` varchar(255) NOT NULL,
	`actor` varchar(255) NOT NULL,
	`evidenceHash` varchar(64) NOT NULL,
	`signature` varchar(255),
	`outcome` enum('success','failure','partial') NOT NULL,
	`details` json NOT NULL,
	`metadata` json,
	`severity` enum('low','medium','high','critical'),
	`requiresReview` boolean NOT NULL DEFAULT false,
	`reviewedAt` timestamp,
	`reviewedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipt_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipt_ledger_receiptId_unique` UNIQUE(`receiptId`)
);
