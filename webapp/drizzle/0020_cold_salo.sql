CREATE TABLE `pacer_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`username` varchar(255) NOT NULL,
	`encrypted_password` text NOT NULL,
	`client_code` varchar(50),
	`is_active` boolean NOT NULL DEFAULT true,
	`last_verified` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pacer_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `pacer_credentials_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `pacer_docket_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`court_identifier_id` int NOT NULL,
	`case_number` varchar(100) NOT NULL,
	`court` varchar(50) NOT NULL,
	`docket_data` json NOT NULL,
	`last_fetched` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pacer_docket_cache_id` PRIMARY KEY(`id`)
);
