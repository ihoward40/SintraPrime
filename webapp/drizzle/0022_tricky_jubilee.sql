CREATE TABLE `ai_tools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`skill_level` varchar(50) NOT NULL,
	`budget_tier` varchar(50) NOT NULL,
	`reliability_score` int DEFAULT 0,
	`official_docs` text,
	`pdf_stored` boolean DEFAULT false,
	`pdf_path` text,
	`notes` text,
	`last_reviewed` timestamp,
	`deprecated` boolean DEFAULT false,
	`deprecation_reason` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_tools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_stacks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`project_name` varchar(255) NOT NULL,
	`output_type` varchar(100) NOT NULL,
	`budget` varchar(50) NOT NULL,
	`skill_level` varchar(50) NOT NULL,
	`timeline` varchar(100),
	`status` varchar(50) DEFAULT 'planning',
	`decision_notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_stacks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prompt_id` int NOT NULL,
	`user_id` int NOT NULL,
	`input` text,
	`output` text,
	`executed_at` timestamp DEFAULT (now()),
	`rating` int,
	CONSTRAINT `prompt_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`system_prompt` text NOT NULL,
	`user_prompt_template` text,
	`variables` text,
	`description` text,
	`version` int DEFAULT 1,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stack_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`output_type` varchar(100) NOT NULL,
	`tools_config` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `stack_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stack_tools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stack_id` int NOT NULL,
	`tool_id` int NOT NULL,
	`tool_role` varchar(100) NOT NULL,
	`reasoning` text,
	`is_backup` boolean DEFAULT false,
	`added_at` timestamp DEFAULT (now()),
	CONSTRAINT `stack_tools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tool_documentation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tool_id` int NOT NULL,
	`doc_url` text,
	`pdf_path` text,
	`version` varchar(50),
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `tool_documentation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tool_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tool_id` int NOT NULL,
	`user_id` int NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`date_reviewed` timestamp DEFAULT (now()),
	CONSTRAINT `tool_reviews_id` PRIMARY KEY(`id`)
);
