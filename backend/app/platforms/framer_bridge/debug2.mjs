import { connect } from "framer-api"
import { randomUUID } from "crypto"

const [,, projectUrl, apiKey, collectionId] = process.argv
const framer = await connect(projectUrl, apiKey)
const collection = await framer.getCollection(collectionId)

// Check all available methods
const proto = Object.getPrototypeOf(collection)
const allMethods = Object.getOwnPropertyNames(proto)
console.log("All methods:", allMethods)

// Try creating an item by first getting items, then adding
const items = await collection.getItems()
console.log("Current items:", items.length)

// The addItems docs say it creates AND updates. Let's try with draft:true
try {
  const id = randomUUID().replace(/-/g, "").slice(0, 16)
  await collection.addItems([
    {
      id: id,
      slug: `test-${id}`,
      draft: true,
      fieldData: {
        "J9QaRrBR5": { type: "string", value: "Test Post" },
        "CuiJCY8aB": { type: "string", value: "Test excerpt" },
        "SZLKAQXiQ": { type: "formattedText", value: "<p>Test content</p>" },
      },
    },
  ])
  console.log("SUCCESS with id:", id)
} catch(e) {
  console.log("ERROR:", e.message)
}
