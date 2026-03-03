import * as fs from 'fs';

export function appendSection(docPath: string, sectionMarkdown: string): void {
  if (!fs.existsSync(docPath)) {
    const header = `# Analysis Notebook\n\n*Created by GitChat on ${new Date().toLocaleDateString()}*\n`;
    fs.writeFileSync(docPath, header, 'utf-8');
  }

  const existing = fs.readFileSync(docPath, 'utf-8');
  const updated = existing.trimEnd() + '\n\n---\n\n' + sectionMarkdown + '\n';
  fs.writeFileSync(docPath, updated, 'utf-8');
}

export function replaceDocument(docPath: string, newContent: string): void {
  fs.writeFileSync(docPath, newContent, 'utf-8');
}
