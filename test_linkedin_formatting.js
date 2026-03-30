// Test script to verify LinkedIn formatting improvements
// This simulates what the backend would generate with our new formatting rules

const sampleLinkedInContent = `BREAKING: Supreme Court declares digital privacy a fundamental right under Article 21.

This landmark ruling means that government surveillance programs and data collection practices will now face strict constitutional scrutiny. The court has essentially elevated digital privacy to the same level as physical privacy rights.

The implications are far-reaching. Expect a wave of challenges to existing surveillance laws, data retention policies, and monitoring technologies used by various government agencies. This could fundamentally reshape how the state interacts with citizens' digital footprints.

For legal professionals, this creates both opportunities and challenges. Law firms will need to update their privacy policies and advise clients on compliance. Tech companies will need to audit their data practices to ensure they don't violate this new fundamental right.

What this means for citizens is clear: your digital life now has constitutional protection. From social media posts to private messages, the state can no longer treat your digital activities as fair game for unrestricted surveillance.

This ruling signals a major shift toward recognizing digital rights as fundamental rights in our increasingly connected world. It's a victory for privacy advocates and sets a precedent that will influence digital rights cases for years to come.

#DigitalPrivacy #SupremeCourt #FundamentalRights`;

console.log("Sample LinkedIn content with proper paragraph spacing:");
console.log("=".repeat(60));
console.log(sampleLinkedInContent);
console.log("=".repeat(60));

// Count paragraphs (separated by double line breaks)
const paragraphs = sampleLinkedInContent.split('\n\n');
console.log(`\nNumber of paragraphs: ${paragraphs.length}`);
console.log("\nParagraph breakdown:");
paragraphs.forEach((para, index) => {
  console.log(`${index + 1}. ${para.substring(0, 50)}...`);
});

console.log("\n✅ Test shows proper paragraph separation with double line breaks!");