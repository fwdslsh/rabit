/**
 * Git transport support for RBT
 * Uses Bun's subprocess capabilities to interact with Git
 * @see Specification §5.1, §5.2.1
 */

import type { GitRoot, FetchResult, RbtError } from './types';
import { createError, validateUrl } from './utils';
import { spawn } from 'bun';
import { join } from 'path';
import { mkdtemp, rm, mkdir, access, stat } from 'fs/promises';
import { tmpdir, homedir } from 'os';
import * as crypto from 'crypto';

// ============================================================================
// Cache Directory Management
// ============================================================================

/**
 * Get the XDG_STATE_HOME directory for rabit cache
 * Falls back to ~/.local/state if XDG_STATE_HOME is not set
 */
export function getRabitCacheDir(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME;
  const baseDir = xdgStateHome || join(homedir(), '.local', 'state');
  return join(baseDir, 'rabit', 'repos');
}

/**
 * Generate a stable cache path for a git repository URL
 * Uses a hash-based approach to avoid filesystem issues with special characters
 * @param repoUrl The git repository URL
 * @returns Path within the cache directory
 */
export function getRepoCachePath(repoUrl: string): string {
  // Parse GitHub URL to extract owner/repo
  const githubMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/);

  if (githubMatch) {
    const [, owner, repo] = githubMatch;
    // Use github.com/owner/repo format for readability
    return join(getRabitCacheDir(), 'github.com', owner, repo);
  }

  // For other URLs, create a hash-based path
  const hash = crypto.createHash('sha256').update(repoUrl).digest('hex').slice(0, 16);
  const sanitized = repoUrl
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '')
    .replace(/[^a-zA-Z0-9-_.]/g, '_')
    .slice(0, 100); // Limit length

  return join(getRabitCacheDir(), 'other', `${sanitized}_${hash}`);
}

/**
 * Check if a repository exists in the cache
 * @param repoPath Path to the cached repository
 * @returns true if the repository exists and has a .git directory
 */
