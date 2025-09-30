import { diffLines, diffWords, diffChars, createTwoFilesPatch } from 'diff';
import { type InsertCodeDiff, type CodeDiff } from "@shared/schema";

export interface DiffOptions {
  contextLines?: number;
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  showInlineDiffs?: boolean;
  algorithm?: 'lines' | 'words' | 'chars';
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: Array<{
    type: 'add' | 'remove' | 'context';
    content: string;
    lineNumber: {
      old?: number;
      new?: number;
    };
  }>;
}

export interface ProcessedDiff {
  fileName: string;
  language: string;
  originalLines: Array<{
    number: number;
    content: string;
    type: 'normal' | 'removed' | 'context';
  }>;
  modifiedLines: Array<{
    number: number;
    content: string;
    type: 'normal' | 'added' | 'context';
  }>;
  hunks: DiffHunk[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
    total: number;
  };
  renderingOptions: {
    contextLines: number;
    showLineNumbers: boolean;
    highlightInlineChanges: boolean;
    theme: 'light' | 'dark';
  };
}

class DiffService {
  /**
   * Generate a comprehensive diff between two file contents
   */
  generateDiff(
    originalContent: string,
    modifiedContent: string,
    fileName: string,
    options: DiffOptions = {}
  ): ProcessedDiff {
    const {
      contextLines = 3,
      ignoreWhitespace = false,
      ignoreCase = false,
      algorithm = 'lines'
    } = options;

    // Generate the basic diff
    const diff = this.createBasicDiff(originalContent, modifiedContent, algorithm, {
      ignoreWhitespace,
      ignoreCase
    });

    // Process the diff into structured format
    const processedDiff = this.processDiff(diff, originalContent, modifiedContent, fileName, contextLines);

    return processedDiff;
  }

  /**
   * Generate a unified diff patch
   */
  generateUnifiedDiff(
    originalContent: string,
    modifiedContent: string,
    originalFileName: string,
    modifiedFileName: string,
    contextLines: number = 3
  ): string {
    return createTwoFilesPatch(
      originalFileName,
      modifiedFileName,
      originalContent,
      modifiedContent,
      undefined,
      undefined,
      { context: contextLines }
    );
  }

  /**
   * Generate Monaco Editor compatible diff data
   */
  generateMonacoDiff(
    originalContent: string,
    modifiedContent: string,
    language: string
  ): {
    original: { content: string; language: string };
    modified: { content: string; language: string };
    options: Record<string, any>;
  } {
    return {
      original: {
        content: originalContent,
        language: this.normalizeLanguage(language)
      },
      modified: {
        content: modifiedContent,
        language: this.normalizeLanguage(language)
      },
      options: {
        enableSplitViewResizing: true,
        renderSideBySide: true,
        renderIndicators: true,
        renderMarginRevertIcon: true,
        ignoreTrimWhitespace: false,
        renderWhitespace: 'all',
        diffCodeLens: true,
        diffWordWrap: 'on'
      }
    };
  }

  /**
   * Generate diff statistics
   */
  generateStats(originalContent: string, modifiedContent: string): {
    additions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
    total: number;
    changePercentage: number;
  } {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    const diff = diffLines(originalContent, modifiedContent);

    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    diff.forEach(part => {
      const lineCount = part.value.split('\n').length - 1;
      if (part.added) {
        additions += lineCount;
      } else if (part.removed) {
        deletions += lineCount;
      } else {
        unchanged += lineCount;
      }
    });

    const total = Math.max(originalLines.length, modifiedLines.length);
    const modifications = Math.min(additions, deletions);
    const actualAdditions = additions - modifications;
    const actualDeletions = deletions - modifications;

    return {
      additions: actualAdditions,
      deletions: actualDeletions,
      modifications,
      unchanged,
      total,
      changePercentage: ((actualAdditions + actualDeletions + modifications) / total) * 100
    };
  }

  /**
   * Compare two file trees and generate file-level diffs
   */
  compareFileTrees(
    originalFiles: Record<string, string>,
    modifiedFiles: Record<string, string>
  ): Map<string, {
    status: 'added' | 'removed' | 'modified' | 'unchanged';
    diff?: ProcessedDiff;
  }> {
    const result = new Map();
    const allFiles = new Set([...Object.keys(originalFiles), ...Object.keys(modifiedFiles)]);

    allFiles.forEach(filePath => {
      const originalContent = originalFiles[filePath];
      const modifiedContent = modifiedFiles[filePath];

      if (!originalContent && modifiedContent) {
        // File added
        result.set(filePath, {
          status: 'added',
          diff: this.generateDiff('', modifiedContent, filePath)
        });
      } else if (originalContent && !modifiedContent) {
        // File removed
        result.set(filePath, {
          status: 'removed',
          diff: this.generateDiff(originalContent, '', filePath)
        });
      } else if (originalContent !== modifiedContent) {
        // File modified
        result.set(filePath, {
          status: 'modified',
          diff: this.generateDiff(originalContent, modifiedContent, filePath)
        });
      } else {
        // File unchanged
        result.set(filePath, { status: 'unchanged' });
      }
    });

    return result;
  }

