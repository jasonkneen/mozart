export const createAudioBlob = (data: any) => new Blob([data]);
export const base64ToArrayBuffer = (base64: string) => new ArrayBuffer(0);
export const pcmToAudioBuffer = async (data: any, ctx: any, rate: number) => ctx.createBuffer(1, 1, rate);
