/**
 * Framer CMS publish bridge.
 * Usage: node publish.mjs <project_url> <api_key> <collection_id> <json_payload>
 *
 * json_payload must include:
 *   fieldData: { "Title": "...", "Slug": "...", "Content": "...", ... }
 *
 * The fieldData should contain the exact field names matching your Framer CMS collection.
 */
import { connect } from "framer-api"
import { randomUUID } from "crypto"

const [,, projectUrl, apiKey, collectionId, payloadJson] = process.argv

if (!projectUrl || !apiKey || !collectionId || !payloadJson) {
  console.log(JSON.stringify({ success: false, error: "Missing arguments" }))
  process.exit(1)
}

try {
  const payload = JSON.parse(payloadJson)
  
  // Extract fieldData - this should already be in the correct format from Python
  const fieldData = payload.fieldData || {}
  
  // Validate that fieldData has at least one field
  if (!fieldData || Object.keys(fieldData).length === 0) {
    console.log(JSON.stringify({ success: false, error: "fieldData is empty" }))
    process.exit(1)
  }

  // Generate slug (Framer auto-assigns item ID)
  const tempId = randomUUID().replace(/-/g, "").slice(0, 20)
  const slug = fieldData.Slug || fieldData.slug || `post-${tempId}`

  // Connect to Framer
  const framer = await connect(projectUrl, apiKey)
  const collection = await framer.getCollection(collectionId)

  // fieldData values come pre-formatted from Python as { type, value } objects.
  // We just need to pass them through — no re-formatting needed.
  const formattedFieldData = {}

  for (const [key, value] of Object.entries(fieldData)) {
    if (value === null || value === undefined) continue
    // Already formatted by Python (has type + value keys)
    if (typeof value === "object" && "type" in value && "value" in value) {
      formattedFieldData[key] = value
      continue
    }
    // Fallback auto-format for any plain values
    if (typeof value === "string") {
      formattedFieldData[key] = value.includes("<") && value.includes(">")
        ? { type: "formattedText", value }
        : { type: "string", value }
    } else if (typeof value === "boolean") {
      formattedFieldData[key] = { type: "boolean", value }
    } else if (typeof value === "number") {
      formattedFieldData[key] = { type: "number", value }
    } else if (Array.isArray(value)) {
      formattedFieldData[key] = { type: "multiCollectionReference", value }
    } else {
      formattedFieldData[key] = { type: "string", value: String(value) }
    }
  }

  // draft: true = save as unpublished CMS draft; false = publish live immediately
  const isDraft = payload.draft === true

  // Add the item to the collection (no id — Framer auto-assigns it)
  await collection.addItems([
    {
      slug: slug,
      draft: isDraft,
      fieldData: formattedFieldData,
    },
  ])

  console.log(JSON.stringify({
    success: true,
    id: slug,
    slug: slug,
    draft: isDraft,
    fields_added: Object.keys(formattedFieldData)
  }))
} catch (err) {
  console.log(JSON.stringify({ success: false, error: String(err.message || err) }))
  process.exit(1)
}