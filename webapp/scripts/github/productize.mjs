#!/usr/bin/env node
/**
 * Repository Productization Script
 * 
 * Automates repository metadata updates and badge management
 * Follows Kilo Code badge honesty principles from AGENTS.md
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGitHubClient, updateRepository, verifyToken, getRepository, createBranch, branchExists, updateFileContents, createPullRequest } from './lib/gh.mjs';
import { verifyAllCIBadges, getCISummary } from './lib/ci-status.mjs';
import { generateAllBadges, updateReadmeBadges, generateBadgesSummary } from './lib/readme-badges.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load productize configuration
 * @param {string} configPath - Path to productize.config.json
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig(configPath) {
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error loading productize.config.json:', error.message);
    throw new Error('Failed to load configuration file');
  }
}

/**
 * Productize a single repository
 * @param {Octokit} client - Authenticated GitHub client
 * @param {Object} repoConfig - Repository configuration
 * @param {Object} settings - Global settings
 * @returns {Promise<Object>} Productization result
 */
async function productizeRepository(client, repoConfig, settings) {
  const { owner, repo, description, homepage, topics, badges, pullRequest } = repoConfig;
  const { verifyCI, dryRun, verbose } = settings;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Productizing ${owner}/${repo}`);
  console.log(`${'='.repeat(80)}\n`);
  
  const result = {
    owner,
    repo,
    success: false,
    steps: [],
    errors: [],
  };
  
  try {
    // Step 1: Get repository information
    if (verbose) console.log('📋 Fetching repository information...');
    const repoData = await getRepository(client, owner, repo);
    const defaultBranch = repoData.default_branch;
    result.steps.push({ step: 'fetch_repo', success: true });
    
    // Step 2: Update repository metadata
    if (description || homepage || topics) {
      if (verbose) console.log('📝 Updating repository metadata...');
      
      if (!dryRun) {
        await updateRepository(client, owner, repo, { description, homepage, topics });
        result.steps.push({ step: 'update_metadata', success: true });
      } else {
        console.log('   [DRY RUN] Would update:');
        if (description) console.log(`   - Description: ${description}`);
        if (homepage) console.log(`   - Homepage: ${homepage}`);
        if (topics) console.log(`   - Topics: ${topics.join(', ')}`);
        result.steps.push({ step: 'update_metadata', success: true, dryRun: true });
      }
    }
    
    // Step 3: Verify CI status (if enabled)
    let ciVerification = null;
    if (verifyCI && badges) {
      if (verbose) console.log('🔍 Verifying CI status...');
      
      const workflowFiles = [];
      if (badges.ci && badges.ci.enabled) workflowFiles.push(badges.ci.workflow);
      if (badges.codeql && badges.codeql.enabled) workflowFiles.push(badges.codeql.workflow);
      
      if (workflowFiles.length > 0) {
        ciVerification = await verifyAllCIBadges(client, owner, repo, workflowFiles, defaultBranch);
        
        if (verbose) {
          console.log('\n   CI Verification Results:');
          for (const [workflow, verification] of Object.entries(ciVerification)) {
            const status = verification.shouldDisplay ? '✅ PASS' : '❌ FAIL';
            console.log(`   - ${workflow}: ${status} (${verification.reason})`);
          }
        }
        
        result.ciVerification = ciVerification;
        result.steps.push({ step: 'verify_ci', success: true });
      }
    }
    
    // Step 4: Generate badges
    if (badges) {
      if (verbose) console.log('🏷️  Generating badges...');
      
      const repoPath = path.join(__dirname, '../..');
      const badgesMarkdown = await generateAllBadges(client, repoConfig, defaultBranch, repoPath);
      
      if (verbose) {
        console.log('\n   Generated badges:');
        console.log(`   ${badgesMarkdown}\n`);
      }
      
      result.badges = badgesMarkdown;
      result.steps.push({ step: 'generate_badges', success: true });
      
      // Step 5: Update README with badges
      if (verbose) console.log('📄 Updating README.md...');
      
      const readmePath = path.join(repoPath, 'README.md');
      let readmeContent;
      
      try {
        readmeContent = await fs.readFile(readmePath, 'utf-8');
      } catch (error) {
        console.warn('   README.md not found, skipping badge update');
        result.steps.push({ step: 'update_readme', success: false, reason: 'README.md not found' });
        readmeContent = null;
      }
      
      if (readmeContent) {
        const updatedReadme = updateReadmeBadges(readmeContent, badgesMarkdown);
        
        if (!dryRun && pullRequest && pullRequest.enabled) {
          // Create pull request with updated README
          const branchName = pullRequest.branch || 'productize/update-badges';
          
          // Check if branch exists
          const exists = await branchExists(client, owner, repo, branchName);
          
          if (!exists) {
            // Create branch
            if (verbose) console.log(`🌿 Creating branch ${branchName}...`);
            await createBranch(client, owner, repo, branchName, defaultBranch);
          }
          
          // Update README on branch
          if (verbose) console.log('📝 Committing README changes...');
          await updateFileContents(
            client,
            owner,
            repo,
            'README.md',
            updatedReadme,
            'chore: Update repository badges and metadata',
            branchName
          );
          
          // Create pull request
          if (verbose) console.log('🔀 Creating pull request...');
          const pr = await createPullRequest(client, owner, repo, {
            title: pullRequest.title || 'chore: Update repository badges and metadata',
            body: pullRequest.body || 'This PR updates repository badges and metadata according to productize.config.json.',
            head: branchName,
            base: defaultBranch,
          });
          
          if (pr) {
            result.pullRequest = {
              number: pr.number,
              url: pr.html_url,
            };
            console.log(`✅ Pull request created: ${pr.html_url}`);
          }
          
          result.steps.push({ step: 'create_pr', success: true });
        } else if (!dryRun) {
          // Direct commit to default branch (not recommended)
          await fs.writeFile(readmePath, updatedReadme, 'utf-8');
          console.log('✅ README.md updated locally');
          result.steps.push({ step: 'update_readme', success: true, method: 'local' });
        } else {
          console.log('   [DRY RUN] Would update README.md with new badges');
          result.steps.push({ step: 'update_readme', success: true, dryRun: true });
        }
      }
    }
    
    // Step 6: Generate summary
    if (verbose) console.log('\n📊 Generating summary...');
    
    const badgesSummary = await generateBadgesSummary(client, repoConfig, defaultBranch);
    const ciSummary = await getCISummary(client, owner, repo, defaultBranch);
    
    result.summary = {
      badges: badgesSummary,
      ci: ciSummary,
    };
    
    console.log('\n✅ Productization complete!');
    console.log(`   - Total badges: ${badgesSummary.total}`);
    console.log(`   - Passing CI: ${badgesSummary.passing}`);
    console.log(`   - Failing CI: ${badgesSummary.failing}`);
    console.log(`   - No status: ${badgesSummary.noStatus}`);
    
    result.success = true;
    return result;
    
  } catch (error) {
    console.error(`\n❌ Error productizing ${owner}/${repo}:`, error.message);
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 SintraPrime Repository Productization Tool');
  console.log('   Kilo Code Compliant - Badge Honesty Enforced\n');
  
  try {
    // Load configuration
    const configPath = path.join(__dirname, '../../productize.config.json');
    const config = await loadConfig(configPath);
    
    console.log(`📋 Loaded configuration (version ${config.version})`);
    console.log(`   - Repositories: ${config.repositories.length}`);
    console.log(`   - Verify CI: ${config.settings.verifyCI ? 'Yes' : 'No'}`);
    console.log(`   - Dry run: ${config.settings.dryRun ? 'Yes' : 'No'}`);
    console.log(`   - Verbose: ${config.settings.verbose ? 'Yes' : 'No'}\n`);
    
    // Get GitHub token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    
    // Create GitHub client
    const client = createGitHubClient(token);
    
    // Verify token
    console.log('🔐 Verifying GitHub token...');
    await verifyToken(client);
    console.log('');
    
    // Productize each repository
    const results = [];
    for (const repoConfig of config.repositories) {
      const result = await productizeRepository(client, repoConfig, config.settings);
      results.push(result);
    }
    
    // Print final summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('FINAL SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${results.length}\n`);
    
    if (config.settings.dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes were made to repositories');
    }
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { productizeRepository, loadConfig };
