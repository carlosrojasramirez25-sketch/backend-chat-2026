-- AlterTable
ALTER TABLE `messages` MODIFY `type` ENUM('text', 'image', 'file', 'system', 'audio') NOT NULL DEFAULT 'text';