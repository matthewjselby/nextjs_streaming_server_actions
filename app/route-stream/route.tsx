export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const responseStream = new TransformStream()
	const writer = responseStream.writable.getWriter()
	const encoder = new TextEncoder()

    let messageNum = 0

    const intervalId = setInterval(async () => {
        const data = {
            id: messageNum,
            content: `Hello from server route - message number ${messageNum}`
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        messageNum += 1
    }, 5000)

    req.signal.addEventListener('abort', async () => {
        clearInterval(intervalId)
		await writer.close()
	})

	return new Response(responseStream.readable, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no',
			'Content-Encoding': 'none'
		},
	})
}