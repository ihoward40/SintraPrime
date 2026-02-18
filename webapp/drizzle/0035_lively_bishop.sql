CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slackEnabled` boolean NOT NULL DEFAULT false,
	`slackWebhookUrl` text,
	`slackChannel` varchar(255),
	`emailEnabled` boolean NOT NULL DEFAULT false,
	`emailRecipients` text,
	`notifyHighSeverity` boolean NOT NULL DEFAULT true,
	`notifyPolicyViolations` boolean NOT NULL DEFAULT true,
	`notifySpendingThresholds` boolean NOT NULL DEFAULT true,
	`notifyApprovalRequests` boolean NOT NULL DEFAULT true,
	`notifyComplianceIssues` boolean NOT NULL DEFAULT true,
	`spendingThresholdPercent` int NOT NULL DEFAULT 80,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_userId_unique` UNIQUE(`userId`)
);
