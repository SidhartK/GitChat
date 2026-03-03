import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { captureCell } from './notebookCapture';

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      provider,
    ),
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
        await provider.addCapturedArtifact(artifact, 'cell_output');
      } else {
        vscode.window.showWarningMessage(
          'No supported output found in this cell.',
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitchat.checkpoint', () => {
      provider.triggerCheckpoint();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitchat.restructure', async () => {
      await provider.triggerRestructure();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gitchat.setApiKey', async () => {
      const providerName = vscode.workspace
        .getConfiguration('gitchat')
        .get<string>('provider', 'anthropic');

      const apiKey = await vscode.window.showInputBox({
        prompt: `Enter your ${providerName} API key`,
        password: true,
        placeHolder: providerName === 'anthropic' ? 'sk-ant-...' : 'sk-...',
        ignoreFocusOut: true,
      });

      if (apiKey) {
        const secretKey =
          providerName === 'anthropic'
            ? 'gitchat.anthropicApiKey'
            : 'gitchat.openaiApiKey';
        await context.secrets.store(secretKey, apiKey);
        vscode.window.showInformationMessage(
          `${providerName} API key saved securely.`,
        );
      }
    }),
  );
}

export function deactivate() {}
