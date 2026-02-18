CREATE TABLE `adapter_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`adapter_type` varchar(100) NOT NULL,
	`connection_name` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`oauth_tokens` json,
	`config` json,
	`last_sync_at` timestamp,
	`error_message` text,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adapter_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adapter_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`connection_id` int NOT NULL,
	`request_type` varchar(100) NOT NULL,
	`params` json NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`approval_status` varchar(50) DEFAULT 'pending',
	`approved_by` int,
	`approved_at` timestamp,
	`rejection_reason` text,
	`execution_result` json,
	`executed_at` timestamp,
	`error_message` text,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adapter_requests_id` PRIMARY KEY(`id`)
);
