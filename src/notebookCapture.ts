import * as vscode from 'vscode';
import { CapturedArtifact } from './types';

/** MIME types in descending priority — prefer the richest representation. */
const MIME_PRIORITY: readonly string[] = [
  'image/png',
  'text/html',
  'text/plain',
] as const;

function mimeToArtifactType(mime: string): CapturedArtifact['type'] {
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (mime === 'text/html') {
    return 'html';
  }
  return 'text';
}

/**
 * Reads outputs from a notebook cell and returns the richest representation.
 * MIME priority: image/png > text/html > text/plain.
 *
 * Returns `undefined` when the cell has no supported output.
 */
export async function captureCell(
  cell: vscode.NotebookCell,
): Promise<CapturedArtifact | undefined> {
  let bestItem: vscode.NotebookCellOutputItem | undefined;
  let bestPriority = MIME_PRIORITY.length;

  for (const output of cell.outputs) {
    for (const item of output.items) {
      const priority = MIME_PRIORITY.indexOf(item.mime);
      if (priority !== -1 && priority < bestPriority) {
        bestItem = item;
        bestPriority = priority;
      }
      if (bestPriority === 0) {
        break;
      }
    }
    if (bestPriority === 0) {
      break;
    }
  }

  if (!bestItem) {
    return undefined;
  }

  const type = mimeToArtifactType(bestItem.mime);
  if (type === 'image') {
    return { type, data: Buffer.from(bestItem.data), mime: bestItem.mime };
  }
  return { type, content: Buffer.from(bestItem.data).toString('utf-8') };
}
