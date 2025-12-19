import { useState, useEffect, useCallback, useMemo } from 'react'
import { Save, Copy, Check, RefreshCw, Undo, Plus } from 'lucide-react'
import { CodeComment } from '../types'

interface FileEditorProps {
  filePath: string
  workspacePath?: string
  onSave?: (content: string) => Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
  onSaveComplete?: () => void
  comments?: CodeComment[]
  onAddComment?: (line: number, content: string) => void
  onEditComment?: (id: string, content: string) => void
  onDeleteComment?: (id: string) => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  })
}

const FileEditor = ({
  filePath,
  workspacePath,
  onSave,
  onDirtyChange,
  onSaveComplete,
  comments = [],
  onAddComment,
  onEditComment,
  onDeleteComment,
}) => {
  const [content, setContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [commentingLine, setCommentingLine] = useState<number | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)

  const fileName = filePath.split('/').pop() || filePath
  const isDirty = content !== originalContent

  const commentsByLine = useMemo(() => {
    const map = new Map<number, CodeComment[]>()
    comments.forEach(c => {
      const existing = map.get(c.line) || []
      existing.push(c)
      map.set(c.line, existing)
    })
    return map
  }, [comments])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const getFullPath = useCallback(() => {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    return workspacePath ? `${workspacePath}/${cleanPath}` : filePath
  }, [filePath, workspacePath])

  useEffect(() => {
    const loadFile = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/file?path=${encodeURIComponent(getFullPath())}`)
        if (!response.ok) throw new Error('Failed to load file')
        const data = await response.json()
        const fileContent = data.content || ''
        setContent(fileContent)
        setOriginalContent(fileContent)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setIsLoading(false)
      }
    }
    loadFile()
  }, [getFullPath])

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    setIsSaving(true)
    setError(null)
    try {
      if (onSave) {
        await onSave(content)
      } else {
        const savePath = getFullPath()
        const response = await fetch('/api/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: savePath, content })
        })
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `Save failed: ${response.status}`)
        }
      }
      setOriginalContent(content)
      onSaveComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [content, isDirty, onSave, getFullPath, onSaveComplete])

  const handleRevert = useCallback(() => {
    setContent(originalContent)
  }, [originalContent])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReload = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(getFullPath())}`)
      if (!response.ok) throw new Error('Failed to load file')
      const data = await response.json()
      const fileContent = data.content || ''
      setContent(fileContent)
      setOriginalContent(fileContent)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const handleAddComment = (line: number) => {
    setCommentingLine(line)
    setCommentInput('')
    setEditingCommentId(null)
  }

  const handleEditComment = (comment: CodeComment) => {
    setCommentingLine(comment.line)
    setCommentInput(comment.content)
    setEditingCommentId(comment.id)
  }

  const handleSubmitComment = () => {
    if (!commentInput.trim()) return
    
    if (editingCommentId) {
      onEditComment?.(editingCommentId, commentInput.trim())
    } else if (commentingLine !== null) {
      onAddComment?.(commentingLine, commentInput.trim())
    }
    
    setCommentingLine(null)
    setCommentInput('')
    setEditingCommentId(null)
  }

  const handleCancelComment = () => {
    setCommentingLine(null)
    setCommentInput('')
    setEditingCommentId(null)
  }

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmitComment()
    } else if (e.key === 'Escape') {
      handleCancelComment()
    }
  }

  const lines = content.split('\n')

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-white/40 text-sm">Loading {fileName}...</div>
      </div>
    )
  }

  if (error && !content) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] gap-4">
        <div className="text-red-400 text-sm">{error}</div>
        <button
          onClick={handleReload}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white/60 flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            <span className="text-xs font-mono text-white/60">{fileName}</span>
          </div>
          {isDirty && (
            <span className="text-[10px] text-amber-500">Modified</span>
          )}
          {error && (
            <span className="text-[10px] text-red-400">{error}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isDirty && (
            <button
              onClick={handleRevert}
              className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
              title="Revert changes"
            >
              <Undo size={14} />
            </button>
          )}
          <button
            onClick={handleReload}
            className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
            title="Reload from disk"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
            title="Copy all"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`p-2 rounded transition-colors flex items-center gap-1 ${
              isDirty 
                ? 'text-blue-400 hover:bg-blue-500/10' 
                : 'text-white/20 cursor-not-allowed'
            }`}
            title="Save (⌘S)"
          >
            <Save size={14} />
            {isSaving && <span className="text-[10px]">...</span>}
          </button>
        </div>
      </div>

      {/* Editor with custom line rendering for comments */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className="absolute inset-0 flex">
          {/* Custom gutter with + buttons */}
          <div className="w-16 bg-[#0A0A0A] border-r border-white/5 overflow-y-auto shrink-0 scrollbar-hide">
            <div className="py-3">
              {lines.map((_, idx) => {
                const lineNum = idx + 1
                const hasComment = commentsByLine.has(lineNum)
                const isHovered = hoveredLine === lineNum
                
                return (
                  <div
                    key={lineNum}
                    className="h-[21px] flex items-center justify-end pr-2 relative group"
                    onMouseEnter={() => setHoveredLine(lineNum)}
                    onMouseLeave={() => setHoveredLine(null)}
                  >
                    {(isHovered || hasComment) && onAddComment && (
                      <button
                        onClick={() => handleAddComment(lineNum)}
                        className={`absolute left-1 p-0.5 rounded transition-all ${
                          hasComment 
                            ? 'text-blue-400 opacity-100' 
                            : 'text-white/30 opacity-0 group-hover:opacity-100 hover:text-blue-400'
                        }`}
                        title="Add comment for AI"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                    <span className="text-[13px] text-white/20 font-mono select-none">
                      {lineNum}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Code content with inline comments */}
          <div className="flex-1 overflow-auto">
            <div className="py-3">
              {lines.map((line, idx) => {
                const lineNum = idx + 1
                const lineComments = commentsByLine.get(lineNum) || []
                const isCommenting = commentingLine === lineNum
                
                return (
                  <div key={lineNum}>
                    {/* Code line */}
                    <pre className="h-[21px] px-4 font-mono text-[13px] text-white/90 whitespace-pre overflow-x-auto">
                      {line || ' '}
                    </pre>
                    
                    {/* Comment input */}
                    {isCommenting && (
                      <div className="mx-4 my-2 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
                        <textarea
                          autoFocus
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={handleCommentKeyDown}
                          placeholder="Add a comment for the AI"
                          className="w-full bg-transparent text-white/90 text-sm p-3 resize-none outline-none min-h-[80px]"
                        />
                        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-white/5">
                          <button
                            onClick={handleCancelComment}
                            className="px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitComment}
                            disabled={!commentInput.trim()}
                            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {editingCommentId ? 'Save' : 'Add comment'} 
                            <span className="text-white/40">⌘↵</span>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Existing comments */}
                    {!isCommenting && lineComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="mx-4 my-2 bg-[#1a1a1a] border border-white/10 rounded-lg p-3 group"
                      >
                        <p className="text-sm text-white/80 whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] text-white/30">
                            {formatTime(comment.createdAt)}
                          </span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditComment(comment)}
                              className="text-[11px] text-white/40 hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteComment?.(comment.id)}
                              className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileEditor
