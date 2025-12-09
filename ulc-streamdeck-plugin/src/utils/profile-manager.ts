import streamDeck from "@elgato/streamdeck"

const ULC_PROFILE_NAME = "ULC"

let currentDeviceId: string | null = null
let isULCProfileActive = false

export function setCurrentDevice(deviceId: string) {
    currentDeviceId = deviceId
    streamDeck.logger.info(`[ProfileManager] Device set: ${deviceId}`)
}

export async function switchToULCProfile() {
    if (!currentDeviceId) {
        streamDeck.logger.warn("[ProfileManager] No device ID set, cannot switch profile")
        return false
    }

    if (isULCProfileActive) {
        streamDeck.logger.info("[ProfileManager] ULC profile already active")
        return true
    }

    try {
        streamDeck.logger.info(`[ProfileManager] Switching to ULC profile on device ${currentDeviceId}`)
        await streamDeck.profiles.switchToProfile(currentDeviceId, ULC_PROFILE_NAME)
        isULCProfileActive = true
        streamDeck.logger.info("[ProfileManager] ✓ Switched to ULC profile")
        return true
    } catch (err) {
        streamDeck.logger.error(`[ProfileManager] Failed to switch profile: ${err}`)
        streamDeck.logger.info("[ProfileManager] Make sure you have created a profile named 'ULC' in Stream Deck")
        return false
    }
}

export async function switchToDefaultProfile() {
    if (!currentDeviceId) {
        streamDeck.logger.warn("[ProfileManager] No device ID set, cannot switch profile")
        return false
    }

    if (!isULCProfileActive) {
        streamDeck.logger.info("[ProfileManager] Not in ULC profile, nothing to do")
        return true
    }

    try {
        streamDeck.logger.info(`[ProfileManager] Switching back to default profile`)
        // Passing undefined or empty string switches to the default profile
        await streamDeck.profiles.switchToProfile(currentDeviceId)
        isULCProfileActive = false
        streamDeck.logger.info("[ProfileManager] ✓ Switched to default profile")
        return true
    } catch (err) {
        streamDeck.logger.error(`[ProfileManager] Failed to switch to default profile: ${err}`)
        return false
    }
}

export function isULCActive(): boolean {
    return isULCProfileActive
}

export function resetProfileState() {
    isULCProfileActive = false
}