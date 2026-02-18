CREATE TABLE `report_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_id` int NOT NULL,
	`report_type` text NOT NULL,
	`date_range_start` timestamp NOT NULL,
	`date_range_end` timestamp NOT NULL,
	`status` enum('pending','generating','completed','failed') NOT NULL,
	`error_message` text,
	`email_sent` boolean NOT NULL DEFAULT false,
	`email_recipients` text,
	`report_url` text,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`frequency` enum('daily','weekly','monthly') NOT NULL,
	`day_of_week` int,
	`day_of_month` int,
	`time_of_day` text NOT NULL,
	`report_type` enum('compliance','violations','full') NOT NULL,
	`date_range_days` int NOT NULL,
	`email_enabled` boolean NOT NULL DEFAULT true,
	`email_addresses` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_schedules_id` PRIMARY KEY(`id`)
);
