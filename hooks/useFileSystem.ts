/// <reference path="../types/electron.d.ts" />
import { useState, useCallback } from 'react'

interface GitResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
}

export interface FileStat {
  size: number
  isFile: boolean
  isDirectory: boolean
  created: string
  modified: string
}

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  modified?: string
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

interface FileWatcherEvent {
  type: 'add' | 'change' | 'unlink'
  path: string
  relativePath: string
  projectPath: string
  timestamp: number
}

export interface UseFileSystemReturn {
  readFile: (path: string) => Promise<string | null>
  listDirectory: (path?: string) => Promise<FileInfo[]>
  getTree: (path?: string) => Promise<TreeNode[]>
  exists: (path: string) => Promise<boolean>
  stat: (path: string) => Promise<FileStat | null>

  writeFile: (path: string, content: string) => Promise<boolean>
  createFile: (path: string, content?: string) => Promise<boolean>
  deleteFile: (path: string) => Promise<boolean>
  renameFile: (oldPath: string, newPath: string) => Promise<boolean>

  watchProject: (projectPath: string) => Promise<boolean>
  unwatchProject: (projectPath: string) => Promise<boolean>
  getWatchedProjects: () => Promise<string[]>
  onFileChange: (callback: (event: FileWatcherEvent) => void) => () => void

  loading: boolean
  error: string | null
  operation: string | null
}

export const useFileSystem = (): UseFileSystemReturn => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operation, setOperation] = useState<string | null>(null)

  const getApi = useCallback(() => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.warn('Electron API not available')
      return null
    }
    return window.electronAPI
  }, [])

  const wrapOperation = useCallback(async <T>(
    opName: string,
    fn: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true)
    setOperation(opName)
    setError(null)
    try {
      return await fn()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
      setOperation(null)
    }
  }, [])

  const readFile = useCallback(async (path: string): Promise<string | null> => {
    return wrapOperation('readFile', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const result: GitResult<string> = await api.files.readFile(path)
      if (!result.success) throw new Error(result.error || 'Failed to read file')
      return result.data as string
    })
  }, [getApi, wrapOperation])

  const writeFile = useCallback(async (path: string, content: string): Promise<boolean> => {
    const result = await wrapOperation('writeFile', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res: GitResult = await api.files.writeFile(path, content)
      if (!res.success) throw new Error(res.error || 'Failed to write file')
      return true
    })
    return result === true
  }, [getApi, wrapOperation])

  const createFile = useCallback(async (path: string, content: string = ''): Promise<boolean> => {
    const result = await wrapOperation('createFile', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res: GitResult = await api.files.createFile(path, content)
      if (!res.success) throw new Error(res.error || 'Failed to create file')
      return true
    })
    return result === true
  }, [getApi, wrapOperation])

  const deleteFile = useCallback(async (path: string): Promise<boolean> => {
    const result = await wrapOperation('deleteFile', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res: GitResult = await api.files.deleteFile(path)
      if (!res.success) throw new Error(res.error || 'Failed to delete file')
      return true
    })
    return result === true
  }, [getApi, wrapOperation])

  const renameFile = useCallback(async (oldPath: string, newPath: string): Promise<boolean> => {
    const result = await wrapOperation('renameFile', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res: GitResult = await api.files.renameFile(oldPath, newPath)
      if (!res.success) throw new Error(res.error || 'Failed to rename file')
      return true
    })
    return result === true
  }, [getApi, wrapOperation])

  const exists = useCallback(async (path: string): Promise<boolean> => {
    const result = await wrapOperation('exists', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res = await api.files.exists(path)
      if (!res.success) return false
      return res.exists
    })
    return result === true
  }, [getApi, wrapOperation])

  const stat = useCallback(async (path: string): Promise<FileStat | null> => {
    return wrapOperation('stat', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res: GitResult<FileStat> = await api.files.stat(path)
      if (!res.success) throw new Error(res.error || 'Failed to stat file')
      return res.data as FileStat
    })
  }, [getApi, wrapOperation])

  const listDirectory = useCallback(async (path?: string): Promise<FileInfo[]> => {
    const result = await wrapOperation('listDirectory', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res: GitResult<DirectoryEntry[]> = await api.files.listDirectory(path)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to list directory')
      
      const entries: DirectoryEntry[] = res.data
      
      const enhancedEntries = await Promise.all(entries.map(async (entry) => {
        try {
          const fileStat: GitResult<FileStat> = await api.files.stat(entry.path)
          const statData = fileStat.success ? fileStat.data : undefined
          
          return {
            name: entry.name,
            path: entry.path,
            isDirectory: entry.isDirectory,
            size: statData?.size,
            modified: statData?.modified
          } as FileInfo
        } catch {
          return {
            name: entry.name,
            path: entry.path,
            isDirectory: entry.isDirectory
          } as FileInfo
        }
      }))
      
      return enhancedEntries
    })
    return result || []
  }, [getApi, wrapOperation])

  const getTree = useCallback(async (path?: string): Promise<TreeNode[]> => {
    const result = await wrapOperation('getTree', async () => {
      const api = getApi()
      if (!api) throw new Error('Electron API unavailable')
      
      const res: GitResult<TreeNode[]> = await api.files.getTree(path)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to get tree')
      return res.data as TreeNode[]
    })
    return result || []
  }, [getApi, wrapOperation])

  const watchProject = useCallback(async (projectPath: string): Promise<boolean> => {
    const result = await wrapOperation('watchProject', async () => {
      const api = getApi()
      if (!api || !api.fileWatcher) throw new Error('File watcher API unavailable')
      
      const res = await api.fileWatcher.start(projectPath)
      return res.success
    })
    return result === true
  }, [getApi, wrapOperation])

  const unwatchProject = useCallback(async (projectPath: string): Promise<boolean> => {
    const result = await wrapOperation('unwatchProject', async () => {
      const api = getApi()
      if (!api || !api.fileWatcher) throw new Error('File watcher API unavailable')
      
      const res = await api.fileWatcher.stop(projectPath)
      return res.success
    })
    return result === true
  }, [getApi, wrapOperation])

  const getWatchedProjects = useCallback(async (): Promise<string[]> => {
    const result = await wrapOperation('getWatchedProjects', async () => {
      const api = getApi()
      if (!api || !api.fileWatcher) throw new Error('File watcher API unavailable')
      
      return await api.fileWatcher.getWatched()
    })
    return result || []
  }, [getApi, wrapOperation])

  const onFileChange = useCallback((callback: (event: FileWatcherEvent) => void) => {
    const api = getApi()
    if (!api || !api.fileWatcher) {
      console.warn('File watcher API unavailable')
      return () => {}
    }
    return api.fileWatcher.onChange(callback)
  }, [getApi])

  return {
    readFile,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
    listDirectory,
    getTree,
    exists,
    stat,
    
    watchProject,
    unwatchProject,
    getWatchedProjects,
    onFileChange,
    
    loading,
    error,
    operation
  }
}
