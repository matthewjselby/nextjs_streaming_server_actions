'use client'

import { useState } from "react"
import { serverActionStreamFromInterval, serverActionStreamFromSSEStream } from "@/app/server-action-stream/action"
import { useStreamingServerAction } from "@/app/utils/hooks"
import { StreamingMessage } from '@/app/utils/types'

export default function Home() {
	let [messages, setMessages] = useState<StreamingMessage[]>([])

	useStreamingServerAction({
		serverAction: serverActionStreamFromSSEStream,
		onMessage: (message: StreamingMessage) => {
			setMessages(previousMessages => [
				...previousMessages,
				message
			])
		}
	})

	return (
		<main className="flex min-h-screen flex-col items-center justify-between p-24">
			<ul>
				{messages.map(message => {
					return <li key={message.id}>{message.content}</li>
				})}
			</ul>
		</main>
	)
}
