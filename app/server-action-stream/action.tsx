'use server'

interface StreamingMessage {
	id: number
	content: string
    next: null | Promise<StreamingMessage>
}

class StreamingServerActionResponse {
    constructor() {
        let done = false
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
                content: `Hello from server action - message number ${messageNum}`,
                next: nextRow
            })
            messageNum += 1
        }

        let intervalId = setInterval(queueNext, 5000)

        queueNext()

        return next
    }
}

export async function getServerActionStream() {
    return new StreamingServerActionResponse()
}