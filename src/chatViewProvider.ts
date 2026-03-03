import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CapturedArtifact, StagedEntry } from './types';
import { ArtifactManager } from './artifactManager';
import { createLLMProvider } from './llmService';
import { appendSection, replaceDocument } from './markdownEditor';
import { ensureRepo, commitAll } from './gitService';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'gitchat.chatView';

  private view?: vscode.WebviewView;
  private stagedEntries: StagedEntry[] = [];
  private artifactManager: ArtifactManager;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.artifactManager = new ArtifactManager(context);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        await this.handleMessage(message);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`GitChat: ${errorMsg}`);
      }
    });
  }

  async addCapturedArtifact(artifact: CapturedArtifact, label?: string): Promise<void> {
    const filePath = await this.artifactManager.save(artifact, label || 'capture');

    let preview: string | undefined;
    if (artifact.type === 'image' && artifact.data) {
      preview = artifact.data.toString('base64');
    } else if (artifact.content) {
      preview = artifact.content.substring(0, 200);
    }

    const entry: StagedEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'artifact',
      artifact: {
        type: artifact.type,
        filePath,
        inlineContent: artifact.type !== 'image' ? artifact.content : undefined,
        preview,
      },
    };
    this.stagedEntries.push(entry);
    this.view?.webview.postMessage({ type: 'artifactCaptured', data: entry });
  }

  triggerCheckpoint(): void {
    this.view?.webview.postMessage({ type: 'requestCheckpointTitle' });
  }

  async triggerRestructure(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.postMessage('restructureError', 'No workspace folder open.');
      return;
    }

    try {
      const provider = await this.getLLMProvider();
      if (!provider) { return; }

      const docName = vscode.workspace
        .getConfiguration('gitchat')
        .get<string>('documentName', 'analysis.md');
      const docPath = path.join(workspaceRoot, docName);

      if (!fs.existsSync(docPath)) {
        this.postMessage('restructureError', `Document "${docName}" does not exist yet.`);
        return;
      }

      const currentDoc = fs.readFileSync(docPath, 'utf-8');
      const newContent = await provider.restructureDocument(currentDoc);

      replaceDocument(docPath, newContent);
      ensureRepo(workspaceRoot);
      commitAll(workspaceRoot, '[restructure] Document reorganized');

      this.view?.webview.postMessage({
        type: 'restructureComplete',
        message: 'Document restructured and committed',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.postMessage('restructureError', message);
    }
  }

  private async handleMessage(
    message: { type: string; [key: string]: unknown },
  ): Promise<void> {
    switch (message.type) {
      case 'addNote': {
        const entry: StagedEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          type: 'note',
          note: message.text as string,
        };
        this.stagedEntries.push(entry);
        break;
      }

      case 'checkpoint': {
        const title = (message.title as string) || 'Checkpoint';
        await this.performCheckpoint(title);
        break;
      }

      case 'pasteImage': {
        await this.handlePastedImage(message.dataUrl as string);
        break;
      }

      case 'restructure': {
        await this.triggerRestructure();
        break;
      }
    }
  }

  private async performCheckpoint(title: string): Promise<void> {
    if (this.stagedEntries.length === 0) {
      this.postMessage(
        'checkpointError',
        'Nothing to checkpoint \u2014 add some notes or artifacts first.',
      );
      return;
    }

    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.postMessage('checkpointError', 'No workspace folder open.');
      return;
    }

    try {
      const provider = await this.getLLMProvider();
      if (!provider) { return; }

      const sectionMarkdown = await provider.formatSection(
        this.stagedEntries,
        title,
      );

      const docName = vscode.workspace
        .getConfiguration('gitchat')
        .get<string>('documentName', 'analysis.md');
      const docPath = path.join(workspaceRoot, docName);

      this.artifactManager.ensureArtifactsDir();
      appendSection(docPath, sectionMarkdown);

      ensureRepo(workspaceRoot);
      commitAll(workspaceRoot, `[checkpoint] ${title}`);

      const committedCount = this.stagedEntries.length;
      this.stagedEntries = [];

      this.view?.webview.postMessage({
        type: 'checkpointComplete',
        message: `Committed "${title}" (${committedCount} ${committedCount === 1 ? 'entry' : 'entries'})`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.postMessage('checkpointError', message);
    }
  }

  private async handlePastedImage(dataUrl: string): Promise<void> {
    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const artifact: CapturedArtifact = {
      type: 'image',
      data: buffer,
      mime: 'image/png',
    };
    await this.addCapturedArtifact(artifact, 'pasted_image');
  }

  private async getLLMProvider() {
    const config = vscode.workspace.getConfiguration('gitchat');
    const providerName = config.get<'anthropic' | 'openai'>('provider', 'anthropic');

    const secretKey =
      providerName === 'anthropic'
        ? 'gitchat.anthropicApiKey'
        : 'gitchat.openaiApiKey';
    const apiKey = await this.context.secrets.get(secretKey);

    if (!apiKey) {
      const action = await vscode.window.showErrorMessage(
        `No API key configured for ${providerName}. Use "GitChat: Set API Key" to set one.`,
        'Set API Key',
      );
      if (action) {
        await vscode.commands.executeCommand('gitchat.setApiKey');
      }
      this.postMessage('checkpointError', 'API key not configured.');
      return undefined;
    }

    return createLLMProvider(providerName, apiKey);
  }

  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private postMessage(type: string, errorOrMessage: string): void {
    this.view?.webview.postMessage({
      type,
      ...(type.includes('Error') ? { error: errorOrMessage } : { message: errorOrMessage }),
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'styles.css'),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'main.js'),
    );
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>GitChat</title>
</head>
<body>
  <div id="chat-feed"></div>
  <div id="checkpoint-overlay">
    <input id="checkpoint-title-input" type="text" placeholder="Checkpoint title (optional)">
    <div class="checkpoint-actions">
      <button id="checkpoint-go-btn">Commit</button>
      <button id="checkpoint-cancel-btn">Cancel</button>
    </div>
  </div>
  <div id="paste-preview"></div>
  <div id="input-area">
    <textarea id="note-input" placeholder="Write a note... (paste images here)" rows="3"></textarea>
    <div id="actions">
      <button id="send-btn">Send</button>
      <button id="checkpoint-btn">Checkpoint</button>
      <button id="restructure-btn" title="Restructure document">Restructure</button>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
