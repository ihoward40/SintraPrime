CREATE TABLE `email_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email_id` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`content_type` varchar(100),
	`size` int,
	`s3_key` varchar(500) NOT NULL,
	`s3_url` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `email_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message_id` varchar(255) NOT NULL,
	`from` varchar(255) NOT NULL,
	`to` text NOT NULL,
	`cc` text,
	`subject` varchar(500),
	`body` text,
	`html_body` text,
	`attachments` json,
	`received_at` timestamp NOT NULL,
	`case_id` int,
	`processed` boolean DEFAULT false,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `email_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_messages_message_id_unique` UNIQUE(`message_id`)
);
