import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import streamDeck from "@elgato/streamdeck"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BUTTON_SIZE = 144

export type ButtonColor = "red" | "amber" | "blue" | "green" | "off"

interface ButtonRenderOptions {
    label: string
    color: ButtonColor
    active: boolean
}

const imageCache: Map<string, string> = new Map()

function getImagePath(color: ButtonColor, active: boolean): string {
    const imageName = active ? `button_on_${color}` : "button_off"
    // Go up from bin/ to plugin root, then into imgs/ulc/
    return path.join(__dirname, "..", "imgs", "ulc", `${imageName}.png`)
}

export async function loadImageAsBase64(imagePath: string): Promise<string | null> {
    try {
        if (imageCache.has(imagePath)) {
            return imageCache.get(imagePath)!
        }

        if (!fs.existsSync(imagePath)) {
            streamDeck.logger.warn(`[ButtonRenderer] Image not found: ${imagePath}`)
            return null
        }

        const imageBuffer = fs.readFileSync(imagePath)
        const base64 = imageBuffer.toString("base64")
        const dataUri = `data:image/png;base64,${base64}`

        imageCache.set(imagePath, dataUri)
        return dataUri
    } catch (err) {
        streamDeck.logger.error(`[ButtonRenderer] Failed to load image: ${err}`)
        return null
    }
}

export async function getButtonImage(options: ButtonRenderOptions): Promise<string | null> {
    const { color, active } = options
    const imagePath = getImagePath(color, active)
    return loadImageAsBase64(imagePath)
}

export async function getLVCImage(imageName: string): Promise<string | null> {
    const imagePath = path.join(__dirname, "..", "imgs", "lvc", imageName)
    return loadImageAsBase64(imagePath)
}

export function mapColorToButtonColor(color: string): ButtonColor {
    switch (color.toLowerCase()) {
        case "red":
            return "red"
        case "amber":
        case "yellow":
        case "orange":
            return "amber"
        case "blue":
            return "blue"
        case "green":
            return "green"
        default:
            return "blue"
    }
}