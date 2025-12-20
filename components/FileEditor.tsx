import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Copy, Check, RefreshCw, Undo } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { sql } from '@codemirror/lang-sql'
import { rust } from '@codemirror/lang-rust'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { php } from '@codemirror/lang-php'
import { xml } from '@codemirror/lang-xml'

interface FileEditorProps {
  filePath: string
  workspacePath?: string
  language?: string
  onSave?: (content: string) => Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
  onSaveComplete?: () => void
}

function getLanguageExtension(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return javascript({ jsx: true })
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: true })
    case 'py':
    case 'pyw':
      return python()
    case 'html':
    case 'htm':
      return html()
    case 'css':
    case 'scss':
    case 'less':
      return css()
    case 'json':
      return json()
    case 'md':
    case 'mdx':
    case 'markdown':
      return markdown()
    case 'sql':
      return sql()
    case 'rs':
      return rust()
    case 'c':
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
      return cpp()
    case 'java':
      return java()
    case 'php':
      return php()
    case 'xml':
    case 'svg':
    case 'xhtml':
      return xml()
    default:
      return javascript()
  }
}

const FileEditor = ({
  filePath,
  workspacePath,
  language,
  onSave,
  onDirtyChange,
  onSaveComplete,
}: FileEditorProps) => {
  const [content, setContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const onDirtyChangeRef = useRef(onDirtyChange)
  onDirtyChangeRef.current = onDirtyChange

  const fileName = filePath.split('/').pop() || filePath
  const isDirty = content !== originalContent

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty)
  }, [isDirty])

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

  const langExtension = getLanguageExtension(fileName)

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

      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          value={content}
          onChange={setContent}
          theme={oneDark}
          extensions={[langExtension]}
          height="100%"
          className="h-full text-[13px]"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
            searchKeymap: true,
          }}
        />
      </div>
    </div>
  )
}

export default FileEditor
