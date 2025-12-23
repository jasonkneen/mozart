type ServiceResult<T = void> = { success: boolean; data?: T; error?: string };

export const fileService = {
  readFileFull: async (path: string): Promise<ServiceResult<string>> => ({ success: true, data: '' }),
  writeFile: async (path: string, content: string): Promise<ServiceResult> => ({ success: true }),
  createFile: async (path: string, content: string): Promise<ServiceResult> => ({ success: true }),
  deleteFile: async (path: string): Promise<ServiceResult> => ({ success: true }),
  renameFile: async (oldPath: string, newPath: string): Promise<ServiceResult> => ({ success: true }),
  listDirectory: async (path?: string): Promise<ServiceResult<any[]>> => ({ success: true, data: [] }),
  createDirectory: async (path: string): Promise<ServiceResult> => ({ success: true }),
  exists: async (path: string): Promise<{ exists: boolean; error?: string }> => ({ exists: false }),
  stat: async (path: string): Promise<ServiceResult<any>> => ({ success: true, data: {} }),
  searchInFiles: async (pattern: string, dir?: string, options?: any): Promise<ServiceResult<any[]>> => ({ success: true, data: [] }),
  glob: async (pattern: string, dir?: string): Promise<ServiceResult<any[]>> => ({ success: true, data: [] }),
  copyFile: async (source: string, dest: string): Promise<ServiceResult> => ({ success: true }),
  readMultiple: async (paths: string[]): Promise<ServiceResult<any[]>> => ({ success: true, data: [] }),
  getTree: async (dir?: string, options?: any): Promise<ServiceResult<any>> => ({ success: true, data: {} }),
};
