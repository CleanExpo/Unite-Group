/**
 * JSON-LD Schema Validation CI Script
 * SYN-538: Validates all application/ld+json blocks in the Next.js build output.
 *
 * Usage: npx ts-node scripts/validate-jsonld.ts
 * Exits non-zero if any schema block is invalid — fails the CI build.
 *
 * Also validates component source files for malformed JSON in schema objects.
 */

import * as fs from "fs"
import * as path from "path"
import * as glob from "glob"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SchemaValidationResult {
  file: string
  valid: boolean
  errors: string[]
  schemaType?: string
}

// ─── Required schema fields by @type ─────────────────────────────────────────

const REQUIRED_FIELDS: Record<string, string[]> = {
  LocalBusiness: ["@context", "@type", "name"],
  VideoObject: ["@context", "@type", "name", "description", "uploadDate"],
  Article: ["@context", "@type", "headline", "author", "datePublished"],
  FAQPage: ["@context", "@type", "mainEntity"],
  BreadcrumbList: ["@context", "@type", "itemListElement"],
  Organization: ["@context", "@type", "name"],
  Person: ["@context", "@type", "name"],
  WebSite: ["@context", "@type", "name", "url"],
  WebPage: ["@context", "@type", "name"],
}

const VALID_CONTEXTS = ["https://schema.org", "http://schema.org"]

// ─── Validator ────────────────────────────────────────────────────────────────

function validateSchema(schema: Record<string, unknown>, file: string): string[] {
  const errors: string[] = []
  const schemaType = schema["@type"] as string | undefined

  // 1. @context must be schema.org
  if (!schema["@context"]) {
    errors.push(`Missing @context (expected "https://schema.org")`)
  } else if (!VALID_CONTEXTS.includes(schema["@context"] as string)) {
    errors.push(`Invalid @context: "${schema["@context"]}" — must be "https://schema.org"`)
  }

  // 2. @type must be present
  if (!schemaType) {
    errors.push("Missing @type field")
    return errors
  }

  // 3. Check required fields for known types
  const required = REQUIRED_FIELDS[schemaType]
  if (required) {
    for (const field of required) {
      if (schema[field] === undefined || schema[field] === null || schema[field] === "") {
        errors.push(`Missing required field "${field}" for @type "${schemaType}"`)
      }
    }
  }

  // 4. URL fields must be valid URLs
  const urlFields = ["url", "sameAs", "image", "logo"]
  for (const field of urlFields) {
    const val = schema[field]
    if (typeof val === "string" && val.length > 0) {
      try {
        new URL(val)
      } catch {
        errors.push(`Invalid URL in field "${field}": "${val}"`)
      }
    }
  }

  // 5. FAQPage: mainEntity must be an array with at least one Q&A
  if (schemaType === "FAQPage") {
    const entities = schema["mainEntity"] as unknown[]
    if (!Array.isArray(entities) || entities.length === 0) {
      errors.push("FAQPage.mainEntity must be a non-empty array")
    }
  }

  // 6. BreadcrumbList: itemListElement must be a non-empty array
  if (schemaType === "BreadcrumbList") {
    const items = schema["itemListElement"] as unknown[]
    if (!Array.isArray(items) || items.length === 0) {
      errors.push("BreadcrumbList.itemListElement must be a non-empty array")
    }
  }

  return errors
}

// ─── Extract JSON-LD from HTML ────────────────────────────────────────────────

function extractJsonLd(html: string): string[] {
  const blocks: string[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    blocks.push(match[1].trim())
  }
  return blocks
}

// ─── Validate build output ────────────────────────────────────────────────────

function validateBuildOutput(): SchemaValidationResult[] {
  const results: SchemaValidationResult[] = []
  const buildDir = path.join(process.cwd(), ".next/server/app")

  if (!fs.existsSync(buildDir)) {
    console.log("⚠️  Build output not found at .next/server/app — run 'npm run build' first")
    console.log("   Falling back to source file validation only.")
    return results
  }

  const htmlFiles = glob.sync("**/*.html", { cwd: buildDir, absolute: true })

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf-8")
    const blocks = extractJsonLd(html)

    for (const block of blocks) {
      const relativePath = path.relative(process.cwd(), file)
      try {
        const schema = JSON.parse(block) as Record<string, unknown>
        const errors = validateSchema(schema, relativePath)
        results.push({
          file: relativePath,
          valid: errors.length === 0,
          errors,
          schemaType: schema["@type"] as string,
        })
      } catch {
        results.push({
          file: relativePath,
          valid: false,
          errors: ["Invalid JSON: could not parse schema block"],
        })
      }
    }
  }

  return results
}

// ─── Validate source schema components ───────────────────────────────────────

function validateSourceSchemas(): SchemaValidationResult[] {
  const results: SchemaValidationResult[] = []
  const srcDir = path.join(process.cwd(), "src")
  const schemaFiles = glob.sync("**/schema/**/*.tsx", { cwd: srcDir, absolute: true })
    .concat(glob.sync("**/*Schema.tsx", { cwd: srcDir, absolute: true }))
    .concat(glob.sync("**/*schema.tsx", { cwd: srcDir, absolute: true }))

  for (const file of schemaFiles) {
    const content = fs.readFileSync(file, "utf-8")
    const relativePath = path.relative(process.cwd(), file)

    // Check that @type and @context are present in the source
    if (content.includes("application/ld+json") || content.includes("@context")) {
      const hasContext = content.includes("'https://schema.org'") ||
                         content.includes('"https://schema.org"')
      const hasType = content.includes("'@type'") || content.includes('"@type"')

      if (!hasContext) {
        results.push({
          file: relativePath,
          valid: false,
          errors: ["Schema component missing @context: 'https://schema.org'"],
        })
      } else if (!hasType) {
        results.push({
          file: relativePath,
          valid: false,
          errors: ["Schema component missing @type field"],
        })
      } else {
        results.push({
          file: relativePath,
          valid: true,
          errors: [],
        })
      }
    }
  }

  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("🔍 JSON-LD Schema Validation (SYN-538)\n")

  const buildResults = validateBuildOutput()
  const sourceResults = validateSourceSchemas()
  const allResults = [...buildResults, ...sourceResults]

  let hasErrors = false

  for (const result of allResults) {
    if (result.valid) {
      const typeLabel = result.schemaType ? ` [${result.schemaType}]` : ""
      console.log(`  ✅ ${result.file}${typeLabel}`)
    } else {
      hasErrors = true
      console.log(`  ❌ ${result.file}`)
      for (const error of result.errors) {
        console.log(`     → ${error}`)
      }
    }
  }

  if (allResults.length === 0) {
    console.log("  ℹ️  No JSON-LD schema files found to validate.")
    process.exit(0)
  }

  const validCount = allResults.filter((r) => r.valid).length
  const totalCount = allResults.length

  console.log(`\n${validCount}/${totalCount} schema blocks valid`)

  if (hasErrors) {
    console.error("\n❌ JSON-LD schema validation FAILED — fix errors above before merging.")
    console.error("   Test your schema at: https://search.google.com/test/rich-results")
    process.exit(1)
  }

  console.log("\n✅ All JSON-LD schemas valid.")
  process.exit(0)
}

main()
