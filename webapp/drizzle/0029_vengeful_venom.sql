CREATE TABLE `irs_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transmitterControlCode` varchar(100),
	`electronicFilingIdentificationNumber` varchar(100),
	`testMode` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastValidated` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `irs_credentials_id` PRIMARY KEY(`id`)
);
