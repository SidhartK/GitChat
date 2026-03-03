import * as vscode from 'vscode';
import { CapturedArtifact, StagedEntry } from './types';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'gitchat.chatView';

  private view?: vscode.WebviewView;
  private stagedEntries: StagedEntry[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

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

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });
  }

  async addCapturedArtifact(artifact: CapturedArtifact): Promise<void> {
    // TODO: save artifact via ArtifactManager, add to staged entries, notify webview
    const entry: StagedEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'artifact',
      artifact: {
        type: artifact.type,
        preview: artifact.type === 'text' ? artifact.content?.substring(0, 200) : undefined,
      },
    };
    this.stagedEntries.push(entry);
    this.view?.webview.postMessage({ type: 'artifactCaptured', data: entry });
  }

  triggerCheckpoint(): void {
    this.view?.webview.postMessage({ type: 'requestCheckpointTitle' });
  }

  triggerRestructure(): void {
    // TODO: implement restructure flow
  }

  private handleMessage(message: { type: string; [key: string]: unknown }): void {
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
        // TODO: orchestrate LLM formatting, markdown append, git commit
        break;
      }
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'styles.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'main.js')
    );

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>GitChat</title>
</head>
<body>
  <div id="chat-feed"></div>
  <div id="input-area">
    <textarea id="note-input" placeholder="Write a note..." rows="3"></textarea>
    <div id="actions">
      <button id="send-btn">Send</button>
      <button id="checkpoint-btn">Checkpoint</button>
    </div>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
