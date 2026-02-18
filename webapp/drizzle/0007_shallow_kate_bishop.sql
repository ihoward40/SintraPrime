CREATE TABLE `case_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('case_created','case_updated','status_changed','document_added','document_updated','evidence_added','note_added','party_added','strategy_added','member_joined','deadline_added') NOT NULL,
	`description` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`userId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`content` text NOT NULL,
	`changeSummary` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_versions_id` PRIMARY KEY(`id`)
);
