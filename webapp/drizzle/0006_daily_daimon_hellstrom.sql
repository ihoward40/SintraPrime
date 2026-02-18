CREATE TABLE `legal_research` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` enum('federal_statute','state_statute','case_law','regulation','procedural_rule','legal_guide','form_template') NOT NULL,
	`subcategory` varchar(255),
	`citation` varchar(500),
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`jurisdiction` varchar(100),
	`tags` json,
	`sourceUrl` text,
	`effectiveDate` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legal_research_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`researchId` int NOT NULL,
	`caseId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_bookmarks_id` PRIMARY KEY(`id`)
);
