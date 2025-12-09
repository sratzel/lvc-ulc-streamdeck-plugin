import WebSocket, { WebSocketServer } from "ws"
import streamDeck from "@elgato/streamdeck"

export interface ULCButton {
    id: string
    label: string
    numKey: number
    color: string
    active: boolean
    extra: number
}

type ButtonUpdateListener = (buttons: ULCButton[]) => void
type ConnectionListener = () => void

export class ULCWebSocketServer {
    private wss: WebSocketServer
    private clients: Set<WebSocket>
    private onUpdate?: ButtonUpdateListener
    private onConnect?: ConnectionListener
    private onDisconnect?: ConnectionListener
    private isRunning: boolean = false

    constructor(port: number) {
        this.clients = new Set()

        streamDeck.logger.info(`[ULC-WS] Starting WebSocket server on port ${port}...`)

        this.wss = new WebSocketServer({ port })

        this.wss.on("listening", () => {
            this.isRunning = true
            streamDeck.logger.info(`[ULC-WS] ✓ Server listening on ws://127.0.0.1:${port}`)
        })

        this.wss.on("error", (error) => {
            streamDeck.logger.error(`[ULC-WS] Server error: ${error.message}`)
        })

        this.wss.on("connection", (ws, req) => {
            const clientAddr = req.socket.remoteAddress
            streamDeck.logger.info(`[ULC-WS] ✓ Client connected from ${clientAddr}`)

            const wasEmpty = this.clients.size === 0
            this.clients.add(ws)
            streamDeck.logger.info(`[ULC-WS] Total clients: ${this.clients.size}`)

            // Notify on first client connection
            if (wasEmpty && this.onConnect) {
                this.onConnect()
            }

            ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString())
                    streamDeck.logger.info(`[ULC-WS] Received message: ${msg.type}`)

                    if (msg.type === "visible_buttons") {
                        streamDeck.logger.info(`[ULC-WS] Received ${msg.buttons?.length || 0} buttons`)

                        if (msg.buttons && Array.isArray(msg.buttons)) {
                            msg.buttons.forEach((btn: ULCButton) => {
                                streamDeck.logger.info(`[ULC-WS]   - ${btn.id}: ${btn.label} (active: ${btn.active}, color: ${btn.color})`)
                            })
                        }

                        this.onUpdate?.(msg.buttons || [])
                    }
                } catch (err) {
                    streamDeck.logger.error(`[ULC-WS] Failed to parse message: ${err}`)
                }
            })

            ws.on("close", (code, reason) => {
                streamDeck.logger.info(`[ULC-WS] Client disconnected (code: ${code}, reason: ${reason})`)
                this.clients.delete(ws)
                streamDeck.logger.info(`[ULC-WS] Total clients: ${this.clients.size}`)

                // Notify when all clients disconnected
                if (this.clients.size === 0 && this.onDisconnect) {
                    this.onDisconnect()
                }
            })

            ws.on("error", (error) => {
                streamDeck.logger.error(`[ULC-WS] Client error: ${error.message}`)
            })
        })
    }

    public onButtonUpdate(cb: ButtonUpdateListener) {
        this.onUpdate = cb
    }

    public onClientConnect(cb: ConnectionListener) {
        this.onConnect = cb
    }

    public onClientDisconnect(cb: ConnectionListener) {
        this.onDisconnect = cb
    }

    public sendPress(id: string) {
        streamDeck.logger.info(`[ULC-WS] Sending press for button: ${id}`)

        const message = JSON.stringify({
            type: "press",
            id
        })

        let sentCount = 0
        this.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message)
                sentCount++
            }
        })

        streamDeck.logger.info(`[ULC-WS] Press sent to ${sentCount} client(s)`)
    }

    public getStatus() {
        return {
            running: this.isRunning,
            clientCount: this.clients.size
        }
    }
}