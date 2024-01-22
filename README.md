# Streaming data from Next.js server actions

[Next.js](https://nextjs.org) recommends fetching data on the server via [server components](https://nextjs.org/docs/app/building-your-application/rendering/server-components). However, server components are not suitable for rendering real-time or streaming data such as data sent via websockets or [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events).

From what I could find current recommendations for dealing with real-time or streaming data in Next.js involve exposing an API endpoint on your backend service and interacting with it conventionally via, *e.g.,* a websocket or [eventsource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) on the client side. However, this loses many of the [benefits](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#fetching-data-on-the-server) of server components touted by Next.js. Sure, I could [redirect](https://nextjs.org/docs/app/building-your-application/routing/redirecting) or [rewrite](https://nextjs.org/docs/app/api-reference/next-config-js/rewrites) an API route from the backend service, but this once again loses many of the above benefits.

Enter [server actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations). Next.js recommends using server actions for mutating or updating data (*e.g.,* via form submissions and event handlers). Server actions integrate tightly with Next.js, using `POST` on the backend in a way that is opaque to the developer and giving conveniences such as caching and revalidation as well as returning both updated UI and data in a single server roundtrip. I knew that I wanted to use server actions where I could, but I couldn't figure out how to stream data from them. I tried directly sending a [TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream), a [generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator), and a few other things, but none of them turned out to be [serializable by React](https://react.dev/reference/react/use-server#serializable-parameters-and-return-values).

While I couldn't find a direct solution, I did come across some articles talking about streaming from server actions in the context of the [Vercel AI](https://sdk.vercel.ai/docs/api-reference) library. Specifically, the library includes a function `experimental_StreamingReactResponse` that allows streaming UI from a server action to a client component. I had no desire to stream UI - but I did want to stream text or other (*e.g.,* JSON) data. Diving into the source code, I saw that the streaming used promises that chained via a `next` property on a returned object. Queue ephiphany - promises are [serializable by React](https://react.dev/reference/react/use-server#serializable-parameters-and-return-values) - this is how we can stream data from a server action.

# Server action

For the server action, we instantiate a new `Promise` resolving to a `StreamingMessage`. `StreamingMessage` is pretty much an arbitrary object here (having `id`, `content`, and `next` properties) - you can add whatever properties you like on the object. The only critical property is `next`, which stores a reference to an additional or "next" `Promise`. On resolving the returned `Promise`, a new `Promise` is created and referenced the `next` property of the "next" `Promise` - essentially adding a new link to the promise chain. As these promises resolve, the data is streamed to the client.

Here is the basic idea:

```javascript
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

// async function that calls queueNext here, (e.g.,):
setInterval(queueNext, 5000)

queueNext()

return next
```

I've included two examples in the source. The first (`serverActionStreamFromInterval` in `/app/server-action-stream/action.ts`) uses a simple interval to send an update to the client. The second (`serverActionStreamFromSSEStream` in `/app/server-action-stream/action.ts`) connects to a server-sent event stream (specifically, an example one defined in `/app/route-stream/route.ts`) and forwards those events to the client. Note that in the second example the `content` property of the `StreamingMessage` is JSON instead of plaintext - and is parsed in the server action.

# Client side (custom hook)

I defined a [custom hook](https://react.dev/learn/reusing-logic-with-custom-hooks) to consume the stream from the server action (see `useStreamingServerAction` in `/app/utils/hooks.ts`). The hook takes two arguments: `serverAction` - a reference to the streaming server action, and `onMessage` - a function that is called on every message from the server action.

Usage:

```javascript
useStreamingServerAction({
    serverAction: serverAction,
    onMessage: (message: StreamingMessage) => {
        console.log(message)
    }
})
```

You can adapt the code in the custom hook as needed for your use case:

```javascript
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
```

Essentially we're just waiting for a `Promise` returned from the server action to resolve, calling the `onMessage` callback with desired parameters when it does, then teeing up the next `Promise` and waiting for it to resolve (if there is one, which, in the case of the examples, there always is).

# Conclusion

So there you have it, streaming text and/or data from a server action in Next.js. This is a rough proof of concept. There's no error handling, encapsulation, or anything else sensible here. Perhaps more to come in the future.