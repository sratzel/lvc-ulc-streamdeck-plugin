import streamDeck, {
    action,
    KeyDownEvent,
    SingletonAction,
    WillAppearEvent,
    WillDisappearEvent,
} from "@elgato/streamdeck"
import { getButtonImage, mapColorToButtonColor } from "../utils/button-renderer"

export interface ULCButtonState {
    id: string
    label: string
    numKey: number
    color: string
    active: boolean
    extra: number
}

type SendPressCallback = (id: string) => void

@action({ UUID: "dev.sratzel.ulc-streamdeck-plugin.ulcfolder" })
export class ULCFolderAction extends SingletonAction {
    private static buttonStates: ULCButtonState[] = []
    private static sendPressCallback?: SendPressCallback
    private static folderAction?: WillAppearEvent["action"]
    private static childActions: Map<string, { action: any, buttonId: string }> = new Map()

    static setSendPressCallback(cb: SendPressCallback) {
        this.sendPressCallback = cb
    }

    static updateButtonStates(buttons: ULCButtonState[]) {
        streamDeck.logger.info(`[ULCFolder] Received ${buttons.length} button states`)
        this.buttonStates = buttons

        buttons.forEach((btn, index) => {
            streamDeck.logger.info(`[ULCFolder]   ${index}: ${btn.id} - ${btn.label} (active: ${btn.active})`)
        })

        this.updateAllChildren()
        ULCDynamicButton.updateAllButtons()
    }

    static getButtonStates(): ULCButtonState[] {
        return this.buttonStates
    }

    private static updateAllChildren() {
        this.childActions.forEach((child, context) => {
            const btn = this.buttonStates.find(b => b.id === child.buttonId)
            if (btn) {
                const title = btn.active ? `● ${btn.label}` : btn.label
                child.action.setTitle(title)
                streamDeck.logger.info(`[ULCFolder] Updated child ${context}: ${title}`)
            }
        })
    }

    static registerChild(context: string, action: any, buttonId: string) {
        this.childActions.set(context, { action, buttonId })
        streamDeck.logger.info(`[ULCFolder] Registered child: ${context} -> ${buttonId}`)

        const btn = this.buttonStates.find(b => b.id === buttonId)
        if (btn) {
            const title = btn.active ? `● ${btn.label}` : btn.label
            action.setTitle(title)
        }
    }

    static unregisterChild(context: string) {
        this.childActions.delete(context)
        streamDeck.logger.info(`[ULCFolder] Unregistered child: ${context}`)
    }

    static pressButton(buttonId: string) {
        if (this.sendPressCallback) {
            streamDeck.logger.info(`[ULCFolder] Sending press for: ${buttonId}`)
            this.sendPressCallback(buttonId)
        }
    }

    override async onWillAppear(ev: WillAppearEvent) {
        streamDeck.logger.info(`[ULCFolder] Folder appeared`)
        ULCFolderAction.folderAction = ev.action
    }

    override async onWillDisappear(ev: WillDisappearEvent) {
        streamDeck.logger.info(`[ULCFolder] Folder disappeared`)
    }
}


@action({ UUID: "dev.sratzel.ulc-streamdeck-plugin.ulcbutton" })
export class ULCDynamicButton extends SingletonAction {
    private static instances: Map<string, { action: any, row: number, column: number }> = new Map()

    private static getButtonIndex(row: number, column: number): number {
        // Layout:
        // Row 0: [skip]  [B0]   [B1]   [B2]   [B3]
        // Row 1: [skip]  [B4]   [B5]   [B6]   [B7]
        // Row 2: [skip]  [B8]   [B9]   [B10]  [B11]
        // Column 0 is reserved for back button / empty
        if (column === 0) return -1

        const adjustedColumn = column - 1  // 0-3
        return row * 4 + adjustedColumn    // 0-11
    }

    static async updateAllButtons() {
        const buttons = ULCFolderAction.getButtonStates()
        streamDeck.logger.info(`[ULCButton] Updating ${this.instances.size} buttons with ${buttons.length} states`)

        for (const [context, instance] of this.instances) {
            const index = this.getButtonIndex(instance.row, instance.column)

            if (index < 0) {
                // Column 0 - skip (back button or empty)
                continue
            }

            const btn = buttons[index]

            if (btn) {
                await this.updateButtonAppearance(instance.action, btn)
                streamDeck.logger.info(`[ULCButton] Set ${context} -> ${btn.label} (${btn.active ? "ON" : "OFF"})`)
            } else {
                await instance.action.setTitle("")
                await instance.action.setImage(undefined)
            }
        }
    }

    private static async updateButtonAppearance(action: any, btn: ULCButtonState) {
        const buttonColor = mapColorToButtonColor(btn.color)
        const image = await getButtonImage({
            label: btn.label,
            color: buttonColor,
            active: btn.active
        })

        if (image) {
            await action.setImage(image)
            await action.setTitle(btn.label)
        } else {
            await action.setImage(undefined)
            const title = btn.active ? `● ${btn.label}` : btn.label
            await action.setTitle(title)
        }
    }

    override async onWillAppear(ev: WillAppearEvent) {
        const context = ev.action.id
        const payload = ev.payload as { coordinates?: { row: number, column: number } }
        const coordinates = payload.coordinates

        streamDeck.logger.info(`[ULCButton] Button appeared at position: ${JSON.stringify(coordinates)}`)

        if (coordinates) {
            ULCDynamicButton.instances.set(context, {
                action: ev.action,
                row: coordinates.row,
                column: coordinates.column
            })

            const index = ULCDynamicButton.getButtonIndex(coordinates.row, coordinates.column)
            const buttons = ULCFolderAction.getButtonStates()

            if (index >= 0 && index < buttons.length) {
                const btn = buttons[index]
                ULCFolderAction.registerChild(context, ev.action, btn.id)
                await ULCDynamicButton.updateButtonAppearance(ev.action, btn)
                streamDeck.logger.info(`[ULCButton] Assigned button ${index}: ${btn.label}`)
            } else if (index >= 0) {
                await ev.action.setTitle("")
                streamDeck.logger.info(`[ULCButton] No ULC button for index ${index}`)
            }
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent) {
        const context = ev.action.id
        ULCFolderAction.unregisterChild(context)
        ULCDynamicButton.instances.delete(context)
    }

    override async onKeyDown(ev: KeyDownEvent) {
        const context = ev.action.id
        const payload = ev.payload as { coordinates?: { row: number, column: number } }
        const coordinates = payload.coordinates

        if (!coordinates) return

        const index = ULCDynamicButton.getButtonIndex(coordinates.row, coordinates.column)
        const buttons = ULCFolderAction.getButtonStates()

        if (index >= 0 && index < buttons.length) {
            const btn = buttons[index]
            streamDeck.logger.info(`[ULCButton] Pressed: ${btn.id}`)
            ULCFolderAction.pressButton(btn.id)
        }
    }
}