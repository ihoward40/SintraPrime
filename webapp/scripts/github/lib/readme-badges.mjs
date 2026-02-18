/**
 * README Badge Generation Utilities
 * 
 * Generates honest badges for README.md with CI verification
 * Follows AGENTS.md badge honesty rules
 */

import { verifyCIBadge, generateCIBadgeMarkdown, generateNoStatusBadge } from './ci-status.mjs';

/**
 * Generate CI workflow badge
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
 * @param {string} defaultBranch - Default branch name
 * @param {Object} options - Badge options
 * @param {string} options.style - Badge style (default: 'flat-square')
 * @param {boolean} options.verifyBeforeDisplay - Verify CI status (default: true)
 * @param {string} options.repoPath - Path to repository root (optional)
 * @returns {Promise<string>} Badge markdown
 */
export async function generateCIBadge(client, owner, repo, workflowFile, defaultBranch, options = {}) {
  const { style = 'flat-square', verifyBeforeDisplay = true, repoPath = null } = options;
  
  if (!verifyBeforeDisplay) {
    // Generate badge without verification (not recommended)
    const workflowName = workflowFile.replace('.yml', '').replace('.yaml', '');
    const badgeUrl = `https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/${workflowFile}?style=${style}&label=${workflowName}`;
    const runUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`;
    return `[![${workflowName}](${badgeUrl})](${runUrl})`;
  }
  
  // Verify CI status before displaying badge
  const verification = await verifyCIBadge(client, owner, repo, workflowFile, defaultBranch, repoPath);
  
  if (verification.shouldDisplay && verification.status) {
    return generateCIBadgeMarkdown(owner, repo, workflowFile, verification.status, style);
  } else {
    const workflowName = workflowFile.replace('.yml', '').replace('.yaml', '');
    return generateNoStatusBadge(workflowName, style);
  }
}

/**
 * Generate license badge
 * @param {string} license - License type (e.g., 'Apache-2.0', 'MIT')
 * @param {string} style - Badge style
 * @returns {string} Badge markdown
 */
export function generateLicenseBadge(license, style = 'flat-square') {
  const badgeUrl = `https://img.shields.io/badge/license-${encodeURIComponent(license)}-blue?style=${style}`;
  return `![License](${badgeUrl})`;
}

/**
 * Generate version badge from package.json
 * @param {string} version - Version string (e.g., '1.0.0')
 * @param {string} style - Badge style
 * @returns {string} Badge markdown
 */
export function generateVersionBadge(version, style = 'flat-square') {
  const badgeUrl = `https://img.shields.io/badge/version-${encodeURIComponent(version)}-blue?style=${style}`;
  return `![Version](${badgeUrl})`;
}

/**
 * Generate custom badge
 * @param {Object} badgeConfig - Badge configuration
 * @param {string} badgeConfig.label - Badge label
 * @param {string} badgeConfig.message - Badge message
 * @param {string} badgeConfig.color - Badge color
 * @param {string} badgeConfig.logo - Badge logo (optional)
 * @param {string} badgeConfig.url - Badge link URL (optional)
 * @param {string} style - Badge style
 * @returns {string} Badge markdown
 */
export function generateCustomBadge(badgeConfig, style = 'flat-square') {
  const { label, message, color, logo, url } = badgeConfig;
  
  let badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${color}?style=${style}`;
  
  if (logo) {
    badgeUrl += `&logo=${encodeURIComponent(logo)}`;
  }
  
  const badgeMarkdown = `![${label}](${badgeUrl})`;
  
  if (url) {
    return `[${badgeMarkdown}](${url})`;
  }
  
  return badgeMarkdown;
}

/**
 * Generate all badges for a repository based on productize.config.json
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {Object} repoConfig - Repository configuration from productize.config.json
 * @param {string} defaultBranch - Default branch name
 * @param {string} repoPath - Path to repository root (optional)
 * @returns {Promise<string>} All badges as markdown
 */
export async function generateAllBadges(client, repoConfig, defaultBranch, repoPath = null) {
  const { owner, repo, badges } = repoConfig;
  const { style = 'flat-square', ci, codeql, license, version, custom = [] } = badges;
  
  const badgeLines = [];
  
  // CI badge
  if (ci && ci.enabled) {
    const ciBadge = await generateCIBadge(
      client,
      owner,
      repo,
      ci.workflow,
      defaultBranch,
      { style, verifyBeforeDisplay: ci.verifyBeforeDisplay !== false, repoPath }
    );
    badgeLines.push(ciBadge);
  }
  
  // CodeQL badge
  if (codeql && codeql.enabled) {
    const codeqlBadge = await generateCIBadge(
      client,
      owner,
      repo,
      codeql.workflow,
      defaultBranch,
      { style, verifyBeforeDisplay: codeql.verifyBeforeDisplay !== false, repoPath }
    );
    badgeLines.push(codeqlBadge);
  }
  
  // License badge
  if (license && license.enabled) {
    badgeLines.push(generateLicenseBadge(license.type, style));
  }
  
  // Version badge
  if (version && version.enabled) {
    // Read version from package.json
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const packageJsonPath = path.join(repoPath || process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      badgeLines.push(generateVersionBadge(packageJson.version, style));
    } catch (error) {
      console.warn('Could not read version from package.json:', error.message);
    }
  }
  
  // Custom badges
  for (const customBadge of custom) {
    badgeLines.push(generateCustomBadge(customBadge, style));
  }
  
  return badgeLines.join(' ');
}

/**
 * Update README.md with new badges
 * @param {string} readmeContent - Current README.md content
 * @param {string} newBadges - New badges markdown
 * @returns {string} Updated README.md content
 */
export function updateReadmeBadges(readmeContent, newBadges) {
  // Look for existing badges section
  const badgesSectionRegex = /<!-- BADGES:START -->[\s\S]*?<!-- BADGES:END -->/;
  
  if (badgesSectionRegex.test(readmeContent)) {
    // Replace existing badges section
    return readmeContent.replace(
      badgesSectionRegex,
      `<!-- BADGES:START -->\n${newBadges}\n<!-- BADGES:END -->`
    );
  } else {
    // Add badges section after title
    const titleRegex = /^#\s+.+$/m;
    const match = readmeContent.match(titleRegex);
    
    if (match) {
      const insertIndex = match.index + match[0].length;
      return (
        readmeContent.slice(0, insertIndex) +
        '\n\n<!-- BADGES:START -->\n' +
        newBadges +
        '\n<!-- BADGES:END -->\n' +
        readmeContent.slice(insertIndex)
      );
    } else {
      // No title found, prepend badges
      return `<!-- BADGES:START -->\n${newBadges}\n<!-- BADGES:END -->\n\n${readmeContent}`;
    }
  }
}

/**
 * Generate badges summary report
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {Object} repoConfig - Repository configuration
 * @param {string} defaultBranch - Default branch name
 * @returns {Promise<Object>} Badges summary
 */
export async function generateBadgesSummary(client, repoConfig, defaultBranch) {
  const { owner, repo, badges } = repoConfig;
  const summary = {
    total: 0,
    passing: 0,
    failing: 0,
    noStatus: 0,
    badges: [],
  };
  
  // Check CI badge
  if (badges.ci && badges.ci.enabled) {
    const verification = await verifyCIBadge(client, owner, repo, badges.ci.workflow, defaultBranch);
    summary.total++;
    summary.badges.push({
      type: 'ci',
      workflow: badges.ci.workflow,
      shouldDisplay: verification.shouldDisplay,
      reason: verification.reason,
    });
    
    if (verification.shouldDisplay) {
      summary.passing++;
    } else if (verification.status && verification.status.conclusion === 'failure') {
      summary.failing++;
    } else {
      summary.noStatus++;
    }
  }
  
  // Check CodeQL badge
  if (badges.codeql && badges.codeql.enabled) {
    const verification = await verifyCIBadge(client, owner, repo, badges.codeql.workflow, defaultBranch);
    summary.total++;
    summary.badges.push({
      type: 'codeql',
      workflow: badges.codeql.workflow,
      shouldDisplay: verification.shouldDisplay,
      reason: verification.reason,
    });
    
    if (verification.shouldDisplay) {
      summary.passing++;
    } else if (verification.status && verification.status.conclusion === 'failure') {
      summary.failing++;
    } else {
      summary.noStatus++;
    }
  }
  
  // Count other badges
  if (badges.license && badges.license.enabled) {
    summary.total++;
    summary.badges.push({ type: 'license', shouldDisplay: true });
  }
  
  if (badges.version && badges.version.enabled) {
    summary.total++;
    summary.badges.push({ type: 'version', shouldDisplay: true });
  }
  
  if (badges.custom) {
    summary.total += badges.custom.length;
    badges.custom.forEach(badge => {
      summary.badges.push({ type: 'custom', label: badge.label, shouldDisplay: true });
    });
  }
  
  return summary;
}
