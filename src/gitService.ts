import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initializes a git repo at `workspacePath` if one doesn't already exist.
 * Throws if git is not installed or init fails.
 */
export function ensureRepo(workspacePath: string): void {
  const gitDir = path.join(workspacePath, '.git');
  if (fs.existsSync(gitDir)) {
    return;
  }

  try {
    execFileSync('git', ['init'], { cwd: workspacePath, stdio: 'ignore' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to initialize git repository: ${message}`);
  }
}

/**
 * Returns true when the working tree has staged or unstaged changes
 * (i.e. `git status --porcelain` produces output).
 */
export function hasChanges(workspacePath: string): boolean {
  try {
    const output = execFileSync('git', ['status', '--porcelain'], {
      cwd: workspacePath,
      encoding: 'utf-8',
    });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Stages every file in the workspace and commits with `message`.
 * Skips the commit (without throwing) when there is nothing to commit.
 */
export function commitAll(workspacePath: string, message: string): void {
  execFileSync('git', ['add', '-A'], { cwd: workspacePath, stdio: 'ignore' });

  if (!hasChanges(workspacePath)) {
    return;
  }

  try {
    execFileSync('git', ['commit', '-m', message], {
      cwd: workspacePath,
      stdio: 'ignore',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Git commit failed: ${msg}`);
  }
}
