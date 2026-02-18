CREATE TABLE `workflow_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`user_id` int NOT NULL,
	`case_id` int,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`current_step` int NOT NULL DEFAULT 0,
	`total_steps` int NOT NULL,
	`variables` json,
	`step_results` json,
	`error` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`workflow_type` varchar(100) NOT NULL,
	`definition` json NOT NULL,
	`is_template` boolean NOT NULL DEFAULT false,
	`is_public` boolean NOT NULL DEFAULT false,
	`category` varchar(100),
	`tags` json,
	`version` int NOT NULL DEFAULT 1,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflows_id` PRIMARY KEY(`id`)
);