export async function isCachedRepo(repoPath: string): Promise<boolean> {
  try {
    const gitDir = join(repoPath, '.git');
    await access(gitDir);
    const stats = await stat(gitDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Clone or update a GitHub repository in the cache
 * Uses shallow clones (--depth=1) for minimal data transfer
 * @param repoUrl The GitHub repository URL (e.g., https://github.com/user/repo)
 * @param branch The branch to fetch (default: 'main')
 * @returns Path to the cached repository
 */
export async function cloneOrUpdateCached(
  repoUrl: string,
  branch: string = 'main'
): Promise<FetchResult<string>> {
  const cachePath = getRepoCachePath(repoUrl);

  try {
    // Check if repo is already cached
    if (await isCachedRepo(cachePath)) {
      // Repository exists, do a lightweight pull
      const fetchProc = spawn(['git', 'fetch', '--depth=1', 'origin', branch], {
        cwd: cachePath,
        stderr: 'pipe',
        stdout: 'pipe',
      });

      const fetchExit = await fetchProc.exited;

      if (fetchExit !== 0) {
        const stderr = await new Response(fetchProc.stderr).text();
        // If fetch fails, try to use the cached version anyway
        console.warn(`Git fetch failed, using cached version: ${stderr}`);
        return { ok: true, data: cachePath };
      }

      // Reset to fetched commit (lightweight, no merge needed)
      const resetProc = spawn(['git', 'reset', '--hard', `origin/${branch}`], {
        cwd: cachePath,
        stderr: 'pipe',
        stdout: 'pipe',
      });

      const resetExit = await resetProc.exited;

      if (resetExit !== 0) {
        const stderr = await new Response(resetProc.stderr).text();
        console.warn(`Git reset failed, using cached version: ${stderr}`);
      }

      return { ok: true, data: cachePath };
    }

    // Repository not cached, do a shallow clone
    // Ensure parent directory exists
    const parentDir = join(cachePath, '..');
    await mkdir(parentDir, { recursive: true });

    const cloneProc = spawn(
      ['git', 'clone', '--depth=1', '--branch', branch, '--single-branch', repoUrl, cachePath],
      {
        stderr: 'pipe',
        stdout: 'pipe',
      }
    );

    const cloneExit = await cloneProc.exited;

    if (cloneExit !== 0) {
      const stderr = await new Response(cloneProc.stderr).text();
      return {
        ok: false,
        error: createError('transport_error', `Git clone failed: ${stderr}`, undefined, repoUrl),
      };
    }

    return { ok: true, data: cachePath };
  } catch (error) {
    return {
      ok: false,
      error: createError(
        'transport_error',
        `Failed to clone or update repository: ${error}`,
        undefined,
        repoUrl
      ),
    };
  }
}

/**
 * Clone a Git repository to a temporary directory
 * @param root Git root descriptor
 * @returns Path to cloned repository
 */
export async function cloneRepository(root: GitRoot): Promise<FetchResult<string>> {
  try {
    // Validate remote URL
    const remoteUrl = root.git.remote;

    // Git URLs can use git:// or SSH format (git@github.com:org/repo.git)
    const isGitProtocol = remoteUrl.startsWith('git://');
    const isSshFormat = remoteUrl.match(/^git@/);
    const isHttpsGit = remoteUrl.startsWith('https://') && remoteUrl.endsWith('.git');

    if (!isGitProtocol && !isSshFormat && !isHttpsGit) {
      if (remoteUrl.startsWith('https://')) {
        validateUrl(remoteUrl, false);
      }
    }

    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), 'rabit-git-'));

    try {
      // Determine if ref is a commit SHA or a branch/tag ref
      const isCommitSha = /^[0-9a-f]{40}$/.test(root.git.ref);

      let cloneArgs: string[];

      if (isCommitSha) {
        // For commit SHAs, we need to clone and then checkout
        cloneArgs = [
          'clone',
          '--no-checkout',
          '--depth=1',
          remoteUrl,
          tempDir,
        ];
      } else {
        // For refs, we can clone the specific branch/tag
        const refName = root.git.ref.replace(/^refs\/(heads|tags)\//, '');
        cloneArgs = [
          'clone',
          '--depth=1',
          '--branch',
          refName,
          remoteUrl,
          tempDir,
        ];
      }

      // Execute git clone
      const cloneProc = spawn(['git', ...cloneArgs], {
        stderr: 'pipe',
        stdout: 'pipe',
      });

      const cloneExit = await cloneProc.exited;

      if (cloneExit !== 0) {
        const stderr = await new Response(cloneProc.stderr).text();
        await rm(tempDir, { recursive: true, force: true });
        return {
          ok: false,
          error: createError(
            'transport_error',
            `Git clone failed: ${stderr}`,
            undefined,
            remoteUrl
          ),
        };
      }

      // If we cloned without checkout (for commit SHA), now checkout the commit
      if (isCommitSha) {
        const checkoutProc = spawn(['git', 'checkout', root.git.ref], {
          cwd: tempDir,
          stderr: 'pipe',
          stdout: 'pipe',
        });

        const checkoutExit = await checkoutProc.exited;

        if (checkoutExit !== 0) {
          const stderr = await new Response(checkoutProc.stderr).text();
          await rm(tempDir, { recursive: true, force: true });
          return {
            ok: false,
            error: createError(
              'transport_error',
              `Git checkout failed: ${stderr}`,
              undefined,
              root.git.ref
            ),
          };
        }
      }

      // Return the path to the cloned repository
      const repoPath = root.git.path ? join(tempDir, root.git.path) : tempDir;
      return { ok: true, data: repoPath };
    } catch (error) {
      // Clean up on error
      await rm(tempDir, { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    return {
      ok: false,
      error: createError(
        'transport_error',
        `Failed to clone repository: ${error}`,
        undefined,
        root.git.remote
      ),
    };
  }
}

/**
 * Read a file from a cloned Git repository
 * @param repoPath Path to cloned repository
 * @param filePath Relative path to file within repository
 * @returns File content as Uint8Array
 */
export async function readFileFromRepo(
  repoPath: string,
  filePath: string
): Promise<FetchResult<Uint8Array>> {
  try {
    const fullPath = join(repoPath, filePath);
    const file = Bun.file(fullPath);

    if (!(await file.exists())) {
      return {
        ok: false,
        error: createError(
          'entry_not_found',
          `File not found in repository: ${filePath}`,
          undefined,
          filePath
        ),
      };
    }

    const content = await file.arrayBuffer();
    return { ok: true, data: new Uint8Array(content) };
  } catch (error) {
    return {
      ok: false,
      error: createError(
        'transport_error',
        `Failed to read file from repository: ${error}`,
        undefined,
        filePath
      ),
    };
  }
}

/**
 * Clean up a cloned Git repository
 * @param repoPath Path to cloned repository
 */
export async function cleanupRepository(repoPath: string): Promise<void> {
  try {
    // Only clean up if it's in the temp directory
    if (repoPath.startsWith(tmpdir())) {
      await rm(repoPath, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Check if Git is available on the system
 * @returns true if git command is available
 */
export async function isGitAvailable(): Promise<boolean> {
  try {
    const proc = spawn(['git', '--version'], {
      stdout: 'ignore',
      stderr: 'ignore',
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}
