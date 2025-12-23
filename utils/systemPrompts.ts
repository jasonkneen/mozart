export type PromptMode = 'dom_edit' | 'default';

export function getSystemPrompt(mode: PromptMode, context: any): string {
  return '';
}

export function getPromptModeForIntent(intent: string, hasElement: boolean): PromptMode {
  return 'default';
}
