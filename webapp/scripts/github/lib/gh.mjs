/**
 * GitHub API Wrapper
 * 
 * Provides authenticated access to GitHub REST API v3
 * Supports both Personal Access Tokens and OAuth Apps
 */

import { Octokit } from '@octokit/rest';

/**
 * Create authenticated Octokit instance
 * @param {string} token - GitHub Personal Access Token or OAuth token
 * @returns {Octokit} Authenticated Octokit instance
 */
export function createGitHubClient(token) {
  if (!token) {
    throw new Error('GitHub token is required. Set GITHUB_TOKEN environment variable.');
  }

  return new Octokit({
    auth: token,
    userAgent: 'sintraprime-productize/1.0.0',
    timeZone: 'America/New_York',
    baseUrl: 'https://api.github.com',
  });
}

/**
 * Get repository information
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository data
 */
export async function getRepository(client, owner, repo) {
  try {
    const { data } = await client.repos.get({ owner, repo });
    return data;
  } catch (error) {
    console.error(`Error fetching repository ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Update repository metadata (description, homepage, topics)
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} updates - Updates to apply
 * @param {string} [updates.description] - Repository description
 * @param {string} [updates.homepage] - Repository homepage URL
 * @param {string[]} [updates.topics] - Repository topics
 * @returns {Promise<Object>} Updated repository data
 */
export async function updateRepository(client, owner, repo, updates) {
  try {
    const { description, homepage, topics } = updates;
    
    // Update basic metadata
    if (description || homepage) {
      await client.repos.update({
        owner,
        repo,
        description,
        homepage,
      });
    }
    
    // Update topics separately (different API endpoint)
    if (topics && topics.length > 0) {
      await client.repos.replaceAllTopics({
        owner,
        repo,
        names: topics,
      });
    }
    
    console.log(`✅ Updated repository metadata for ${owner}/${repo}`);
    return await getRepository(client, owner, repo);
  } catch (error) {
    console.error(`Error updating repository ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Get workflow runs for a repository
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
 * @returns {Promise<Array>} Workflow runs
 */
export async function getWorkflowRuns(client, owner, repo, workflowFile) {
  try {
    const { data } = await client.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowFile,
      per_page: 10,
    });
    return data.workflow_runs;
  } catch (error) {
    if (error.status === 404) {
      console.warn(`Workflow ${workflowFile} not found in ${owner}/${repo}`);
      return [];
    }
    console.error(`Error fetching workflow runs for ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Get the latest workflow run on the default branch
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
 * @param {string} defaultBranch - Default branch name (e.g., 'main')
 * @returns {Promise<Object|null>} Latest workflow run or null
 */
export async function getLatestWorkflowRun(client, owner, repo, workflowFile, defaultBranch) {
  try {
    const runs = await getWorkflowRuns(client, owner, repo, workflowFile);
    const defaultBranchRuns = runs.filter(run => run.head_branch === defaultBranch);
    return defaultBranchRuns.length > 0 ? defaultBranchRuns[0] : null;
  } catch (error) {
    console.error(`Error fetching latest workflow run for ${owner}/${repo}:`, error.message);
    return null;
  }
}

/**
 * Create a pull request
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} prData - Pull request data
 * @param {string} prData.title - PR title
 * @param {string} prData.body - PR body
 * @param {string} prData.head - Head branch
 * @param {string} prData.base - Base branch
 * @returns {Promise<Object>} Created pull request
 */
export async function createPullRequest(client, owner, repo, prData) {
  try {
    const { data } = await client.pulls.create({
      owner,
      repo,
      title: prData.title,
      body: prData.body,
      head: prData.head,
      base: prData.base,
    });
    console.log(`✅ Created pull request #${data.number} in ${owner}/${repo}`);
    return data;
  } catch (error) {
    if (error.status === 422) {
      console.warn(`Pull request already exists or no changes to commit in ${owner}/${repo}`);
      return null;
    }
    console.error(`Error creating pull request in ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Get file contents from repository
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} [ref] - Git ref (branch, tag, or commit SHA)
 * @returns {Promise<string>} File contents
 */
export async function getFileContents(client, owner, repo, path, ref = 'HEAD') {
  try {
    const { data } = await client.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    
    if (data.type !== 'file') {
      throw new Error(`Path ${path} is not a file`);
    }
    
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (error) {
    if (error.status === 404) {
      console.warn(`File ${path} not found in ${owner}/${repo}`);
      return null;
    }
    console.error(`Error fetching file ${path} from ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Update file contents in repository
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} content - New file content
 * @param {string} message - Commit message
 * @param {string} branch - Branch to commit to
 * @returns {Promise<Object>} Commit data
 */
export async function updateFileContents(client, owner, repo, path, content, message, branch) {
  try {
    // Get current file SHA
    const { data: currentFile } = await client.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    
    const { data } = await client.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha,
      branch,
    });
    
    console.log(`✅ Updated file ${path} in ${owner}/${repo}`);
    return data;
  } catch (error) {
    console.error(`Error updating file ${path} in ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Check if a branch exists
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @returns {Promise<boolean>} True if branch exists
 */
export async function branchExists(client, owner, repo, branch) {
  try {
    await client.repos.getBranch({ owner, repo, branch });
    return true;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Create a new branch
 * @param {Octokit} client - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - New branch name
 * @param {string} fromBranch - Source branch to branch from
 * @returns {Promise<Object>} Created branch reference
 */
export async function createBranch(client, owner, repo, branch, fromBranch) {
  try {
    // Get SHA of source branch
    const { data: refData } = await client.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });
    
    const sha = refData.object.sha;
    
    // Create new branch
    const { data } = await client.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha,
    });
    
    console.log(`✅ Created branch ${branch} in ${owner}/${repo}`);
    return data;
  } catch (error) {
    if (error.status === 422) {
      console.warn(`Branch ${branch} already exists in ${owner}/${repo}`);
      return null;
    }
    console.error(`Error creating branch ${branch} in ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Verify GitHub token has required permissions
 * @param {Octokit} client - Authenticated Octokit instance
 * @returns {Promise<Object>} User and permissions data
 */
export async function verifyToken(client) {
  try {
    const { data: user } = await client.users.getAuthenticated();
    console.log(`✅ Authenticated as ${user.login}`);
    return user;
  } catch (error) {
    console.error('Error verifying GitHub token:', error.message);
    throw new Error('Invalid GitHub token or insufficient permissions');
  }
}
