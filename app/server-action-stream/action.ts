'use server'

import EventSource from 'eventsource'
import { StreamingMessage } from '@/app/utils/types'

// Emits a server action every time an interval fires
export async function serverActionStreamFromInterval(): Promise<StreamingMessage> {
    let resolveFunc: (message: StreamingMessage) => void = () => {}
    let next = new Promise<StreamingMessage>(resolve => {
        resolveFunc = resolve
    })
    let messageNum = 1

    let queueNext = () => {
        const resolvePrevious = resolveFunc
        const nextRow = new Promise<StreamingMessage>(resolve => {
            resolveFunc = resolve
        })
        resolvePrevious({
            id: messageNum,
            content: `Hello from server action interval stream - message number ${messageNum}`,
            next: nextRow
        })
        messageNum += 1
    }

    setInterval(queueNext, 5000)

    queueNext()

    return next
}

// Connects to an SSE stream (defined in `app/route-stream/route.ts`) and forwards the events via server action
export async function serverActionStreamFromSSEStream(): Promise<StreamingMessage> {
    let resolveFunc: (message: StreamingMessage) => void = () => {}
    let next = new Promise<StreamingMessage>(resolve => {
        resolveFunc = resolve
    })

    let queueNext = (messageContent: string) => {
        const resolvePrevious = resolveFunc
        const nextRow = new Promise<StreamingMessage>(resolve => {
            resolveFunc = resolve
        })
        let { messageNum, content } = JSON.parse(messageContent)
        resolvePrevious({
            id: messageNum,
            content: content,
            next: nextRow
        })
    }

    const sseStream = new EventSource("http://localhost:3000/route-stream")
    sseStream.onmessage = async (event) => {
        queueNext(event.data)
    }
    sseStream.onerror = (event) => {
        console.log(`There wans an error with the event source: ${event}`)
    }

    queueNext(JSON.stringify({messageNum: 1, content: "Starting up"}))

    return next
}