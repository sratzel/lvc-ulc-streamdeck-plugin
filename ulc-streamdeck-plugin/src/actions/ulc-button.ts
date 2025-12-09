import streamDeck, {
    action,
    KeyDownEvent,
    SingletonAction,
    WillAppearEvent,
    WillDisappearEvent,
} from "@elgato/streamdeck"

export interface ULCButtonState {
    id: string
    label: string
    numKey: number
    color: string
    active: boolean
    extra: number
}

interface ButtonInstance {
    action: WillAppearEvent["action"]
    assignedIndex: number
}

@action({ UUID: "dev.sratzel.ulc-streamdeck-plugin.ulcbutton" })
export class ULCButtonAction extends SingletonAction {
    private static buttonStates: ULCButtonState[] = []
    private static instances: Map<string, ButtonInstance> = new Map()
    private static appearanceOrder: string[] = []
    private static sendPressCallback?: (id: string) => void

    static setSendPressCallback(cb: (id: string) => void) {
        this.sendPressCallback = cb
    }

    static updateButtonStates(buttons: ULCButtonState[]) {
        streamDeck.logger.info(`[ULCButton] Received ${buttons.length} button states from ULC`)
        this.buttonStates = buttons

        buttons.forEach((btn, i) => {
            streamDeck.logger.info(`[ULCButton]   [${i}] ${btn.id}: ${btn.label} (active: ${btn.active})`)
        })

        this.reassignAllButtons()
    }

    private static reassignAllButtons() {
        streamDeck.logger.info(`[ULCButton] Reassigning ${this.appearanceOrder.length} buttons`)

        this.appearanceOrder.forEach((context, index) => {
            const instance = this.instances.get(context)
            if (instance) {
                instance.assignedIndex = index
                this.updateButtonDisplay(context, instance)
            }
        })
    }

    private static async updateButtonDisplay(context: string, instance: ButtonInstance) {
        const index = instance.assignedIndex
        const btn = this.buttonStates[index]

        if (btn) {
            const title = btn.active ? `● ${btn.label}` : btn.label
            await instance.action.setTitle(title)
            streamDeck.logger.info(`[ULCButton] ${context} -> [${index}] ${btn.label} (active: ${btn.active})`)
        } else {
            await instance.action.setTitle("--")
            streamDeck.logger.info(`[ULCButton] ${context} -> [${index}] No ULC button at this index`)
        }
    }

    override async onWillAppear(ev: WillAppearEvent) {
        const context = ev.action.id
        streamDeck.logger.info(`[ULCButton] Button appeared: ${context}`)

        const index = ULCButtonAction.appearanceOrder.length
        ULCButtonAction.appearanceOrder.push(context)

        const instance: ButtonInstance = {
            action: ev.action,
            assignedIndex: index
        }
        ULCButtonAction.instances.set(context, instance)

        await ULCButtonAction.updateButtonDisplay(context, instance)
    }

    override async onWillDisappear(ev: WillDisappearEvent) {
        const context = ev.action.id
        streamDeck.logger.info(`[ULCButton] Button disappeared: ${context}`)

        ULCButtonAction.instances.delete(context)

        const orderIndex = ULCButtonAction.appearanceOrder.indexOf(context)
        if (orderIndex > -1) {
            ULCButtonAction.appearanceOrder.splice(orderIndex, 1)
        }

        ULCButtonAction.reassignAllButtons()
    }

    override async onKeyDown(ev: KeyDownEvent) {
        const context = ev.action.id
        const instance = ULCButtonAction.instances.get(context)

        if (!instance) {
            streamDeck.logger.warn(`[ULCButton] No instance for context: ${context}`)
            return
        }

        const btn = ULCButtonAction.buttonStates[instance.assignedIndex]

        if (btn) {
            streamDeck.logger.info(`[ULCButton] Key pressed: ${btn.id} (${btn.label})`)

            if (ULCButtonAction.sendPressCallback) {
                ULCButtonAction.sendPressCallback(btn.id)
            }
        } else {
            streamDeck.logger.warn(`[ULCButton] No ULC button assigned to this key`)
        }
    }
}