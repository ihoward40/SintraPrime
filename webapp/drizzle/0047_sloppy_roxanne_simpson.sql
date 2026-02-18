CREATE TABLE `trigger_alert_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`trigger_id` int,
	`alert_type` varchar(50) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`threshold` decimal(10,2) NOT NULL,
	`check_interval` int NOT NULL,
	`notify_owner` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trigger_alert_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trigger_performance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger_id` int NOT NULL,
	`alert_type` varchar(50) NOT NULL,
	`threshold` decimal(10,2) NOT NULL,
	`current_value` decimal(10,2) NOT NULL,
	`message` text NOT NULL,
	`severity` varchar(20) NOT NULL,
	`is_resolved` boolean NOT NULL DEFAULT false,
	`resolved_at` timestamp,
	`notification_sent` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trigger_performance_alerts_id` PRIMARY KEY(`id`)
);
