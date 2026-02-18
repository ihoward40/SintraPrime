CREATE TABLE `alert_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`alert_type` enum('compliance_threshold','violation_count','critical_event','spending_limit') NOT NULL,
	`compliance_min_score` decimal(5,2),
	`violation_count_threshold` int,
	`spending_limit_amount` decimal(10,2),
	`email_enabled` boolean NOT NULL DEFAULT false,
	`email_address` text,
	`slack_enabled` boolean NOT NULL DEFAULT false,
	`slack_webhook_url` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`cooldown_minutes` int NOT NULL DEFAULT 60,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alert_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configuration_id` int NOT NULL,
	`alert_type` text NOT NULL,
	`message` text NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`trigger_value` decimal(10,2),
	`threshold` decimal(10,2),
	`email_sent` boolean NOT NULL DEFAULT false,
	`slack_sent` boolean NOT NULL DEFAULT false,
	`triggered_at` timestamp NOT NULL DEFAULT (now()),
	`metadata` json,
	CONSTRAINT `alert_history_id` PRIMARY KEY(`id`)
);
