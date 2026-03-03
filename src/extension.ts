import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { captureCell } from './notebookCapture';

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gitchat.chatView', provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitchat.captureCell', async () => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active notebook editor.');
        return;
      }
      const cell = editor.notebook.cellAt(editor.selections[0].start);
      const artifact = await captureCell(cell);
      if (artifact) {
        await provider.addCapturedArtifact(artifact);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitchat.checkpoint', () => {
      provider.triggerCheckpoint();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitchat.restructure', () => {
      provider.triggerRestructure();
    })
  );
}

export function deactivate() {}
