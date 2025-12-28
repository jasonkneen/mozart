import React, { useState } from 'react'
import { ChevronDown, Check, Sparkles, Zap } from 'lucide-react'
import clsx from 'clsx'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const modelGroups = [
  {
    name: 'Claude Code',
    icon: Sparkles,
    models: [
      { id: 'opus', name: 'Opus 4.5', desc: 'Most capable' },
      { id: 'sonnet', name: 'Sonnet 4.5', desc: 'Balanced' },
      { id: 'haiku', name: 'Haiku 4.5', desc: 'Fast & efficient' },
    ]
  },
  {
    name: 'Codex',
    icon: Zap,
    models: [
      { id: 'gpt-5.2-codex', name: 'GPT-5.2-Codex', desc: 'Latest', isNew: true },
      { id: 'gpt-5.2', name: 'GPT-5.2', desc: 'Standard' },
      { id: 'gpt-5.1-codex-max', name: 'GPT-5.1-Codex-Max', desc: 'Extended context' },
    ]
  }
]

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const allModels = modelGroups.flatMap(g => g.models)
  const current = allModels.find(m => m.id === selectedModel) || modelGroups[0].models[1]
  const currentGroup = modelGroups.find(g => g.models.some(m => m.id === selectedModel)) || modelGroups[0]
  const GroupIcon = currentGroup.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs text-white/60 hover:text-white/80"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Selected model: ${current.name}`}
      >
        <GroupIcon size={14} />
        <span>{current.name}</span>
        <ChevronDown size={12} className={clsx('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div 
          className="absolute bottom-full mb-2 left-0 bg-elevated border border-default rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px]"
          role="listbox"
          aria-label="Select model"
        >
          {modelGroups.map((group, groupIdx) => (
            <div key={group.name}>
              <div className="px-3 py-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider bg-white/[0.02]">
                {group.name}
              </div>
              {group.models.map(model => (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={selectedModel === model.id}
                  onClick={() => {
                    onModelChange(model.id)
                    setIsOpen(false)
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                    selectedModel === model.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  <group.icon size={14} className="shrink-0 text-white/40" />
                  <span className="flex-1 text-left">{model.name}</span>
                  {model.isNew && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400 rounded">New</span>
                  )}
                  {selectedModel === model.id && <Check size={14} className="text-white/60" />}
                </button>
              ))}
              {groupIdx < modelGroups.length - 1 && <div className="border-t border-white/5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ModelSelector
