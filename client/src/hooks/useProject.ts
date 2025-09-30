import { useQuery } from '@tanstack/react-query';
import type { Project, ProjectFile } from '@shared/schema';

export function useProject(projectId?: string) {
  const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  const { data: files = [], isLoading: isFilesLoading } = useQuery<ProjectFile[]>({
    queryKey: ['/api/projects', projectId, 'files'],
    enabled: !!projectId,
  });

  return {
    project,
    files,
    isLoading: isProjectLoading || isFilesLoading,
  };
}
