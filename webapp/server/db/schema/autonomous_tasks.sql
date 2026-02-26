-- Autonomous Tasks Table Schema
-- Purpose: Store autonomous task definitions for the system
-- Database: TiDB / MySQL Compatible

CREATE TABLE IF NOT EXISTS autonomous_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  objective TEXT,
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  tags JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId_createdAt (userId, createdAt DESC),
  INDEX idx_status (status),
  INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores autonomous task creation data for async execution';

-- Indexes for common query patterns
ALTER TABLE autonomous_tasks ADD INDEX idx_userId_status (userId, status);
ALTER TABLE autonomous_tasks ADD INDEX idx_userId_priority (userId, priority);
