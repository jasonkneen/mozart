import * as React from "react"
import { Brain, Sparkles, Zap, ChevronDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"

export type ModelProvider = 'anthropic' | 'openai' | 'google'

export interface Model {
  id: string
  name: string
  provider: ModelProvider
  badge?: 'Fast' | 'Smart' | 'Balanced'
  description?: string
}

export const models: Model[] = [
  { id: 'claude-sonnet-4-5', name: 'Sonnet 4.5', provider: 'anthropic', badge: 'Smart' },
  { id: 'claude-opus-4-5', name: 'Opus 4.5', provider: 'anthropic', badge: 'Balanced' },
  { id: 'claude-haiku-4-5', name: 'Haiku 4.5', provider: 'anthropic', badge: 'Fast' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', badge: 'Fast' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', badge: 'Smart' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', badge: 'Balanced' },
]

export const providerIcons: Record<ModelProvider, any> = {
  anthropic: Sparkles,
  openai: Zap,
  google: Brain,
}

export const providerLabels: Record<ModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
}

interface ModelSelectorProps {
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  className?: string
}

export default function ModelSelector({
  selectedModel = models[0].id,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const currentModel = models.find((m) => m.id === selectedModel) || models[0]
  const Icon = providerIcons[currentModel.provider]

  const groupedModels = React.useMemo(() => {
    const groups: Partial<Record<ModelProvider, Model[]>> = {}
    models.forEach((model) => {
      if (!groups[model.provider]) {
        groups[model.provider] = []
      }
      groups[model.provider]!.push(model)
    })
    return groups
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-2 px-3 text-white/60 hover:text-white hover:bg-white/5 transition-colors rounded-lg border border-white/10",
            className
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{currentModel.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]" align="start" side="top">
        <DropdownMenuRadioGroup
          value={selectedModel}
          onValueChange={onModelChange}
        >
          {(Object.keys(groupedModels) as ModelProvider[]).map((provider, idx) => (
            <React.Fragment key={provider}>
              <DropdownMenuLabel className="text-[10px] font-semibold text-white/40 uppercase tracking-wider pt-3 pb-1 bg-white/[0.02]">
                {providerLabels[provider]}
              </DropdownMenuLabel>
              {groupedModels[provider]?.map((model) => {
                const ModelIcon = providerIcons[model.provider]
                const isSelected = selectedModel === model.id
                return (
                  <DropdownMenuRadioItem
                    key={model.id}
                    value={model.id}
                    className="py-2"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <ModelIcon className="h-4 w-4 text-white/40 shrink-0" />
                      <span className="flex-1 text-left">{model.name}</span>
                      {model.badge && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold uppercase">
                          {model.badge}
                        </Badge>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-white/60 shrink-0" />}
                    </div>
                  </DropdownMenuRadioItem>
                )
              })}
              {idx < Object.keys(groupedModels).length - 1 && (
                <DropdownMenuSeparator className="my-1 opacity-50" />
              )}
            </React.Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
