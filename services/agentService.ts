// Agent service is now replaced by useChat hook from AI SDK
// See App.tsx for usage with useChat from 'ai/react'

export class AuthRequiredError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}
