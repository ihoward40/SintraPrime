CREATE TABLE `approval_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestType` varchar(100) NOT NULL,
	`requestedBy` int NOT NULL,
	`action` text NOT NULL,
	`justification` text NOT NULL,
	`estimatedCost` int,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewComment` text,
	`reviewedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approval_requests_id` PRIMARY KEY(`id`)
);
