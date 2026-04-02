/**
 * Framer CMS publish bridge.
 * Usage: node publish.mjs <project_url> <api_key> <collection_id> <json_payload>
 *
 * json_payload must include:
 *   fieldData: { "GlEJCucUC": {type, value}, "H76FV4UEM": {type, value}, ..., "Slug": "url-slug" }
 *   draft: true/false
 *
 * The fieldData uses Framer's internal field IDs as keys.
 * The "Slug" key is extracted and used as the item slug, not sent as a field.
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

  // Extract slug from fieldData (Python sends it as "Slug" key)
  let slug = payload.slug
  if (!slug) {
    const slugKey = Object.keys(fieldData).find(k => k.toLowerCase() === 'slug')
    if (slugKey) {
      const slugVal = fieldData[slugKey]
      slug = typeof slugVal === 'object' ? slugVal.value : slugVal
      delete fieldData[slugKey] // Remove from fieldData - not a real Framer field
    }
  }
  
  // Generate fallback slug if none provided
  if (!slug) {
    const tempId = randomUUID().replace(/-/g, "").slice(0, 20)
    slug = `post-${tempId}`
  }

  // Connect to Framer
  const framer = await connect(projectUrl, apiKey)
  const collection = await framer.getCollection(collectionId)

  // fieldData values come pre-formatted from Python as { type, value } objects.
  // We just need to pass them through — no re-formatting needed.
  const formattedFieldData = {}

  for (const [key, value] of Object.entries(fieldData)) {
    if (value === null || value === undefined) continue
    // Skip the Slug key if it wasn't deleted above
    if (key.toLowerCase() === 'slug') continue
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
