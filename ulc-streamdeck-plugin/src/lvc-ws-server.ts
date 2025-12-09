import WebSocket, { WebSocketServer } from "ws"
import streamDeck from "@elgato/streamdeck"

export interface LVCSirenTone {
    id: number
    name: string
    position: number
    isMain: boolean
    isAux: boolean
}

export interface LVCState {
    type: string
    connected: boolean
    sirenOn: boolean
    mainSiren: number
    auxSiren: number
    horn: number
    locked: boolean
    tones: LVCSirenTone[]
}

type StateUpdateListener = (state: LVCState) => void
type ConnectionListener = () => void

export class LVCWebSocketServer {
    private wss: WebSocketServer
    private clients: Set<WebSocket> = new Set()
    private onStateUpdate?: StateUpdateListener
    private onConnect?: ConnectionListener
    private onDisconnect?: ConnectionListener
    private currentState: LVCState | null = null
    private isRunning: boolean = false

    constructor(port: number) {
        streamDeck.logger.info(`[LVC-WS] Starting WebSocket server on port ${port}...`)

        this.wss = new WebSocketServer({ port })

        this.wss.on("listening", () => {
            this.isRunning = true
            streamDeck.logger.info(`[LVC-WS] ✓ Server listening on ws://127.0.0.1:${port}`)
        })

        this.wss.on("error", (error) => {
            streamDeck.logger.error(`[LVC-WS] Server error: ${error.message}`)
        })

        this.wss.on("connection", (ws, req) => {
            const clientAddr = req.socket.remoteAddress
            streamDeck.logger.info(`[LVC-WS] ✓ LVC client connected from ${clientAddr}`)

            const wasEmpty = this.clients.size === 0
            this.clients.add(ws)
            streamDeck.logger.info(`[LVC-WS] Total clients: ${this.clients.size}`)

            if (wasEmpty && this.onConnect) {
                this.onConnect()
            }

            ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString()) as LVCState

                    if (msg.type === "lvc_state") {
                        streamDeck.logger.info(`[LVC-WS] State update - siren: ${msg.mainSiren}, aux: ${msg.auxSiren}, tones: ${msg.tones?.length || 0}`)
                        this.currentState = msg
                        this.onStateUpdate?.(msg)
                    }
                } catch (err) {
                    streamDeck.logger.error(`[LVC-WS] Failed to parse message: ${err}`)
                }
            })

            ws.on("close", (code, reason) => {
                streamDeck.logger.info(`[LVC-WS] LVC client disconnected (code: ${code})`)
                this.clients.delete(ws)
                streamDeck.logger.info(`[LVC-WS] Total clients: ${this.clients.size}`)

                if (this.clients.size === 0) {
                    this.currentState = null
                    this.onDisconnect?.()
                }
            })

            ws.on("error", (error) => {
                streamDeck.logger.error(`[LVC-WS] Client error: ${error.message}`)
            })
        })
    }

    public onLVCStateUpdate(cb: StateUpdateListener) {
        this.onStateUpdate = cb
    }

    public onClientConnect(cb: ConnectionListener) {
        this.onConnect = cb
    }

    public onClientDisconnect(cb: ConnectionListener) {
        this.onDisconnect = cb
    }

    public sendAction(action: string, value?: number | string) {
        const message = JSON.stringify({
            type: "action",
            action,
            value
        })

        streamDeck.logger.info(`[LVC-WS] Sending action: ${action} (value: ${value})`)

        let sentCount = 0
        this.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message)
                sentCount++
            }
        })

        streamDeck.logger.info(`[LVC-WS] Action sent to ${sentCount} client(s)`)
    }

    public getCurrentState(): LVCState | null {
        return this.currentState
    }

    public isConnected(): boolean {
        return this.clients.size > 0
    }

    public getStatus() {
        return {
            running: this.isRunning,
            clientCount: this.clients.size,
            hasState: this.currentState !== null
        }
    }
}