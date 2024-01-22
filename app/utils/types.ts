export interface StreamingMessage {
	id: number
	content: string
    next: null | Promise<StreamingMessage>
}