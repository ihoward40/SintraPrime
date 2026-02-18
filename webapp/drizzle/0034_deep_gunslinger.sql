CREATE TABLE `distributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`beneficiaryId` int NOT NULL,
	`trustId` int NOT NULL,
	`amount` int NOT NULL,
	`distributionDate` timestamp NOT NULL,
	`distributionType` enum('income','principal','required_minimum','discretionary') NOT NULL,
	`taxYear` int NOT NULL,
	`description` text,
	`performedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distributions_id` PRIMARY KEY(`id`)
);
