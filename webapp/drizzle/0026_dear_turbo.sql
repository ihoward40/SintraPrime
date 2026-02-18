CREATE TABLE `dni_calculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustAccountId` int NOT NULL,
	`taxYear` int NOT NULL,
	`interestIncome` int NOT NULL DEFAULT 0,
	`dividendIncome` int NOT NULL DEFAULT 0,
	`capitalGains` int NOT NULL DEFAULT 0,
	`ordinaryIncome` int NOT NULL DEFAULT 0,
	`otherIncome` int NOT NULL DEFAULT 0,
	`fiduciaryFees` int NOT NULL DEFAULT 0,
	`accountingFees` int NOT NULL DEFAULT 0,
	`legalFees` int NOT NULL DEFAULT 0,
	`otherDeductions` int NOT NULL DEFAULT 0,
	`totalIncome` int NOT NULL,
	`totalDeductions` int NOT NULL,
	`distributableNetIncome` int NOT NULL,
	`actualDistributions` int NOT NULL DEFAULT 0,
	`distributionDeduction` int NOT NULL,
	`has65DayElection` boolean NOT NULL DEFAULT false,
	`electionAmount` int NOT NULL DEFAULT 0,
	`calculationNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dni_calculations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustAccountId` int NOT NULL,
	`entryNumber` varchar(50) NOT NULL,
	`entryDate` timestamp NOT NULL,
	`entryType` enum('standard','adjusting','closing','reversing') NOT NULL DEFAULT 'standard',
	`basis` enum('book','tax','both') NOT NULL DEFAULT 'both',
	`description` text NOT NULL,
	`reference` varchar(200),
	`isPosted` boolean NOT NULL DEFAULT false,
	`postedBy` int,
	`postedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entry_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journalEntryId` int NOT NULL,
	`ledgerAccountId` int NOT NULL,
	`lineType` enum('debit','credit') NOT NULL,
	`amountInCents` int NOT NULL,
	`memo` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `journal_entry_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledger_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trustAccountId` int NOT NULL,
	`accountNumber` varchar(20) NOT NULL,
	`accountName` varchar(200) NOT NULL,
	`accountType` enum('asset','liability','equity','income','expense') NOT NULL,
	`accountCategory` varchar(100),
	`normalBalance` enum('debit','credit') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`parentAccountId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledger_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trustName` varchar(500) NOT NULL,
	`ein` varchar(20) NOT NULL,
	`taxYear` int NOT NULL,
	`trustType` enum('simple','complex','grantor','estate') NOT NULL,
	`fiscalYearEnd` varchar(10),
	`status` enum('active','terminated','archived') NOT NULL DEFAULT 'active',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trust_accounts_id` PRIMARY KEY(`id`)
);
