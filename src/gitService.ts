import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export function ensureRepo(workspacePath: string): void {
  const gitDir = path.join(workspacePath, '.git');
  if (!fs.existsSync(gitDir)) {
    execSync('git init', { cwd: workspacePath, stdio: 'ignore' });
  }
}

export function commitAll(workspacePath: string, message: string): void {
  execSync('git add -A', { cwd: workspacePath, stdio: 'ignore' });
  execSync(`git commit -m ${JSON.stringify(message)}`, {
    cwd: workspacePath,
    stdio: 'ignore',
  });
}
