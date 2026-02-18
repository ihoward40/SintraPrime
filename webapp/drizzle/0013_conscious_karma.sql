CREATE TABLE `bookmark_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`color` varchar(20),
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookmark_collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`bookmarkId` int NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_bookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`sharedWithUserId` int NOT NULL,
	`permission` enum('view','edit') NOT NULL DEFAULT 'view',
	`sharedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_shares_id` PRIMARY KEY(`id`)
);
