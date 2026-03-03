import * as vscode from 'vscode';
import { CapturedArtifact } from './types';

/**
 * Reads outputs from a notebook cell and returns the richest representation.
 * MIME priority: image/png > text/html > text/plain.
 */
export async function captureCell(cell: vscode.NotebookCell): Promise<CapturedArtifact | undefined> {
  for (const output of cell.outputs) {
    for (const item of output.items) {
      if (item.mime === 'image/png') {
        return {
          type: 'image',
          data: Buffer.from(item.data),
          mime: 'image/png',
        };
      }
    }
    for (const item of output.items) {
      if (item.mime === 'text/html') {
        return {
          type: 'html',
          content: Buffer.from(item.data).toString('utf-8'),
        };
      }
    }
    for (const item of output.items) {
      if (item.mime === 'text/plain') {
        return {
          type: 'text',
          content: Buffer.from(item.data).toString('utf-8'),
        };
      }
    }
  }
  return undefined;
}
