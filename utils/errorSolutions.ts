export const parseError = (error: any) => ({ message: String(error), category: 'unknown' as const, isKnownError: false });
export const getCachedSolution = (error: any) => null;
export const cacheSolution = (error: any, solution: any, query: any) => {};
export const generateSearchQuery = (error: any) => '';
export const createErrorDebouncer = (ms: number) => (message: string) => true;
export const getErrorIcon = (error: any) => null;
export const isCriticalError = (error: any) => false;
