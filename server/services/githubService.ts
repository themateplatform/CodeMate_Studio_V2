import { getUncachableGitHubClient } from '../githubClient';
import { storage } from '../storage';

class GitHubService {
  async cloneRepository(repoUrl: string, projectId: string): Promise<{ success: boolean; filesCount: number }> {
    try {
      const github = await getUncachableGitHubClient();
      
      // Parse repository URL to get owner and repo name
      const urlParts = repoUrl.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const repo = urlParts[1].replace('.git', '');

      // Get repository contents
      const { data: contents } = await github.rest.repos.getContent({
        owner,
        repo,
        path: '', // root directory
      });

      let filesCount = 0;

      // Function to recursively process files and directories
      const processContents = async (items: any[], basePath: string = '') => {
        for (const item of items) {
          if (item.type === 'file') {
            // Get file content
            const { data: fileData } = await github.rest.repos.getContent({
              owner,
              repo,
              path: item.path,
            });

            if ('content' in fileData) {
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              
              await storage.createProjectFile({
                projectId,
                fileName: item.name,
                filePath: item.path,
                content,
                language: this.getLanguageFromFilename(item.name)
              });
              
              filesCount++;
            }
          } else if (item.type === 'dir') {
            // Create directory entry
            await storage.createProjectFile({
              projectId,
              fileName: item.name,
              filePath: item.path,
              content: ''
            });

            // Recursively process directory contents
            const { data: dirContents } = await github.rest.repos.getContent({
              owner,
              repo,
              path: item.path,
            });

            if (Array.isArray(dirContents)) {
              await processContents(dirContents, item.path);
            }
          }
        }
      };

      if (Array.isArray(contents)) {
        await processContents(contents);
      }

      // Update project with GitHub repo info
      await storage.updateProject(projectId, {
        githubRepoUrl: `https://github.com/${owner}/${repo}`,
      });

      return { success: true, filesCount };
    } catch (error) {
      console.error('GitHub clone error:', error);
      throw new Error('Failed to clone repository');
    }
  }

  async commitChanges(projectId: string, message: string, files: Array<{ path: string; content: string }>): Promise<{ success: boolean; commitSha: string }> {
    try {
      const github = await getUncachableGitHubClient();
      const project = await storage.getProject(projectId);
      
      if (!project?.githubRepoUrl) {
        throw new Error('No GitHub repository linked to this project');
      }

      const urlParts = project.githubRepoUrl.replace('https://github.com/', '').split('/');
      const [owner, repo] = urlParts;

      // Get the current commit SHA
      const { data: ref } = await github.rest.git.getRef({
        owner,
        repo,
        ref: 'heads/main',
      });

      const currentCommitSha = ref.object.sha;

      // Get the current tree
      const { data: currentCommit } = await github.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
      });

      // Create blobs for each file
      const tree = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await github.rest.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: 'utf-8',
          });

          return {
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        })
      );

      // Create new tree
      const { data: newTree } = await github.rest.git.createTree({
        owner,
        repo,
        base_tree: currentCommit.tree.sha,
        tree,
      });

      // Create new commit
      const { data: newCommit } = await github.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [currentCommitSha],
      });

      // Update the reference
      await github.rest.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
        sha: newCommit.sha,
      });

      return { success: true, commitSha: newCommit.sha };
    } catch (error) {
      console.error('GitHub commit error:', error);
      throw new Error('Failed to commit changes');
    }
  }

  async getBranches(projectId: string): Promise<string[]> {
    try {
      const github = await getUncachableGitHubClient();
      const project = await storage.getProject(projectId);
      
      if (!project?.githubRepoUrl) {
        throw new Error('No GitHub repository linked to this project');
      }

      const urlParts = project.githubRepoUrl.replace('https://github.com/', '').split('/');
      const [owner, repo] = urlParts;

      const { data: branches } = await github.rest.repos.listBranches({
        owner,
        repo,
      });

      return branches.map((branch: any) => branch.name);
    } catch (error) {
      console.error('GitHub branches error:', error);
      throw new Error('Failed to fetch branches');
    }
  }

  private getLanguageFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
    };

    return languageMap[extension || ''] || 'text';
  }
}

export const githubService = new GitHubService();
