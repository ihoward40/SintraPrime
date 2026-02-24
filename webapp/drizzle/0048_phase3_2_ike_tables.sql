CREATE TABLE `ike_agent_logs` (
	`id` varchar(36) NOT NULL,
	`trace_id` varchar(36) NOT NULL,
	`correlation_id` varchar(36),
	`level` enum('debug','info','warn','error','fatal') NOT NULL,
	`message` text NOT NULL,
	`action` varchar(100),
	`user_id` varchar(36),
	`beneficiary_id` varchar(36),
	`request_method` varchar(10),
	`request_path` text,
	`response_status` int,
	`duration_ms` int,
	`metadata` json,
	`error_stack` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ike_agent_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ike_beneficiaries` (
	`id` varchar(36) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`ssn_last_four` varchar(4),
	`date_of_birth` date,
	`relationship` varchar(100),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ike_beneficiaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ike_billing_events` (
	`id` varchar(36) NOT NULL,
	`beneficiary_id` varchar(36),
	`event_type` varchar(100) NOT NULL,
	`event_source` varchar(100) NOT NULL,
	`amount` decimal(10,2),
	`currency` varchar(3) DEFAULT 'USD',
	`status` varchar(50) NOT NULL,
	`stripe_event_id` varchar(255),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ike_billing_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ike_credit_disputes` (
	`id` varchar(36) NOT NULL,
	`beneficiary_id` varchar(36) NOT NULL,
	`creditor_name` varchar(200) NOT NULL,
	`account_number` varchar(100),
	`dispute_reason` text NOT NULL,
	`dispute_type` enum('identity_theft','not_mine','inaccurate','duplicate','paid','other') NOT NULL,
	`status` enum('pending','submitted','investigating','resolved','rejected') NOT NULL DEFAULT 'pending',
	`amount_disputed` decimal(10,2),
	`date_submitted` date,
	`date_resolved` date,
	`resolution_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ike_credit_disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ike_enforcement_packets` (
	`id` varchar(36) NOT NULL,
	`beneficiary_id` varchar(36) NOT NULL,
	`packet_type` varchar(100) NOT NULL,
	`status` enum('draft','pending','sent','completed','failed') NOT NULL DEFAULT 'draft',
	`target_agency` varchar(200),
	`documents` json,
	`tracking_number` varchar(100),
	`date_sent` date,
	`date_completed` date,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ike_enforcement_packets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ike_agent_logs` ADD CONSTRAINT `ike_agent_logs_beneficiary_id_ike_beneficiaries_id_fk` FOREIGN KEY (`beneficiary_id`) REFERENCES `ike_beneficiaries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ike_billing_events` ADD CONSTRAINT `ike_billing_events_beneficiary_id_ike_beneficiaries_id_fk` FOREIGN KEY (`beneficiary_id`) REFERENCES `ike_beneficiaries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ike_credit_disputes` ADD CONSTRAINT `ike_credit_disputes_beneficiary_id_ike_beneficiaries_id_fk` FOREIGN KEY (`beneficiary_id`) REFERENCES `ike_beneficiaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ike_enforcement_packets` ADD CONSTRAINT `ike_enforcement_packets_beneficiary_id_ike_beneficiaries_id_fk` FOREIGN KEY (`beneficiary_id`) REFERENCES `ike_beneficiaries`(`id`) ON DELETE cascade ON UPDATE no action;