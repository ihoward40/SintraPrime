CREATE TABLE `trigger_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger_id` int NOT NULL,
	`workflow_execution_id` int,
	`event_type` varchar(100) NOT NULL,
	`event_id` int,
	`event_data` json,
	`matched_conditions` json,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`error` text,
	`triggered_at` timestamp DEFAULT (now()),
	`executed_at` timestamp,
	CONSTRAINT `trigger_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_triggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`trigger_type` varchar(100) NOT NULL,
	`conditions` json,
	`execution_params` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_triggered` timestamp,
	`trigger_count` int NOT NULL DEFAULT 0,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_triggers_id` PRIMARY KEY(`id`)
);
