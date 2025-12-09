import streamDeck, {
    action,
    KeyDownEvent,
    KeyUpEvent,
    SingletonAction,
    WillAppearEvent,
    WillDisappearEvent,
} from "@elgato/streamdeck"
import type { LVCState, LVCSirenTone } from "../lvc-ws-server"
import { getLVCImage } from "../utils/button-renderer"

type SendActionCallback = (action: string, value?: number | string) => void

interface ToneButtonInstance {
    action: any
    row: number
    column: number
    lastClickTime: number
    clickTimeout: NodeJS.Timeout | null
}


@action({ UUID: "dev.sratzel.ulc-streamdeck-plugin.lvcsiren" })
export class LVCSirenToggle extends SingletonAction {
    private static instance?: any
    private static sendAction?: SendActionCallback
    private static currentState: LVCState | null = null
    private static imageOn: string | null = null
    private static imageOff: string | null = null
    private static holdTimeout: NodeJS.Timeout | null = null
    private static isHolding: boolean = false
    private static HOLD_THRESHOLD = 300 // ms to trigger MANU mode

    static setSendActionCallback(cb: SendActionCallback) {
        this.sendAction = cb
    }

    static updateState(state: LVCState) {
        this.currentState = state
        this.updateAppearance()
    }

    private static async loadImages() {
        if (!this.imageOn) {
            this.imageOn = await getLVCImage("slide_on.png")
            streamDeck.logger.info(`[LVCSiren] Loaded slide_on.png: ${this.imageOn ? "OK" : "FAILED"}`)
        }
        if (!this.imageOff) {
            this.imageOff = await getLVCImage("slide_off.png")
            streamDeck.logger.info(`[LVCSiren] Loaded slide_off.png: ${this.imageOff ? "OK" : "FAILED"}`)
        }
    }

    private static async updateAppearance() {
        if (!this.instance) return

        await this.loadImages()

        const isOn = this.currentState && this.currentState.sirenOn

        if (isOn && this.imageOn) {
            await this.instance.setImage(this.imageOn)
        } else if (!isOn && this.imageOff) {
            await this.instance.setImage(this.imageOff)
        }

        await this.instance.setTitle("")
    }

    override async onWillAppear(ev: WillAppearEvent) {
        LVCSirenToggle.instance = ev.action
        streamDeck.logger.info("[LVCSiren] Lights toggle button appeared")

        await LVCSirenToggle.loadImages()
        if (LVCSirenToggle.imageOff) {
            await ev.action.setImage(LVCSirenToggle.imageOff)
        }
        await ev.action.setTitle("")

        await LVCSirenToggle.updateAppearance()
    }

    override async onWillDisappear(ev: WillDisappearEvent) {
        LVCSirenToggle.instance = undefined
        if (LVCSirenToggle.holdTimeout) {
            clearTimeout(LVCSirenToggle.holdTimeout)
            LVCSirenToggle.holdTimeout = null
        }
        if (LVCSirenToggle.isHolding) {
            LVCSirenToggle.sendAction?.("manu_off")
            LVCSirenToggle.isHolding = false
        }
    }

    override async onKeyDown(ev: KeyDownEvent) {
        streamDeck.logger.info("[LVCSiren] Key DOWN - starting hold timer")

        // Start a timer - if held long enough, trigger MANU mode
        LVCSirenToggle.holdTimeout = setTimeout(() => {
            LVCSirenToggle.isHolding = true
            streamDeck.logger.info("[LVCSiren] Hold detected - activating MANU")
            LVCSirenToggle.sendAction?.("manu_on")
            LVCSirenToggle.holdTimeout = null
        }, LVCSirenToggle.HOLD_THRESHOLD)
    }

    override async onKeyUp(ev: KeyUpEvent) {
        streamDeck.logger.info("[LVCSiren] Key UP")

        if (LVCSirenToggle.holdTimeout) {
            // Released before hold threshold - this is a tap (toggle lights)
            clearTimeout(LVCSirenToggle.holdTimeout)
            LVCSirenToggle.holdTimeout = null
            streamDeck.logger.info("[LVCSiren] Tap detected - toggling lights")
            LVCSirenToggle.sendAction?.("toggle_lights")
        } else if (LVCSirenToggle.isHolding) {
            // Was holding for MANU - release it
            LVCSirenToggle.isHolding = false
            streamDeck.logger.info("[LVCSiren] Hold released - deactivating MANU")
            LVCSirenToggle.sendAction?.("manu_off")
        }
    }
}


