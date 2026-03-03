/**
 * A captured output from a Jupyter notebook cell or pasted content.
 */
export interface CapturedArtifact {
  type: 'image' | 'html' | 'text';
  /** Raw binary data (for images). */
  data?: Buffer;
  /** String content (for text/html outputs). */
  content?: string;
  /** MIME type of the original output. */
  mime?: string;
}

/**
 * An entry staged in the chat feed, awaiting the next checkpoint.
 */
export interface StagedEntry {
  id: string;
  timestamp: Date;
  type: 'note' | 'artifact';
  /** User-written note text. Present when type is 'note'. */
  note?: string;
  /** Artifact metadata. Present when type is 'artifact'. */
  artifact?: StagedArtifact;
}

/**
 * Artifact metadata attached to a StagedEntry after the artifact
 * has been saved to the workspace.
 */
export interface StagedArtifact {
  type: 'image' | 'html' | 'text';
  /** Relative path within the workspace (e.g. "artifacts/001_scatter_plot.png"). */
  filePath?: string;
  /** Inline content for text/html that doesn't warrant a separate file. */
  inlineContent?: string;
  /** Base64 thumbnail or text snippet for rendering in the webview. */
  preview?: string;
}

/**
 * Abstract LLM provider that the extension uses for formatting and restructuring.
 */
export interface LLMProvider {
  /**
   * Formats staged entries into a markdown section to append to the document.
   * The returned string should include headers, lists, and image references
   * (e.g. `![description](artifacts/filename.png)`).
   */
  formatSection(entries: StagedEntry[], title: string): Promise<string>;

  /**
   * Reorganizes the entire document for improved structure.
   * Must preserve all existing content; may add/fix headers and reorder sections.
   */
  restructureDocument(currentDoc: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Webview <-> Extension message protocol
// ---------------------------------------------------------------------------

/** Messages sent from the webview to the extension host. */
export type WebviewToExtensionMessage =
  | { type: 'addNote'; text: string }
  | { type: 'checkpoint'; title: string }
  | { type: 'pasteImage'; dataUrl: string }
  | { type: 'restructure' };

/** Messages sent from the extension host to the webview. */
export type ExtensionToWebviewMessage =
  | { type: 'artifactCaptured'; data: StagedEntry }
  | { type: 'requestCheckpointTitle' }
  | { type: 'checkpointComplete'; message: string }
  | { type: 'checkpointError'; error: string }
  | { type: 'restructureComplete'; message: string }
  | { type: 'restructureError'; error: string };
