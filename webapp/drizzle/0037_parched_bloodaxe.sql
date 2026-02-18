CREATE TABLE `governance_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyLimit` decimal(10,2) NOT NULL DEFAULT '1000.00',
	`weeklyLimit` decimal(10,2) NOT NULL DEFAULT '5000.00',
	`monthlyLimit` decimal(10,2) NOT NULL DEFAULT '20000.00',
	`approvalThreshold` decimal(10,2) NOT NULL DEFAULT '500.00',
	`enableNotifications` boolean NOT NULL DEFAULT true,
	`enableAutoBlock` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governance_settings_id` PRIMARY KEY(`id`)
);
