import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Save, Copy, Check, RefreshCw, Undo, ZoomIn, ZoomOut, Eye, Code, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, WrapText } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'
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
import ReactMarkdown from 'react-markdown'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei'

// Word wrap preferences storage per file extension
const WORD_WRAP_STORAGE_KEY = 'mozart-word-wrap-prefs'

function getWordWrapPrefs(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(WORD_WRAP_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setWordWrapPref(ext: string, enabled: boolean): void {
  const prefs = getWordWrapPrefs()
  prefs[ext] = enabled
  localStorage.setItem(WORD_WRAP_STORAGE_KEY, JSON.stringify(prefs))
}

function getWordWrapForExt(ext: string): boolean {
  const prefs = getWordWrapPrefs()
  // Default: wrap for markdown, prose files; no wrap for code
  const defaultWrap = ['md', 'mdx', 'markdown', 'txt', 'json'].includes(ext)
  return prefs[ext] ?? defaultWrap
}

interface FileEditorProps {
  filePath: string
  workspacePath?: string
  language?: string
  onSave?: (content: string) => Promise<void>
  onDirtyChange?: (isDirty: boolean) => void
  onSaveComplete?: () => void
}

type FileType = 'code' | 'image' | 'audio' | 'video' | '3d' | 'pdf' | 'docx' | 'markdown'

function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image'
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio'
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
  if (['glb', 'gltf'].includes(ext)) return '3d'
  if (ext === 'pdf') return 'pdf'
  if (['docx', 'doc'].includes(ext)) return 'docx'
  if (['md', 'mdx', 'markdown'].includes(ext)) return 'markdown'

  return 'code'
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

// 3D Model Viewer Component
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function ThreeDViewer({ blobUrl }: { blobUrl: string }) {
  return (
    <div className="flex-1 bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0f]">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Suspense fallback={null}>
          <Center>
            <Model url={blobUrl} />
          </Center>
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  )
}

// Image Viewer Component
function ImageViewer({ blobUrl, fileName }: { blobUrl: string; fileName: string }) {
  const [zoom, setZoom] = useState(1)

  return (
    <div className="flex-1 flex flex-col bg-surface">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <button
          onClick={() => setZoom(z => Math.max(0.1, z - 0.25))}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-white/40 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(5, z + 0.25))}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-auto p-8">
        <img
          src={blobUrl}
          alt={fileName}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          className="max-w-full max-h-full object-contain transition-transform shadow-2xl rounded-lg"
        />
      </div>
    </div>
  )
}

// Audio Player Component
function AudioPlayer({ blobUrl, fileName }: { blobUrl: string; fileName: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0f] gap-8">
      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center shadow-2xl border border-white/10">
        <Volume2 size={64} className="text-white/40" />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-medium text-white/80">{fileName}</h3>
        <p className="text-sm text-white/40 mt-1">{formatTime(currentTime)} / {formatTime(duration)}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          onClick={togglePlay}
          className="p-4 bg-blue-500 hover:bg-blue-600 rounded-full text-white shadow-lg"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={(e) => {
          if (audioRef.current) {
            audioRef.current.currentTime = Number(e.target.value)
          }
        }}
        className="w-80 accent-blue-500"
      />

      <audio
        ref={audioRef}
        src={blobUrl}
        muted={isMuted}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}

// Video Player Component
function VideoPlayer({ blobUrl, fileName }: { blobUrl: string; fileName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-black">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <button
          onClick={togglePlay}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <span className="text-xs text-white/60 flex-1">{fileName}</span>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded"
        >
          <Maximize size={16} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          src={blobUrl}
          controls
          className="max-w-full max-h-full"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </div>
  )
}

// PDF Viewer Component
function PDFViewer({ blobUrl }: { blobUrl: string }) {
  return (
    <div className="flex-1 flex flex-col bg-overlay">
      <embed
        src={blobUrl}
        type="application/pdf"
        className="flex-1 w-full"
      />
    </div>
  )
}

// DOCX Viewer Component
function DOCXViewer({ blobUrl, fileName }: { blobUrl: string; fileName: string }) {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDocx = async () => {
      try {
        const mammoth = await import('mammoth')
        const response = await fetch(blobUrl)
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        setHtmlContent(result.value)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }
    loadDocx()
  }, [blobUrl])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-gray-500">Loading document...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white overflow-auto">
      <div
        className="max-w-3xl mx-auto p-8 prose prose-sm"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}

