// src/lib/webhooks/verify.ts
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verify WhatsApp Cloud API webhook signature.
 * Meta sends: x-hub-signature-256: sha256=<hex>
 * Uses WHATSAPP_APP_SECRET as key.
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader || !process.env.WHATSAPP_APP_SECRET) return false
  const expected =
    'sha256=' +
    createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
      .update(rawBody)
      .digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Verify HeyGen webhook signature.
 * HeyGen sends: x-heygen-signature: <hex hmac-sha256 of the raw body>
 * Uses HEYGEN_WEBHOOK_SECRET as key.
 */
export function verifyHeyGenSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.HEYGEN_WEBHOOK_SECRET?.trim()
  if (!secret || !signatureHeader) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const receivedBuffer = Buffer.from(signatureHeader.trim())
  const expectedBuffer = Buffer.from(expected)

  if (receivedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(receivedBuffer, expectedBuffer)
}

/**
 * Generic API key verification — timing-safe comparison.
 * @param header  The x-api-key header value from the request
 * @param envVarName  Name of the env var that holds the expected key
 */
export function verifyApiKey(
  header: string | null,
  envVarName: string
): boolean {
  const expected = process.env[envVarName]
  if (!header || !expected) return false
  try {
    return timingSafeEqual(
      Buffer.from(header.trim()),
      Buffer.from(expected.trim())
    )
  } catch {
    return false
  }
}