  /**
   * Generate syntax-highlighted diff for display
   */
  generateHighlightedDiff(
    originalContent: string,
    modifiedContent: string,
    language: string
  ): {
    hunks: Array<{
      header: string;
      lines: Array<{
        type: 'add' | 'remove' | 'context';
        content: string;
        highlighted: string;
        lineNumbers: { old?: number; new?: number };
      }>;
    }>;
  } {
    const diff = this.generateDiff(originalContent, modifiedContent, '', { contextLines: 3 });
    
    // This would integrate with a syntax highlighter like Prism or Monaco
    // For now, return basic structure
    return {
      hunks: diff.hunks.map(hunk => ({
        header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        lines: hunk.lines.map(line => ({
          type: line.type,
          content: line.content,
          highlighted: line.content, // Would be syntax highlighted
          lineNumbers: line.lineNumber
        }))
      }))
    };
  }

  /**
   * Merge conflicting changes
   */
  mergeChanges(
    baseContent: string,
    leftContent: string,
    rightContent: string,
    fileName: string
  ): {
    mergedContent: string;
    conflicts: Array<{
      line: number;
      conflict: string;
      options: {
        left: string;
        right: string;
        base: string;
      };
    }>;
  } {
    // Simplified merge logic - in practice, you'd use a more sophisticated algorithm
    const baseLines = baseContent.split('\n');
    const leftLines = leftContent.split('\n');
    const rightLines = rightContent.split('\n');

    const merged: string[] = [];
    const conflicts: Array<any> = [];

    const maxLines = Math.max(baseLines.length, leftLines.length, rightLines.length);

    for (let i = 0; i < maxLines; i++) {
      const baseLine = baseLines[i] || '';
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';

      if (leftLine === rightLine) {
        // No conflict
        merged.push(leftLine);
      } else {
        // Conflict detected
        conflicts.push({
          line: i + 1,
          conflict: `Conflict at line ${i + 1}`,
          options: {
            left: leftLine,
            right: rightLine,
            base: baseLine
          }
        });

        // Add conflict markers
        merged.push(`<<<<<<< LEFT`);
        merged.push(leftLine);
        merged.push(`=======`);
        merged.push(rightLine);
        merged.push(`>>>>>>> RIGHT`);
      }
    }

    return {
      mergedContent: merged.join('\n'),
      conflicts
    };
  }

  // Private helper methods

  private createBasicDiff(
    originalContent: string,
    modifiedContent: string,
    algorithm: 'lines' | 'words' | 'chars',
    options: { ignoreWhitespace: boolean; ignoreCase: boolean }
  ) {
    let content1 = originalContent;
    let content2 = modifiedContent;

    // Apply preprocessing
    if (options.ignoreCase) {
      content1 = content1.toLowerCase();
      content2 = content2.toLowerCase();
    }

    if (options.ignoreWhitespace) {
      content1 = content1.replace(/\s+/g, ' ').trim();
      content2 = content2.replace(/\s+/g, ' ').trim();
    }

    // Generate diff based on algorithm
    switch (algorithm) {
      case 'words':
        return diffWords(content1, content2);
      case 'chars':
        return diffChars(content1, content2);
      case 'lines':
      default:
        return diffLines(content1, content2);
    }
  }

  private processDiff(
    diff: any[],
    originalContent: string,
    modifiedContent: string,
    fileName: string,
    contextLines: number
  ): ProcessedDiff {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    
    const processedOriginal = originalLines.map((content, index) => ({
      number: index + 1,
      content,
      type: 'normal' as const
    }));

    const processedModified = modifiedLines.map((content, index) => ({
      number: index + 1,
      content,
      type: 'normal' as const
    }));

    // Generate hunks from diff
    const hunks = this.generateHunks(diff, contextLines);

    // Calculate stats
    const stats = this.generateStats(originalContent, modifiedContent);

    return {
      fileName,
      language: this.detectLanguage(fileName),
      originalLines: processedOriginal,
      modifiedLines: processedModified,
      hunks,
      stats,
      renderingOptions: {
        contextLines,
        showLineNumbers: true,
        highlightInlineChanges: true,
        theme: 'dark'
      }
    };
  }

  private generateHunks(diff: any[], contextLines: number): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    let currentHunk: DiffHunk | null = null;

    diff.forEach(part => {
      const lines = part.value.split('\n').filter((line: string, index: number, array: string[]) => 
        index < array.length - 1 || line !== ''
      );

      lines.forEach((line: string, lineIndex: number) => {
        if (!currentHunk) {
          currentHunk = {
            oldStart: oldLineNum,
            oldLines: 0,
            newStart: newLineNum,
            newLines: 0,
            lines: []
          };
        }

        if (part.added) {
          currentHunk.lines.push({
            type: 'add',
            content: line,
            lineNumber: { new: newLineNum }
          });
          currentHunk.newLines++;
          newLineNum++;
        } else if (part.removed) {
          currentHunk.lines.push({
            type: 'remove',
            content: line,
            lineNumber: { old: oldLineNum }
          });
          currentHunk.oldLines++;
          oldLineNum++;
        } else {
          currentHunk.lines.push({
            type: 'context',
            content: line,
            lineNumber: { old: oldLineNum, new: newLineNum }
          });
          currentHunk.oldLines++;
          currentHunk.newLines++;
          oldLineNum++;
          newLineNum++;
        }
      });
    });

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  }

  private detectLanguage(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
      'sql': 'sql'
    };

    return languageMap[extension || ''] || 'plaintext';
  }

  private normalizeLanguage(language: string): string {
    const normalized: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript'
    };

    return normalized[language] || language;
  }
}

export const diffService = new DiffService();