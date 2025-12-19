"use client"

import * as React from "react"
import {
  File,
  Edit,
  Eye,
  GitBranch,
  Sparkles,
  Clock,
  Search,
  Code,
  Terminal,
  ArrowRight
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./ui/command"
import { cn } from "../lib/utils"

export type CommandCategory = "File" | "Edit" | "View" | "Git" | "AI" | "General"

export interface CommandAction {
  id: string
  name: string
  category: CommandCategory
  shortcut?: string
  icon?: React.ReactNode
  action: () => void
}

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onExecute?: (command: CommandAction) => void
  commands?: CommandAction[]
}

const defaultCommands: CommandAction[] = [
  {
    id: "new-file",
    name: "New File",
    category: "File",
    shortcut: "⌘N",
    icon: <File className="mr-2 h-4 w-4" />,
    action: () => console.log("New File"),
  },
  {
    id: "open-file",
    name: "Open File...",
    category: "File",
    shortcut: "⌘O",
    icon: <ArrowRight className="mr-2 h-4 w-4" />,
    action: () => console.log("Open File"),
  },
  {
    id: "find",
    name: "Find",
    category: "Edit",
    shortcut: "⌘F",
    icon: <Search className="mr-2 h-4 w-4" />,
    action: () => console.log("Find"),
  },
  {
    id: "replace",
    name: "Replace",
    category: "Edit",
    shortcut: "⌥⌘F",
    icon: <Edit className="mr-2 h-4 w-4" />,
    action: () => console.log("Replace"),
  },
  {
    id: "toggle-sidebar",
    name: "Toggle Sidebar",
    category: "View",
    shortcut: "⌘B",
    icon: <Eye className="mr-2 h-4 w-4" />,
    action: () => console.log("Toggle Sidebar"),
  },
  {
    id: "toggle-terminal",
    name: "Toggle Terminal",
    category: "View",
    shortcut: "⌘J",
    icon: <Terminal className="mr-2 h-4 w-4" />,
    action: () => console.log("Toggle Terminal"),
  },
  {
    id: "git-commit",
    name: "Commit",
    category: "Git",
    icon: <GitBranch className="mr-2 h-4 w-4" />,
    action: () => console.log("Git Commit"),
  },
  {
    id: "git-push",
    name: "Push",
    category: "Git",
    icon: <GitBranch className="mr-2 h-4 w-4" />,
    action: () => console.log("Git Push"),
  },
  {
    id: "ai-chat",
    name: "Ask AI",
    category: "AI",
    shortcut: "⌘L",
    icon: <Sparkles className="mr-2 h-4 w-4" />,
    action: () => console.log("Ask AI"),
  },
  {
    id: "ai-explain",
    name: "Explain Code",
    category: "AI",
    icon: <Code className="mr-2 h-4 w-4" />,
    action: () => console.log("Explain Code"),
  },
]

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span>{text}</span>
  }
  const parts = text.split(new RegExp(`(${highlight})`, "gi"))
  return (
    <span>
      {parts.map((part, i) => (
        <span
          key={i}
          className={cn(
            part.toLowerCase() === highlight.toLowerCase()
              ? "text-foreground font-bold"
              : "text-muted-foreground"
          )}
        >
          {part}
        </span>
      ))}
    </span>
  )
}

export function CommandPalette({
  isOpen,
  onClose,
  onExecute,
  commands = defaultCommands,
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState("")
  const [recentCommandIds, setRecentCommandIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!isOpen) {
      setSearch("")
    }
  }, [isOpen])

  const handleSelect = React.useCallback(
    (commandId: string) => {
      const command = commands.find((c) => c.id === commandId)
      if (command) {
        setRecentCommandIds((prev) => {
          const newRecents = [commandId, ...prev.filter((id) => id !== commandId)].slice(0, 5)
          return newRecents
        })
        
        command.action()
        onExecute?.(command)
        onClose()
      }
    },
    [commands, onClose, onExecute]
  )

  const recentCommands = recentCommandIds
    .map((id) => commands.find((c) => c.id === id))
    .filter(Boolean) as CommandAction[]
    
  const categories = Array.from(new Set(commands.map((c) => c.category)))
  
  const categoryOrder: Record<string, number> = {
    "AI": 0,
    "File": 1,
    "Edit": 2,
    "View": 3,
    "Git": 4,
  }
  
  const sortedCategories = categories.sort((a, b) => {
    const orderA = categoryOrder[a] ?? 99
    const orderB = categoryOrder[b] ?? 99
    return orderA - orderB
  })

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {!search && recentCommands.length > 0 && (
          <CommandGroup heading="Recent">
            {recentCommands.map((command) => (
              <CommandItem
                key={`recent-${command.id}`}
                value={`recent ${command.name}`}
                onSelect={() => handleSelect(command.id)}
              >
                <Clock className="mr-2 h-4 w-4" />
                <span>{command.name}</span>
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {sortedCategories.map((category) => {
          const categoryCommands = commands.filter((c) => c.category === category)
          if (categoryCommands.length === 0) return null

          return (
            <React.Fragment key={category}>
              <CommandGroup heading={category}>
                {categoryCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.name}
                    onSelect={() => handleSelect(command.id)}
                  >
                    {command.icon}
                    <HighlightedText text={command.name} highlight={search} />
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </React.Fragment>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
