import { z } from 'zod';

export function jsonSchemaToZod(schema: any, zodInstance: typeof z = z): z.ZodTypeAny {
  if (!schema) return zodInstance.any();

  if (schema.type === 'string') {
    return zodInstance.string();
  }
  
  if (schema.type === 'number' || schema.type === 'integer') {
    return zodInstance.number();
  }
  
  if (schema.type === 'boolean') {
    return zodInstance.boolean();
  }
  
  if (schema.type === 'array') {
    const itemSchema = schema.items ? jsonSchemaToZod(schema.items, zodInstance) : zodInstance.any();
    return zodInstance.array(itemSchema);
  }
  
  if (schema.type === 'object') {
    const shape: Record<string, any> = {};
    if (schema.properties) {
      for (const key in schema.properties) {
        const propSchema = schema.properties[key];
        let zodProp = jsonSchemaToZod(propSchema, zodInstance);
        
        // Handle optional fields
        if (!schema.required || !schema.required.includes(key)) {
          zodProp = zodProp.optional();
        }
        
        shape[key] = zodProp;
      }
    }
    // Allow unknown keys if additionalProperties is not false (default is true in JSON schema)
    const objectSchema = zodInstance.object(shape);
    return schema.additionalProperties === false ? objectSchema.strict() : objectSchema.passthrough();
  }

  return zodInstance.any();
}
