CREATE TABLE `workspace_bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`category` varchar(100),
	`notes` text,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_bookmarks_id` PRIMARY KEY(`id`)
);
