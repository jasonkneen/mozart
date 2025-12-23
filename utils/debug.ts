export const debugLog = {
  aiChat: {
    log: (...args: any[]) => console.log('[AI Chat]', ...args),
    warn: (...args: any[]) => console.warn('[AI Chat]', ...args),
    error: (...args: any[]) => console.error('[AI Chat]', ...args),
  },
  liveGemini: {
    log: (...args: any[]) => console.log('[Live Gemini]', ...args),
    warn: (...args: any[]) => console.warn('[Live Gemini]', ...args),
    error: (...args: any[]) => console.error('[Live Gemini]', ...args),
  },
  general: {
    log: (...args: any[]) => console.log('[General]', ...args),
    warn: (...args: any[]) => console.warn('[General]', ...args),
    error: (...args: any[]) => console.error('[General]', ...args),
  },
};
