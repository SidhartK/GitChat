import * as fs from 'fs';

/**
 * Creates the markdown document with a default header if it doesn't already
 * exist. Returns true when a new file was created.
 */
export function createIfNotExists(docPath: string): boolean {
  if (fs.existsSync(docPath)) {
    return false;
  }
  const header =
    `# Analysis Notebook\n\n` +
    `*Created by GitChat on ${new Date().toLocaleDateString()}*\n`;
  fs.writeFileSync(docPath, header, 'utf-8');
  return true;
}

/**
 * Appends a new markdown section (preceded by a horizontal rule) to the
 * document at `docPath`. Creates the file first if it doesn't exist.
 */
export function appendSection(docPath: string, sectionMarkdown: string): void {
  createIfNotExists(docPath);

  const existing = fs.readFileSync(docPath, 'utf-8');
  const updated = existing.trimEnd() + '\n\n---\n\n' + sectionMarkdown.trimEnd() + '\n';
  fs.writeFileSync(docPath, updated, 'utf-8');
}

/**
 * Replaces the entire document content (used by the restructure flow).
 */
export function replaceDocument(docPath: string, newContent: string): void {
  fs.writeFileSync(docPath, newContent, 'utf-8');
}
