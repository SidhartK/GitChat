import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CapturedArtifact } from './types';

export class ArtifactManager {
  private counter: number;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.counter = context.workspaceState.get<number>('artifactCounter', 0);
  }

  async save(artifact: CapturedArtifact, label: string): Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open.');
    }

    const artifactsDir = path.join(workspaceFolder.uri.fsPath, 'artifacts');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    this.counter++;
    await this.context.workspaceState.update('artifactCounter', this.counter);

    const prefix = String(this.counter).padStart(3, '0');
    const safeName = label.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

    let filename: string;
    if (artifact.type === 'image') {
      filename = `${prefix}_${safeName}.png`;
      fs.writeFileSync(path.join(artifactsDir, filename), artifact.data!);
    } else {
      const ext = artifact.type === 'html' ? 'html' : 'md';
      filename = `${prefix}_${safeName}.${ext}`;
      fs.writeFileSync(path.join(artifactsDir, filename), artifact.content ?? '', 'utf-8');
    }

    return `artifacts/${filename}`;
  }
}
