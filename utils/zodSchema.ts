import { z } from 'zod';

export function normalizeToJsonSchema(schema: any): Record<string, unknown> {
  if (!schema) return { type: 'object', properties: {} };
  
  // If it's a Zod schema (has _def)
  if (schema._def) {
    // Basic conversion for ZodObject
    if (schema instanceof z.ZodObject) {
       const shape = schema.shape;
       const properties: Record<string, unknown> = {};
       const required: string[] = [];
       
       for (const key in shape) {
         const field = shape[key];
         // This is a simplification. Ideally use zod-to-json-schema
         properties[key] = { type: 'string' }; 
         if (!field.isOptional()) {
           required.push(key);
         }
       }
       return { type: 'object', properties, required: required.length > 0 ? required : undefined };
    }
    return { type: 'object', properties: {} };
  }
  
  return schema;
}
