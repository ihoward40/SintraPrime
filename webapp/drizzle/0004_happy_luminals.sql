CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` int,
	`type` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`link` varchar(500),
	`isRead` boolean NOT NULL DEFAULT false,
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
