import { useEffect } from 'react';
import { StreamingMessage } from '@/app/utils/types'

export function useStreamingServerAction({
    serverAction,
    onMessage
}: {
    serverAction: () => Promise<StreamingMessage>,
    onMessage: (message: StreamingMessage) => void
}) {

    useEffect(() => {
        const processMessage = async (promise: Promise<StreamingMessage>) => {
            const message = await promise
            onMessage(message)
            if (message.next) {
                await processMessage(message.next)
            }
        }

        const setUpSeverActionStream = async () => {
            const promise = serverAction() as Promise<StreamingMessage>
            await processMessage(promise)
        }
        setUpSeverActionStream()
    }, [serverAction])
}