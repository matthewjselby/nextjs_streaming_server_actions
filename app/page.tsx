'use client'

import { useState, useEffect } from "react"
import { getServerActionStream } from "@/app/server-action-stream/action"

interface Message {
	id: number
	content: string
}

interface StreamingMessage {
	id: number
	content: string
    next: null | Promise<StreamingMessage>
}

export default function Home() {
	let [messages, setMessages] = useState<Message[]>([])

	useEffect(() => {
		const setUpRouteStream = () => {
			var source = new EventSource('/route-stream')
			source.onmessage = (event) => {
				console.log(event)
				let parsedMessage: Message = JSON.parse(event.data)
				if (parsedMessage) {
					setMessages(previousMessages => [
						...previousMessages,
						parsedMessage
					])
				}
			}
			source.onerror = (event) => {
				console.log(`There was an error with the eventsource: ${event}`)
			}
		}
		//setUpRouteStream()

		const readMessage = async (promise: Promise<StreamingMessage>) => {
			const { id, content, next } = await promise
			console.log(content)
			if (next) {
				await readMessage(next)
			}
		}

		const setUpSeverActionStream = async () => {
			const promise = getServerActionStream() as Promise<StreamingMessage>
			await readMessage(promise)
		}
		setUpSeverActionStream()
	}, [])

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