@action({ UUID: "dev.sratzel.ulc-streamdeck-plugin.lvctone" })
export class LVCToneButton extends SingletonAction {
    private static instances: Map<string, ToneButtonInstance> = new Map()
    private static sendAction?: SendActionCallback
    private static currentState: LVCState | null = null
    private static DOUBLE_CLICK_THRESHOLD = 300
    private static buttonOrder: string[] = [] // Track order buttons appear

    static setSendActionCallback(cb: SendActionCallback) {
        this.sendAction = cb
    }

    static updateState(state: LVCState) {
        this.currentState = state
        this.updateAllButtons()
    }

    private static getToneForButton(context: string): LVCSirenTone | null {
        if (!this.currentState || !this.currentState.tones) return null

        // Find this button's index in the order it appeared
        const buttonIndex = this.buttonOrder.indexOf(context)

        if (buttonIndex >= 0 && buttonIndex < this.currentState.tones.length) {
            return this.currentState.tones[buttonIndex]
        }
        return null
    }

    private static async updateAllButtons() {
        for (const [context, instance] of this.instances) {
            const tone = this.getToneForButton(context)

            if (tone) {
                let title = tone.name
                if (tone.isMain && tone.isAux) {
                    title = `● ${tone.name}\n(DUAL)`
                } else if (tone.isMain) {
                    title = `● ${tone.name}`
                } else if (tone.isAux) {
                    title = `○ ${tone.name}\n(AUX)`
                }

                await instance.action.setTitle(title)
            } else {
                await instance.action.setTitle("--")
            }
        }
    }

    override async onWillAppear(ev: WillAppearEvent) {
        const context = ev.action.id
        const payload = ev.payload as { coordinates?: { row: number, column: number } }
        const coordinates = payload.coordinates

        if (coordinates) {
            LVCToneButton.instances.set(context, {
                action: ev.action,
                row: coordinates.row,
                column: coordinates.column,
                lastClickTime: 0,
                clickTimeout: null
            })

            // Add to button order if not already present
            if (!LVCToneButton.buttonOrder.includes(context)) {
                LVCToneButton.buttonOrder.push(context)
            }

            streamDeck.logger.info(`[LVCTone] Button appeared at row: ${coordinates.row}, col: ${coordinates.column}, index: ${LVCToneButton.buttonOrder.indexOf(context)}`)
        }

        if (LVCToneButton.currentState) {
            await LVCToneButton.updateAllButtons()
        } else {
            await ev.action.setTitle("Waiting\nLVC")
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent) {
        const context = ev.action.id
        const instance = LVCToneButton.instances.get(context)
        if (instance?.clickTimeout) {
            clearTimeout(instance.clickTimeout)
        }
        LVCToneButton.instances.delete(context)
        // Remove from button order
        const orderIndex = LVCToneButton.buttonOrder.indexOf(context)
        if (orderIndex > -1) {
            LVCToneButton.buttonOrder.splice(orderIndex, 1)
        }
    }

    override async onKeyDown(ev: KeyDownEvent) {
        const context = ev.action.id
        const instance = LVCToneButton.instances.get(context)

        if (!instance) return

        const tone = LVCToneButton.getToneForButton(context)
        if (!tone) return

        const now = Date.now()
        const timeSinceLastClick = now - instance.lastClickTime

        if (instance.clickTimeout) {
            clearTimeout(instance.clickTimeout)
            instance.clickTimeout = null
        }

        if (timeSinceLastClick < LVCToneButton.DOUBLE_CLICK_THRESHOLD) {
            instance.lastClickTime = 0
            streamDeck.logger.info(`[LVCTone] Double-click on tone ${tone.id} (${tone.name}) - toggle aux`)
            LVCToneButton.sendAction?.("toggle_aux", tone.id)
        } else {
            instance.lastClickTime = now

            instance.clickTimeout = setTimeout(() => {
                streamDeck.logger.info(`[LVCTone] Single-click on tone ${tone.id} (${tone.name}) - set/toggle main`)
                LVCToneButton.sendAction?.("set_tone", tone.id)
                instance.clickTimeout = null
            }, LVCToneButton.DOUBLE_CLICK_THRESHOLD)
        }
    }
}