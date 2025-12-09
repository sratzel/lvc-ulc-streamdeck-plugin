import streamDeck, { DeviceDidConnectEvent } from "@elgato/streamdeck"

import { ULCWebSocketServer } from "./ulc-ws-server"
import { ULCFolderAction, ULCDynamicButton } from "./actions/ulc-folder"
import { setCurrentDevice, switchToULCProfile, switchToDefaultProfile } from "./utils/profile-manager"

import { LVCWebSocketServer } from "./lvc-ws-server"
import { LVCSirenToggle, LVCToneButton } from "./actions/lvc-actions"

streamDeck.logger.setLevel("trace")
streamDeck.logger.info("[Plugin] ULC + LVC Stream Deck Plugin starting...")

// ULC WebSocket Server (port 8765)
const ulcServer = new ULCWebSocketServer(8765)

// LVC WebSocket Server (port 8766)
const lvcServer = new LVCWebSocketServer(8766)

// Track device for profile switching
streamDeck.devices.onDeviceDidConnect((ev: DeviceDidConnectEvent) => {
    streamDeck.logger.info(`[Plugin] Device connected: ${ev.device.id}`)
    setCurrentDevice(ev.device.id)
})

// ============ ULC Setup ============
ULCFolderAction.setSendPressCallback((id: string) => {
    streamDeck.logger.info(`[Plugin] ULC button press callback triggered for: ${id}`)
    ulcServer.sendPress(id)
})

ulcServer.onButtonUpdate((buttons) => {
    streamDeck.logger.info(`[Plugin] ULC received button update with ${buttons.length} buttons`)
    ULCFolderAction.updateButtonStates(buttons)
})

ulcServer.onClientConnect(() => {
    streamDeck.logger.info("[Plugin] ULC client connected, switching to ULC profile...")
    switchToULCProfile()
})

ulcServer.onClientDisconnect(() => {
    streamDeck.logger.info("[Plugin] ULC client disconnected, switching to default profile...")
    switchToDefaultProfile()
})

// ============ LVC Setup ============
const sendLVCAction = (action: string, value?: number | string) => {
    lvcServer.sendAction(action, value)
}

LVCSirenToggle.setSendActionCallback(sendLVCAction)
LVCToneButton.setSendActionCallback(sendLVCAction)

lvcServer.onLVCStateUpdate((state) => {
    streamDeck.logger.info(`[Plugin] LVC state update - sirenOn: ${state.sirenOn}, mainSiren: ${state.mainSiren}, auxSiren: ${state.auxSiren}`)
    LVCSirenToggle.updateState(state)
    LVCToneButton.updateState(state)
})

lvcServer.onClientConnect(() => {
    streamDeck.logger.info("[Plugin] LVC client connected")
})

lvcServer.onClientDisconnect(() => {
    streamDeck.logger.info("[Plugin] LVC client disconnected")
})

// Register all actions
streamDeck.actions.registerAction(new ULCFolderAction())
streamDeck.actions.registerAction(new ULCDynamicButton())
streamDeck.actions.registerAction(new LVCSirenToggle())
streamDeck.actions.registerAction(new LVCToneButton())

streamDeck.logger.info("[Plugin] Connecting to Stream Deck...")
streamDeck.connect()