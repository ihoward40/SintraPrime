CREATE TABLE `automation_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_id` varchar(255) NOT NULL,
	`demo_type` varchar(100) NOT NULL,
	`result_data` text,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`error_message` text,
	`recording_url` varchar(500),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`duration` int,
	CONSTRAINT `automation_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demo_usage_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`demo_type` varchar(100) NOT NULL,
	`total_executions` int NOT NULL DEFAULT 0,
	`successful_executions` int NOT NULL DEFAULT 0,
	`failed_executions` int NOT NULL DEFAULT 0,
	`average_duration` int DEFAULT 0,
	`last_executed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demo_usage_metrics_id` PRIMARY KEY(`id`)
);
