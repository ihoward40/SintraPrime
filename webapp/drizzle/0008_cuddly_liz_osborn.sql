CREATE TABLE `terminal_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`command` text NOT NULL,
	`output` text,
	`success` boolean NOT NULL DEFAULT true,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `terminal_history_id` PRIMARY KEY(`id`)
);
