CREATE TABLE `audio_recordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`case_id` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`audio_url` text NOT NULL,
	`audio_key` varchar(500) NOT NULL,
	`file_name` varchar(300),
	`mime_type` varchar(100),
	`file_size` int,
	`duration` int,
	`transcription_status` varchar(50) NOT NULL DEFAULT 'pending',
	`transcription_text` text,
	`transcription_language` varchar(10),
	`segments` json,
	`speakers` json,
	`metadata` json,
	`recorded_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audio_recordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audio_transcript_segments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`audio_recording_id` int NOT NULL,
	`segment_index` int NOT NULL,
	`start_time` int NOT NULL,
	`end_time` int NOT NULL,
	`text` text NOT NULL,
	`speaker_id` varchar(100),
	`confidence` int,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audio_transcript_segments_id` PRIMARY KEY(`id`)
);
