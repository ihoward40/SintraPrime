CREATE TABLE `monitored_sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`case_id` int,
	`url` text NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`site_type` varchar(100),
	`check_frequency` varchar(50) NOT NULL DEFAULT 'daily',
	`is_active` boolean NOT NULL DEFAULT true,
	`last_checked` timestamp,
	`last_changed` timestamp,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitored_sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monitored_site_id` int NOT NULL,
	`snapshot_id` int NOT NULL,
	`change_type` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`severity` varchar(50) NOT NULL DEFAULT 'medium',
	`affected_sections` json,
	`ai_analysis` text,
	`is_reviewed` boolean NOT NULL DEFAULT false,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`metadata` json,
	`detected_at` timestamp DEFAULT (now()),
	CONSTRAINT `policy_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monitored_site_id` int NOT NULL,
	`url` text NOT NULL,
	`html_content` text,
	`text_content` text,
	`screenshot_url` text,
	`screenshot_key` varchar(500),
	`content_hash` varchar(64) NOT NULL,
	`change_detected` boolean NOT NULL DEFAULT false,
	`changes_summary` text,
	`diff_from_previous` json,
	`metadata` json,
	`captured_at` timestamp DEFAULT (now()),
	CONSTRAINT `site_snapshots_id` PRIMARY KEY(`id`)
);
