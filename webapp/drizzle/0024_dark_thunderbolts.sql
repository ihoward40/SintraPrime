CREATE TABLE `review_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`review_id` int NOT NULL,
	`user_id` int NOT NULL,
	`reason` text NOT NULL,
	`status` varchar(20) DEFAULT 'pending',
	`moderator_note` text,
	`flagged_at` timestamp DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `review_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tool_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`tool_id` int NOT NULL,
	`score` int NOT NULL,
	`reason` text,
	`feedback` varchar(20),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `tool_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tool_usage_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tool_id` int NOT NULL,
	`user_id` int NOT NULL,
	`usage_count` int DEFAULT 0,
	`last_used` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tool_usage_analytics_id` PRIMARY KEY(`id`)
);
