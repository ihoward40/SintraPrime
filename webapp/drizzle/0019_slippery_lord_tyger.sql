CREATE TABLE `court_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`court_identifier_id` int NOT NULL,
	`monitoring_rule_id` int,
	`alert_type` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`docket_entry_number` int,
	`document_number` varchar(50),
	`severity` enum('info','warning','urgent','critical') NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `court_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `court_identifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sintra_prime_id` varchar(100) NOT NULL,
	`external_case_number` varchar(100) NOT NULL,
	`court_system` enum('federal_district','federal_circuit','federal_supreme','state_supreme','state_appellate','state_trial','local_municipal','international') NOT NULL,
	`court_id` varchar(50) NOT NULL,
	`court_name` varchar(255) NOT NULL,
	`jurisdiction` enum('federal','state','local','international') NOT NULL,
	`case_title` varchar(500) NOT NULL,
	`filed_date` timestamp NOT NULL,
	`status` enum('active','pending','closed','appealed','settled','dismissed') NOT NULL,
	`last_checked` timestamp,
	`last_docket_entry` int,
	`monitoring_enabled` boolean NOT NULL DEFAULT true,
	`user_id` int NOT NULL,
	`internal_case_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `court_identifiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `court_identifiers_sintra_prime_id_unique` UNIQUE(`sintra_prime_id`)
);
--> statement-breakpoint
CREATE TABLE `court_monitoring_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`court_identifier_id` int NOT NULL,
	`rule_type` enum('new_docket_entry','specific_document','party_filing','judge_order','hearing_scheduled','status_change','deadline_approaching') NOT NULL,
	`keywords` json,
	`document_types` json,
	`party_names` json,
	`alert_on_any_change` boolean NOT NULL DEFAULT false,
	`notification_method` json NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `court_monitoring_rules_id` PRIMARY KEY(`id`)
);
