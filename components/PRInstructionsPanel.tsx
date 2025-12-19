import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitPullRequest, 
  Users, 
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import { CheckedState } from '@radix-ui/react-checkbox';

export interface PRInstructionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PRData) => void;
  defaultTitle?: string;
  defaultDescription?: string;
}

export interface PRData {
  title: string;
  description: string;
  isDraft: boolean;
  autoMerge: boolean;
  reviewers: string[];
}

const TEMPLATES = [
  { 
    id: 'feature', 
    name: '✨ New Feature', 
    title: 'feat: ', 
    description: '## Summary\n- Implemented [feature name]\n- Added unit tests\n\n## Motivation\nAllows users to...'
  },
  { 
    id: 'fix', 
    name: '🐛 Bug Fix', 
    title: 'fix: ', 
    description: '## Summary\n- Fixed issue where...\n\n## Reproduction\n1. Go to...\n2. Click...'
  },
  { 
    id: 'refactor', 
    name: '♻️ Refactor', 
    title: 'refactor: ', 
    description: '## Summary\n- Refactored [module]\n- Improved performance by...'
  }
];

export function PRInstructionsPanel({ 
  isOpen, 
  onClose, 
  onSubmit, 
  defaultTitle = '', 
  defaultDescription = '' 
}: PRInstructionsPanelProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [isDraft, setIsDraft] = useState(false);
  const [autoMerge, setAutoMerge] = useState(false);
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [reviewerInput, setReviewerInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (defaultTitle) setTitle(defaultTitle);
    if (defaultDescription) setDescription(defaultDescription);
  }, [defaultTitle, defaultDescription]);

  const handleReviewerAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && reviewerInput.trim()) {
      e.preventDefault();
      if (!reviewers.includes(reviewerInput.trim())) {
        setReviewers([...reviewers, reviewerInput.trim()]);
      }
      setReviewerInput('');
    }
  };

  const removeReviewer = (rev: string) => {
    setReviewers(reviewers.filter(r => r !== rev));
  };

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      if (!title || TEMPLATES.some(t => title.startsWith(t.title))) {
        setTitle(template.title);
      }
      if (!description) {
        setDescription(template.description);
      }
    }
  };

  const handleSubmit = () => {
    onSubmit({
      title,
      description,
      isDraft,
      autoMerge,
      reviewers
    });
    onClose();
  };

  if (!isVisible && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      <div 
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      <div 
        className={cn(
          "relative w-full max-w-lg h-full bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-none">Create Pull Request</h2>
              <p className="text-xs text-muted-foreground mt-1">Configure your PR details</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Templates</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map(t => (
                  <Button
                    key={t.id}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-background hover:bg-muted border-dashed"
                    onClick={() => applyTemplate(t.id)}
                  >
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-title">Title</Label>
              <Input
                id="pr-title"
                placeholder="feat: Add new dashboard component"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                className="font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-desc" className="flex justify-between items-center">
                <span>Description</span>
                <span className="text-xs text-muted-foreground font-normal">Markdown supported</span>
              </Label>
              <Textarea
                id="pr-desc"
                placeholder="Describe your changes..."
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="min-h-[200px] resize-none font-mono text-sm leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Reviewers
              </Label>
              <div className="min-h-[42px] p-1.5 rounded-md border border-input bg-background flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
                {reviewers.map(rev => (
                  <Badge key={rev} variant="secondary" className="flex items-center gap-1 h-7 pl-2 pr-1 font-normal">
                    {rev}
                    <button 
                      onClick={() => removeReviewer(rev)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  className="flex-1 bg-transparent border-none outline-none h-7 min-w-[120px] px-1 text-sm placeholder:text-muted-foreground"
                  placeholder="Add reviewer (Enter)..."
                  value={reviewerInput}
                  onChange={(e) => setReviewerInput(e.target.value)}
                  onKeyDown={handleReviewerAdd}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-border">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Options</Label>
              
              <div className="flex items-start space-x-3 p-3 rounded-md border border-input bg-background/50 hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => setIsDraft(!isDraft)}>
                <Checkbox 
                  id="draft-mode" 
                  checked={isDraft}
                  onCheckedChange={(c: CheckedState) => setIsDraft(!!c)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="draft-mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Draft Pull Request
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Create as a draft. It won't be mergeable until marked ready.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-md border border-input bg-background/50 hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => setAutoMerge(!autoMerge)}>
                <Checkbox 
                  id="auto-merge" 
                  checked={autoMerge} 
                  onCheckedChange={(c: CheckedState) => setAutoMerge(!!c)}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="auto-merge"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Auto-merge
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Automatically merge when all checks pass and requirements are met.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border bg-background flex items-center justify-between gap-4">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="w-full gap-2 relative group overflow-hidden">
            {isDraft ? <FileText className="w-4 h-4" /> : <GitPullRequest className="w-4 h-4" />}
            <span className="relative z-10">Create {isDraft ? 'Draft' : 'PR'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </Button>
        </div>
      </div>
    </div>
  );
}
