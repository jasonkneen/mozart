import React from 'react'
import { Check, Copy } from 'lucide-react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atelierSulphurpoolDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'

interface CodeBlockProps {
  code: string
  language: string
  onCopy?: () => void
  isCopied?: boolean
  isDarkMode?: boolean
  className?: string
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onCopy, isCopied, isDarkMode, className }) => {
  const handleCopy = () => {
    if (onCopy) {
      onCopy()
    } else {
      navigator.clipboard.writeText(code)
    }
  }

  return (
    <div className={`bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden my-3 group ${className || ''}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        <span className="text-xs text-white/40 font-mono uppercase tracking-wide">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
        >
          {isCopied ? (
            <><Check size={14} /><span>Copied</span></>
          ) : (
            <><Copy size={14} /><span>Copy</span></>
          )}
        </button>
      </div>
      <div className="overflow-x-auto max-h-[600px]">
        <SyntaxHighlighter
          language={language || 'text'}
          style={atelierSulphurpoolDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '13px',
            lineHeight: '1.5',
            backgroundColor: 'transparent',
          }}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
