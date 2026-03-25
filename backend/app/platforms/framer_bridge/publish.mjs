/**
 * Framer CMS publish bridge.
 * Usage: node publish.mjs <project_url> <api_key> <collection_id> <json_payload>
 *
 * json_payload must include:
 *   title, excerpt, content (HTML), slug
 *   field_ids: { title: "xxx", excerpt: "xxx", content: "xxx" }
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
  const fieldIds = payload.field_ids || {}

  // Require field IDs
  if (!fieldIds.title || !fieldIds.content) {
    console.log(JSON.stringify({
      success: false,
      error: "field_ids.title and field_ids.content are required. Run getFields() on your collection to find them."
    }))
    process.exit(1)
  }

  const itemId = randomUUID().replace(/-/g, "").slice(0, 20)
  const slug = payload.slug || `post-${itemId}`
  const title = payload.title || "Untitled"
  const excerpt = payload.excerpt || ""
  const content = payload.content || ""

  // Convert markdown/plain text to basic HTML if not already HTML
  let htmlContent = content
  if (!htmlContent.trim().startsWith("<")) {
    htmlContent = content.split("\n").map(line => {
      line = line.trim()
      if (!line) return ""
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`
      if (line.startsWith("## ")) return `<h3>${line.slice(3)}</h3>`
      if (line.startsWith("# ")) return `<h2>${line.slice(2)}</h2>`
      return `<p>${line}</p>`
    }).filter(Boolean).join("\n")
  }

  const framer = await connect(projectUrl, apiKey)
  const collection = await framer.getCollection(collectionId)

  // Build fieldData with exact Internal Field IDs
  const fieldData = {}
  fieldData[fieldIds.title] = { type: "string", value: title }
  if (fieldIds.excerpt) {
    fieldData[fieldIds.excerpt] = { type: "string", value: excerpt }
  }
  fieldData[fieldIds.content] = { type: "formattedText", value: htmlContent }

  await collection.addItems([
    {
      id: itemId,
      slug: slug,
      draft: false,
      fieldData: fieldData,
    },
  ])

  console.log(JSON.stringify({ success: true, id: itemId, slug: slug }))
} catch (err) {
  console.log(JSON.stringify({ success: false, error: String(err.message || err) }))
  process.exit(1)
}