// Markdown Viewer Component
function MarkdownViewer({
  content,
  onChange,
  isDirty,
  onSave,
  isSaving,
  fileName
}: {
  content: string
  onChange: (value: string) => void
  isDirty: boolean
  onSave: () => void
  isSaving: boolean
  fileName: string
}) {
  const [showPreview, setShowPreview] = useState(true)
  const langExtension = getLanguageExtension(fileName)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <button
          onClick={() => setShowPreview(false)}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
            !showPreview ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          <Code size={14} />
          Raw
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
            showPreview ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          <Eye size={14} />
          Preview
        </button>
        <div className="flex-1" />
        {isDirty && (
          <span className="text-xs text-amber-500">Modified</span>
        )}
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${
            isDirty ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'text-white/20 cursor-not-allowed'
          }`}
        >
          <Save size={14} />
          Save
        </button>
      </div>

      {showPreview ? (
        <div className="flex-1 overflow-auto bg-elevated p-8">
          <div className="max-w-3xl mx-auto prose prose-invert prose-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CodeMirror
            value={content}
            onChange={onChange}
            theme={oneDark}
            extensions={[langExtension]}
            height="100%"
            className="h-full text-[13px]"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightActiveLine: true,
              foldGutter: true,
            }}
          />
        </div>
      )}
    </div>
  )
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const onDirtyChangeRef = useRef(onDirtyChange)
  onDirtyChangeRef.current = onDirtyChange

  const fileName = filePath.split('/').pop() || filePath
  const fileType = getFileType(fileName)
  const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
  const isDirty = content !== originalContent

  // Word wrap state - initialized from saved preferences per file type
  const [wordWrap, setWordWrap] = useState(() => getWordWrapForExt(fileExt))

  const toggleWordWrap = useCallback(() => {
    setWordWrap(prev => {
      const newValue = !prev
      setWordWrapPref(fileExt, newValue)
      return newValue
    })
  }, [fileExt])

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty)
  }, [isDirty])

  const getFullPath = useCallback(() => {
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    return workspacePath ? `${workspacePath}/${cleanPath}` : filePath
  }, [filePath, workspacePath])

  // Load file based on type
  useEffect(() => {
    const loadFile = async () => {
      setIsLoading(true)
      setError(null)

      const fullPath = getFullPath()

      // For binary files, fetch as blob
      if (['image', 'audio', 'video', '3d', 'pdf', 'docx'].includes(fileType)) {
        try {
          const response = await fetch(`/api/file/binary?path=${encodeURIComponent(fullPath)}`)
          if (!response.ok) throw new Error('Failed to load file')
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          setBlobUrl(url)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load file')
        } finally {
          setIsLoading(false)
        }
        return
      }

      // For text files
      try {
        const response = await fetch(`/api/file?path=${encodeURIComponent(fullPath)}`)
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

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [getFullPath, fileType])

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="text-white/40 text-sm">Loading {fileName}...</div>
      </div>
    )
  }

  if (error && !content && !blobUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface gap-4">
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

  // Render based on file type
  if (fileType === 'image' && blobUrl) {
    return <ImageViewer blobUrl={blobUrl} fileName={fileName} />
  }

  if (fileType === 'audio' && blobUrl) {
    return <AudioPlayer blobUrl={blobUrl} fileName={fileName} />
  }

  if (fileType === 'video' && blobUrl) {
    return <VideoPlayer blobUrl={blobUrl} fileName={fileName} />
  }

  if (fileType === '3d' && blobUrl) {
    return <ThreeDViewer blobUrl={blobUrl} />
  }

  if (fileType === 'pdf' && blobUrl) {
    return <PDFViewer blobUrl={blobUrl} />
  }

  if (fileType === 'docx' && blobUrl) {
    return <DOCXViewer blobUrl={blobUrl} fileName={fileName} />
  }

  if (fileType === 'markdown') {
    return (
      <MarkdownViewer
        content={content}
        onChange={setContent}
        isDirty={isDirty}
        onSave={handleSave}
        isSaving={isSaving}
        fileName={fileName}
      />
    )
  }

  // Default: Code editor
  const langExtension = getLanguageExtension(fileName)

  // Build extensions array with optional word wrap
  const extensions: Extension[] = [langExtension]
  if (wordWrap) {
    extensions.push(EditorView.lineWrapping)
  }

  return (
    <div className="flex-1 flex flex-col bg-surface min-h-0">
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
          <button
            onClick={toggleWordWrap}
            className={`p-2 rounded transition-colors ${
              wordWrap
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
            title={`Word wrap: ${wordWrap ? 'On' : 'Off'}`}
          >
            <WrapText size={14} />
          </button>
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
          key={`${filePath}-${wordWrap}`}
          value={content}
          onChange={setContent}
          theme={oneDark}
          extensions={extensions}
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
