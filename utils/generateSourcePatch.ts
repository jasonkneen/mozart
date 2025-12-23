export interface GenerateSourcePatchParams {
  element?: any;
  cssChanges?: any;
  textChange?: any;
  srcChange?: any;
  userRequest?: any;
}
export interface SourcePatch {}
export const generateSourcePatch = (params: GenerateSourcePatchParams, source?: string) => source || '';
