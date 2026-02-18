/**
 * Agent Skills Registry
 * 
 * Implements progressive disclosure model for loading agent skills
 * Prevents system prompt bloat while maintaining full capability
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface SkillMetadata {
  name: string;
  version: string;
  category: string;
  complexity: string;
  prerequisites: string;
  description: string;
  path: string;
}

export interface Skill extends SkillMetadata {
  instructions: string;
  loadedAt: Date;
}

const SKILLS_DIR = path.join(process.cwd(), '.kilocode', 'skills');

/**
 * Scan project for available skills (cheap operation)
 * Only loads metadata, not full instructions
 * @returns {Promise<SkillMetadata[]>} Array of skill metadata
 */
export async function scanProjectSkills(): Promise<SkillMetadata[]> {
  try {
    const skillDirs = await fs.readdir(SKILLS_DIR);
    const skills: SkillMetadata[] = [];

    for (const skillDir of skillDirs) {
      const skillPath = path.join(SKILLS_DIR, skillDir);
      const skillFilePath = path.join(skillPath, 'SKILL.md');

      try {
        // Check if SKILL.md exists
        await fs.access(skillFilePath);

        // Read only the metadata section (first 20 lines)
        const content = await fs.readFile(skillFilePath, 'utf-8');
        const lines = content.split('\n').slice(0, 20);
        const metadata = parseSkillMetadata(lines.join('\n'), skillDir, skillPath);

        skills.push(metadata);
      } catch (error) {
        console.warn(`Skipping ${skillDir}: SKILL.md not found or unreadable`);
      }
    }

    return skills;
  } catch (error) {
    console.error('Error scanning skills directory:', error);
    return [];
  }
}

/**
 * Parse skill metadata from SKILL.md header
 * @param {string} content - First 20 lines of SKILL.md
 * @param {string} name - Skill directory name
 * @param {string} skillPath - Full path to skill directory
 * @returns {SkillMetadata} Parsed metadata
 */
function parseSkillMetadata(content: string, name: string, skillPath: string): SkillMetadata {
  const versionMatch = content.match(/\*\*Version\*\*:\s*(.+)/);
  const categoryMatch = content.match(/\*\*Category\*\*:\s*(.+)/);
  const complexityMatch = content.match(/\*\*Complexity\*\*:\s*(.+)/);
  const prerequisitesMatch = content.match(/\*\*Prerequisites\*\*:\s*(.+)/);

  // Extract description from Purpose section
  const purposeMatch = content.match(/## Purpose\n\n(.+)/);

  return {
    name,
    version: versionMatch ? versionMatch[1].trim() : '1.0.0',
    category: categoryMatch ? categoryMatch[1].trim() : 'General',
    complexity: complexityMatch ? complexityMatch[1].trim() : 'Intermediate',
    prerequisites: prerequisitesMatch ? prerequisitesMatch[1].trim() : 'None',
    description: purposeMatch ? purposeMatch[1].trim() : 'No description available',
    path: skillPath,
  };
}

/**
 * Load full skill instructions on-demand
 * @param {string} skillName - Name of the skill to load
 * @returns {Promise<Skill>} Full skill with instructions
 */
export async function loadSkillInstructions(skillName: string): Promise<Skill> {
  const skillPath = path.join(SKILLS_DIR, skillName);
  const skillFilePath = path.join(skillPath, 'SKILL.md');

  try {
    const content = await fs.readFile(skillFilePath, 'utf-8');
    const lines = content.split('\n').slice(0, 20);
    const metadata = parseSkillMetadata(lines.join('\n'), skillName, skillPath);

    return {
      ...metadata,
      instructions: content,
      loadedAt: new Date(),
    };
  } catch (error) {
    throw new Error(`Failed to load skill ${skillName}: ${error}`);
  }
}

/**
 * Get skill by name (loads full instructions)
 * @param {string} skillName - Name of the skill
 * @returns {Promise<Skill>} Full skill with instructions
 */
export async function getSkill(skillName: string): Promise<Skill> {
  return loadSkillInstructions(skillName);
}

/**
 * Search skills by category
 * @param {string} category - Category to search for
 * @returns {Promise<SkillMetadata[]>} Skills matching category
 */
export async function searchSkillsByCategory(category: string): Promise<SkillMetadata[]> {
  const skills = await scanProjectSkills();
  return skills.filter(skill => 
    skill.category.toLowerCase().includes(category.toLowerCase())
  );
}

/**
 * Search skills by complexity
 * @param {string} complexity - Complexity level (Beginner, Intermediate, Advanced)
 * @returns {Promise<SkillMetadata[]>} Skills matching complexity
 */
export async function searchSkillsByComplexity(complexity: string): Promise<SkillMetadata[]> {
  const skills = await scanProjectSkills();
  return skills.filter(skill => 
    skill.complexity.toLowerCase() === complexity.toLowerCase()
  );
}

/**
 * Get all available skills (metadata only)
 * @returns {Promise<SkillMetadata[]>} All available skills
 */
export async function getAllSkills(): Promise<SkillMetadata[]> {
  return scanProjectSkills();
}

/**
 * Check if a skill exists
 * @param {string} skillName - Name of the skill
 * @returns {Promise<boolean>} True if skill exists
 */
export async function skillExists(skillName: string): Promise<boolean> {
  const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  try {
    await fs.access(skillPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get skill summary (for display in UI)
 * @param {string} skillName - Name of the skill
 * @returns {Promise<SkillMetadata>} Skill metadata
 */
export async function getSkillSummary(skillName: string): Promise<SkillMetadata> {
  const skills = await scanProjectSkills();
  const skill = skills.find(s => s.name === skillName);
  
  if (!skill) {
    throw new Error(`Skill ${skillName} not found`);
  }
  
  return skill;
}

/**
 * Reload skills cache (useful after adding new skills)
 * @returns {Promise<SkillMetadata[]>} Refreshed skills list
 */
export async function reloadSkills(): Promise<SkillMetadata[]> {
  return scanProjectSkills();
}

/**
 * Get skills statistics
 * @returns {Promise<Object>} Statistics about available skills
 */
export async function getSkillsStatistics() {
  const skills = await scanProjectSkills();
  
  const byCategory = skills.reduce((acc, skill) => {
    const category = skill.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byComplexity = skills.reduce((acc, skill) => {
    const complexity = skill.complexity;
    acc[complexity] = (acc[complexity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: skills.length,
    byCategory,
    byComplexity,
    skills: skills.map(s => ({ name: s.name, category: s.category, complexity: s.complexity })),
  };
}
