import { createWriteStream, existsSync, mkdirSync, cpSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import archiver from "archiver"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")

const manifestPath = join(rootDir, "dev.sratzel.ulc-streamdeck-plugin.sdPlugin", "manifest.json")
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"))
const pluginId = manifest.UUID
const version = manifest.Version

const distDir = join(rootDir, "dist")
const sdPluginDir = join(rootDir, `${pluginId}.sdPlugin`)
const outputFile = join(distDir, `${pluginId}-v${version}.streamDeckPlugin`)

console.log("🔨 Building Stream Deck Plugin...")
console.log(`   Plugin ID: ${pluginId}`)
console.log(`   Version: ${version}`)

// Check if sdPlugin folder exists
if (!existsSync(sdPluginDir)) {
    console.error(`❌ Error: ${sdPluginDir} not found!`)
    console.error("   Run 'npm run build' first.")
    process.exit(1)
}

// Create dist folder
if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true })
}

// Create .streamDeckPlugin archive
console.log("\n📦 Creating archive...")

const output = createWriteStream(outputFile)
const archive = archiver("zip", { zlib: { level: 9 } })

output.on("close", () => {
    console.log(`\n✅ Done! Created: ${outputFile}`)
    console.log(`   Size: ${(archive.pointer() / 1024).toFixed(2)} KB`)
    console.log("\n📋 To install:")
    console.log(`   1. Double-click the .streamDeckPlugin file`)
    console.log(`   2. Or drag it onto the Stream Deck app`)
})

archive.on("error", (err) => {
    throw err
})

archive.pipe(output)
archive.directory(sdPluginDir, `${pluginId}.sdPlugin`)
archive.finalize()