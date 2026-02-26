CREATE TABLE `autonomous_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`objective` text,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`tags` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autonomous_tasks_id` PRIMARY KEY(`id`)
);
