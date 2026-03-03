import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { CapturedArtifact } from './types';

const ARTIFACTS_DIR = 'artifacts';

export class ArtifactManager {
  private counter: number;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.counter = context.workspaceState.get<number>('artifactCounter', 0);
  }

  private getWorkspaceRoot(): string {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      throw new Error('No workspace folder open.');
    }
    return folder.uri.fsPath;
  }

  /**
   * Ensures the artifacts/ directory exists in the workspace root.
   * Safe to call multiple times.
   */
  ensureArtifactsDir(): string {
    const dir = path.join(this.getWorkspaceRoot(), ARTIFACTS_DIR);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Saves a captured artifact to `artifacts/` with an auto-incrementing
   * numeric prefix and returns the workspace-relative path
   * (e.g. `"artifacts/001_scatter_plot.png"`).
   */
  async save(artifact: CapturedArtifact, label: string): Promise<string> {
    const artifactsDir = this.ensureArtifactsDir();

    this.counter++;
    await this.context.workspaceState.update('artifactCounter', this.counter);

    const prefix = String(this.counter).padStart(3, '0');
    const safeName = label
      .replace(/[^a-z0-9_-]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'artifact';

    let filename: string;
    if (artifact.type === 'image') {
      filename = `${prefix}_${safeName}.png`;
      await fs.writeFile(path.join(artifactsDir, filename), artifact.data!);
    } else {
      const ext = artifact.type === 'html' ? 'html' : 'md';
      filename = `${prefix}_${safeName}.${ext}`;
      await fs.writeFile(
        path.join(artifactsDir, filename),
        artifact.content ?? '',
        'utf-8',
      );
    }

    return `${ARTIFACTS_DIR}/${filename}`;
  }
}
