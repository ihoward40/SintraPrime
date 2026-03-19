CREATE TABLE `ai_memory` (
`id` int AUTO_INCREMENT NOT NULL,
`user_id` int NOT NULL,
`case_id` int,
`category` enum('user_preference','case_fact','legal_strategy','general_context') NOT NULL DEFAULT 'general_context',
`key` varchar(255) NOT NULL,
`value` text NOT NULL,
`importance` int NOT NULL DEFAULT 1,
`source` varchar(100) NOT NULL DEFAULT 'chat',
`created_at` timestamp NOT NULL DEFAULT (now()),
`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `ai_memory_id` PRIMARY KEY(`id`)
);
