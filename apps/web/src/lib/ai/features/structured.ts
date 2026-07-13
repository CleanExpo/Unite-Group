// src/lib/ai/features/structured.ts
// Zod-to-tool_use schema conversion and structured response parsing.

import { z, type ZodType, type ZodObject, type ZodRawShape } from 'zod'

// ── Types ───────────────────────────────────────────────────────────────────

interface JsonSchemaProperty {
  type: string
  minimum?: number
  maximum?: number
  items?: JsonSchemaProperty
  enum?: string[]
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}

interface ToolInputSchema {
  type: 'object'
  properties: Record<string, JsonSchemaProperty>
  required: string[]
}

interface ToolSchema {
  name: string
  description?: string
  input_schema: ToolInputSchema
}

// ── JSON Schema shaping ─────────────────────────────────────────────────────

const PROPERTY_KEYS = ['type', 'minimum', 'maximum', 'items', 'enum', 'properties', 'required'] as const

/**
 * Reduce a z.toJSONSchema() node to the minimal property shape Anthropic
 * tool_use input_schema expects, dropping metadata keys ($schema,
 * additionalProperties, description, …) recursively.
 */
function pruneToProperty(node: unknown): JsonSchemaProperty {
  const source = (node ?? {}) as Record<string, unknown>
  const prop: Record<string, unknown> = {}

  for (const key of PROPERTY_KEYS) {
    if (!(key in source) || source[key] === undefined) continue
    if (key === 'items') {
      prop.items = pruneToProperty(source.items)
    } else if (key === 'properties') {
      const nested: Record<string, JsonSchemaProperty> = {}
      for (const [name, value] of Object.entries(source.properties as Record<string, unknown>)) {
        nested[name] = pruneToProperty(value)
      }
      prop.properties = nested
    } else {
      prop[key] = source[key]
    }
  }

  return prop as unknown as JsonSchemaProperty
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert a Zod object schema to an Anthropic tool_use input_schema definition.
 */
export function zodToToolSchema(
  toolName: string,
  schema: ZodObject<ZodRawShape>,
  description?: string
): ToolSchema {
  const jsonSchema = pruneToProperty(z.toJSONSchema(schema))

  const tool: ToolSchema = {
    name: toolName,
    input_schema: {
      type: 'object',
      properties: jsonSchema.properties ?? {},
      required: jsonSchema.required ?? [],
    },
  }

  if (description) {
    tool.description = description
  }

  return tool
}

/**
 * Parse a structured response from Anthropic content blocks.
 * Finds the tool_use block matching toolName and validates with the Zod schema.
 */
export function parseStructuredResponse<T>(
  responseBlocks: unknown[],
  toolName: string,
  schema: ZodType<T>
): T {
  const toolBlock = responseBlocks.find((block) => {
    const b = block as Record<string, unknown>
    return b.type === 'tool_use' && b.name === toolName
  }) as Record<string, unknown> | undefined

  if (!toolBlock) {
    throw new Error(`tool_use block for "${toolName}" not found in response`)
  }

  return schema.parse(toolBlock.input)
}
