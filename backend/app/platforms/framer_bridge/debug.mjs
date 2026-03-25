import { connect } from "framer-api"
const [,, projectUrl, apiKey, collectionId] = process.argv
const framer = await connect(projectUrl, apiKey)
const collection = await framer.getCollection(collectionId)

// List all methods and properties
const proto = Object.getPrototypeOf(collection)
const methods = Object.getOwnPropertyNames(proto).filter(k => typeof collection[k] === "function")
console.log("Methods:", methods)

// Try getFields
if (typeof collection.getFields === "function") {
  const fields = await collection.getFields()
  console.log("Fields:", JSON.stringify(fields, null, 2))
}

// Try getItems to see existing items and their field structure
if (typeof collection.getItems === "function") {
  const items = await collection.getItems()
  console.log("Items count:", items.length)
  if (items.length > 0) {
    console.log("First item:", JSON.stringify(items[0], null, 2))
  }
}
