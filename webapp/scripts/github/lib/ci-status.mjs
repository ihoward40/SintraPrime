/**
 * CI Status Verification
 * 
 * Implements badge honesty by verifying CI workflow status before displaying badges
 * Follows AGENTS.md Prime Directive: Never invent CI states
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getLatestWorkflowRun } from './gh.mjs';

/**
 * Check if a workflow file exists in the repository
 * @param {string} repoPath - Path to repository root
 * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
 * @returns {Promise<boolean>} True if workflow file exists
 */
export async function workflowFileExists(repoPath, workflowFile) {
  try {
    const workflowPath = path.join(repoPath, '.github', 'workflows', workflowFile);
    await fs.access(workflowPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get CI status for a workflow
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
 * @param {string} defaultBranch - Default branch name (e.g., 'main')
 * @returns {Promise<Object>} CI status object
 */
export async function getCIStatus(client, owner, repo, workflowFile, defaultBranch) {
  try {
    // Get latest workflow run on default branch
    const latestRun = await getLatestWorkflowRun(client, owner, repo, workflowFile, defaultBranch);
    
    if (!latestRun) {
      return {
        exists: false,
        status: 'no_runs',
        conclusion: null,
        badge: 'no status',
        color: 'lightgrey',
        canDisplay: false,
      };
    }
    
    const conclusion = latestRun.conclusion;
    const status = latestRun.status;
    
    // Determine badge status based on conclusion
    let badge, color, canDisplay;
    
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          badge = 'passing';
          color = 'brightgreen';
          canDisplay = true;
          break;
        case 'failure':
          badge = 'failing';
          color = 'red';
          canDisplay = true;
          break;
        case 'cancelled':
          badge = 'cancelled';
          color = 'yellow';
          canDisplay = true;
          break;
        case 'skipped':
          badge = 'skipped';
          color = 'lightgrey';
          canDisplay = false;
          break;
        default:
          badge = 'unknown';
          color = 'lightgrey';
          canDisplay = false;
      }
    } else {
      badge = 'in progress';
      color = 'yellow';
      canDisplay = false;
    }
    
    return {
      exists: true,
      status,
      conclusion,
      badge,
      color,
      canDisplay,
      runUrl: latestRun.html_url,
      runId: latestRun.id,
      createdAt: latestRun.created_at,
      updatedAt: latestRun.updated_at,
    };
  } catch (error) {
    console.error(`Error getting CI status for ${owner}/${repo}:`, error.message);
    return {
      exists: false,
      status: 'error',
      conclusion: null,
      badge: 'error',
      color: 'red',
      canDisplay: false,
      error: error.message,
    };
  }
}

/**
 * Verify if a CI badge should be displayed (badge honesty enforcement)
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
 * @param {string} defaultBranch - Default branch name (e.g., 'main')
 * @param {string} repoPath - Path to repository root (optional, for local verification)
 * @returns {Promise<Object>} Verification result
 */
export async function verifyCIBadge(client, owner, repo, workflowFile, defaultBranch, repoPath = null) {
  const result = {
    shouldDisplay: false,
    reason: '',
    status: null,
  };
  
  // Step 1: Check if workflow file exists locally (if repo path provided)
  if (repoPath) {
    const fileExists = await workflowFileExists(repoPath, workflowFile);
    if (!fileExists) {
      result.reason = `Workflow file ${workflowFile} does not exist`;
      return result;
    }
  }
  
  // Step 2: Get CI status from GitHub API
  const ciStatus = await getCIStatus(client, owner, repo, workflowFile, defaultBranch);
  result.status = ciStatus;
  
  if (!ciStatus.exists) {
    result.reason = 'No workflow runs found';
    return result;
  }
  
  // Step 3: Apply badge honesty rules
  if (ciStatus.conclusion === 'success') {
    result.shouldDisplay = true;
    result.reason = 'CI is passing on default branch';
  } else if (ciStatus.conclusion === 'failure') {
    result.shouldDisplay = false;
    result.reason = 'CI is failing - cannot display passing badge';
  } else if (ciStatus.status === 'in_progress') {
    result.shouldDisplay = false;
    result.reason = 'CI is in progress - wait for completion';
  } else {
    result.shouldDisplay = false;
    result.reason = `CI conclusion: ${ciStatus.conclusion || 'unknown'}`;
  }
  
  return result;
}

/**
 * Verify multiple CI workflows
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string[]} workflowFiles - Array of workflow file names
 * @param {string} defaultBranch - Default branch name (e.g., 'main')
 * @param {string} repoPath - Path to repository root (optional)
 * @returns {Promise<Object>} Verification results for all workflows
 */
export async function verifyAllCIBadges(client, owner, repo, workflowFiles, defaultBranch, repoPath = null) {
  const results = {};
  
  for (const workflowFile of workflowFiles) {
    results[workflowFile] = await verifyCIBadge(client, owner, repo, workflowFile, defaultBranch, repoPath);
  }
  
  return results;
}

/**
 * Generate badge markdown with CI verification
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
 * @param {Object} ciStatus - CI status from getCIStatus()
 * @param {string} style - Badge style (flat, flat-square, plastic, etc.)
 * @returns {string} Badge markdown
 */
export function generateCIBadgeMarkdown(owner, repo, workflowFile, ciStatus, style = 'flat-square') {
  if (!ciStatus.canDisplay) {
    // Don't display badge if CI is not passing
    return `<!-- CI badge hidden: ${ciStatus.badge} -->`;
  }
  
  const workflowName = workflowFile.replace('.yml', '').replace('.yaml', '');
  const badgeUrl = `https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/${workflowFile}?style=${style}&label=${workflowName}`;
  const runUrl = ciStatus.runUrl || `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`;
  
  return `[![${workflowName}](${badgeUrl})](${runUrl})`;
}

/**
 * Generate "no status" badge when CI cannot be verified
 * @param {string} label - Badge label
 * @param {string} style - Badge style
 * @returns {string} Badge markdown
 */
export function generateNoStatusBadge(label, style = 'flat-square') {
  const badgeUrl = `https://img.shields.io/badge/${label}-no%20status-lightgrey?style=${style}`;
  return `![${label}](${badgeUrl})`;
}

/**
 * Get summary of all CI workflows
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} defaultBranch - Default branch name
 * @returns {Promise<Object>} Summary of all workflows
 */
export async function getCISummary(client, owner, repo, defaultBranch) {
  try {
    const { data: workflows } = await client.actions.listRepoWorkflows({
      owner,
      repo,
    });
    
    const summary = {
      total: workflows.total_count,
      workflows: [],
      passing: 0,
      failing: 0,
      unknown: 0,
    };
    
    for (const workflow of workflows.workflows) {
      const workflowFile = path.basename(workflow.path);
      const status = await getCIStatus(client, owner, repo, workflowFile, defaultBranch);
      
      summary.workflows.push({
        name: workflow.name,
        file: workflowFile,
        status: status.badge,
        conclusion: status.conclusion,
        canDisplay: status.canDisplay,
      });
      
      if (status.conclusion === 'success') {
        summary.passing++;
      } else if (status.conclusion === 'failure') {
        summary.failing++;
      } else {
        summary.unknown++;
      }
    }
    
    return summary;
  } catch (error) {
    console.error(`Error getting CI summary for ${owner}/${repo}:`, error.message);
    return {
      total: 0,
      workflows: [],
      passing: 0,
      failing: 0,
      unknown: 0,
      error: error.message,
    };
  }
}
