// GET /api/openapi — serves the OpenAPI 3.1 specification for Nexus API.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Nexus API',
    version: '1.0.0',
    description: 'Unite-Group Nexus — Mission Control platform API',
  },
  servers: [
    { url: '/api', description: 'Nexus API' },
  ],
  paths: {
    '/work': {
      post: {
        summary: 'Ingest plain-English work description',
        description:
          'Accepts a natural-language work description and classifies it by target system ' +
          '(RestoreAssist, Synthex, Nexus) and work type (bug, feature, infra) using an LLM classifier.',
        operationId: 'ingestWork',
        tags: ['Work Ingestion'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/WorkIngestionRequest',
              },
              examples: {
                synthexBug: {
                  summary: 'Synthex scheduling bug',
                  value: {
                    description: "The social media scheduler isn't posting to Instagram at the scheduled time",
                  },
                },
                nexusFeature: {
                  summary: 'Nexus dashboard feature',
                  value: {
                    description: 'We need a new dashboard showing monthly recurring revenue trends',
                    context: 'Should integrate with Xero data already in the system',
                  },
                },
                restoreAssistFeature: {
                  summary: 'RestoreAssist backup feature',
                  value: {
                    description: 'Add support for automatic backup encryption for client disaster recovery cases',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Work classified successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WorkIngestionResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid request body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorised — valid session required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Classification service error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
        security: [{ cookieAuth: [] }],
      },
    },
  },
  components: {
    schemas: {
      WorkIngestionRequest: {
        type: 'object',
        required: ['description'],
        properties: {
          description: {
            type: 'string',
            description: 'Plain-English description of the work to be done',
            maxLength: 4000,
            example: "The social media scheduler isn't posting to Instagram at the scheduled time",
          },
          context: {
            type: 'string',
            description: 'Optional additional context to improve classification accuracy',
            example: 'This started happening after the last deployment on Friday',
          },
        },
      },
      WorkIntent: {
        type: 'object',
        required: ['system', 'workType'],
        properties: {
          system: {
            type: 'string',
            enum: ['RestoreAssist', 'Synthex', 'Nexus'],
            description: 'Target portfolio system for the work item',
          },
          workType: {
            type: 'string',
            enum: ['bug', 'feature', 'infra'],
            description: 'Category of work',
          },
        },
      },
      WorkIngestionResponse: {
        type: 'object',
        required: ['intent', 'confidence', 'suggestedTitle'],
        properties: {
          intent: {
            $ref: '#/components/schemas/WorkIntent',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Classifier confidence score (0 = uncertain, 1 = very confident)',
            example: 0.95,
          },
          suggestedTitle: {
            type: 'string',
            description: 'AI-generated concise action-oriented title for the work item',
            maxLength: 80,
            example: 'Fix Instagram post scheduling failure',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'string',
            description: 'Human-readable error message',
          },
        },
      },
    },
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-access-token',
        description: 'Supabase session cookie — set automatically on sign-in',
      },
    },
  },
}

export function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
