CREATE TABLE `research_audio_overviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`audio_url` text NOT NULL,
	`duration` int,
	`transcript` text,
	`focus_areas` json,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_audio_overviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_citations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`document_id` int NOT NULL,
	`citation_text` text NOT NULL,
	`page_number` int,
	`context` text,
	`used_in_insight_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_citations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`case_id` int,
	`is_shared` boolean NOT NULL DEFAULT false,
	`shared_with` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` text NOT NULL,
	`file_type` varchar(50) NOT NULL,
	`file_size` int,
	`mime_type` varchar(100),
	`extracted_text` text,
	`summary` text,
	`key_topics` json,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collection_id` int NOT NULL,
	`insight_type` enum('qa','summary','study_guide','briefing','faq','timeline','flashcard','quiz') NOT NULL,
	`question` text,
	`answer` text NOT NULL,
	`citations` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_insights_id` PRIMARY KEY(`id`)
);
