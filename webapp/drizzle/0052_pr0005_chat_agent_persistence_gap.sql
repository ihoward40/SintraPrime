-- ============================================================================
-- Migration 0052: PR-0005 Chat Agent Persistence Gap
-- Adds chat conversation/message features on top of existing tables created
-- in migration 0016.
-- All changes are additive. No existing data is dropped.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- chat_conversations: add columns absent from 0016
-- ----------------------------------------------------------------------------
ALTER TABLE `chat_conversations`
  ADD COLUMN `model` VARCHAR(64) DEFAULT 'gemini-2.5-flash' AFTER `title`,
  ADD COLUMN `status` ENUM('active','archived','deleted') NOT NULL DEFAULT 'active' AFTER `model`;

-- ----------------------------------------------------------------------------
-- chat_messages: add columns absent from 0016
-- ----------------------------------------------------------------------------
ALTER TABLE `chat_messages`
  ADD COLUMN `user_id` INT AFTER `conversation_id`,
  ADD COLUMN `model` VARCHAR(64) AFTER `role`,
  ADD COLUMN `tokens_used` INT AFTER `model`,
  ADD COLUMN `latency_ms` INT AFTER `tokens_used`,
  ADD COLUMN `receipt_id` VARCHAR(64) AFTER `latency_ms`,
  ADD COLUMN `idempotency_key` VARCHAR(128) UNIQUE AFTER `receipt_id`,
  ADD COLUMN `status` ENUM('visible','edited','deleted') NOT NULL DEFAULT 'visible' AFTER `idempotency_key`,
  ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `status`;

-- Expand role enum to include system/tool roles.
-- MySQL allows enum expansion without table rebuild.
ALTER TABLE `chat_messages`
  MODIFY COLUMN `role` ENUM('system','user','assistant','tool') NOT NULL;
