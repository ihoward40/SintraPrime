CREATE TABLE `nanobot_error_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`error_type` varchar(100) NOT NULL,
	`severity` varchar(50) NOT NULL,
	`error_message` text NOT NULL,
	`stack_trace` text,
	`context` json,
	`source` varchar(200),
	`resolved` boolean NOT NULL DEFAULT false,
	`resolvedAt` timestamp,
	`resolved_by` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nanobot_error_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nanobot_learning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`error_pattern` text NOT NULL,
	`repair_strategy` text NOT NULL,
	`success_rate` int NOT NULL DEFAULT 0,
	`times_applied` int NOT NULL DEFAULT 0,
	`last_applied` timestamp,
	`confidence` int NOT NULL DEFAULT 50,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nanobot_learning_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nanobot_repairs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`error_log_id` int,
	`repair_type` varchar(100) NOT NULL,
	`repair_description` text NOT NULL,
	`repair_actions` json NOT NULL,
	`success` boolean NOT NULL,
	`result_message` text,
	`execution_time` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nanobot_repairs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`check_type` varchar(100) NOT NULL,
	`endpoint` varchar(500),
	`status` varchar(50) NOT NULL,
	`response_time` int,
	`error_message` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_health_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metric_type` varchar(100) NOT NULL,
	`metric_value` int NOT NULL,
	`unit` varchar(50),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_metrics_id` PRIMARY KEY(`id`)
);
