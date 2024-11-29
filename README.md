# Azure OpenAI /realtime: an interactive chat with multi-assistants

This repo contains a node sample application that uses AOAI Realtime Audio endpoint. See more detail about the SDK at [AOAI Realtime Audio SDK](https://github.com/Azure-Samples/aoai-realtime-audio-sdk)

This sample switches multiple assistants (system prompt + tools set) seamlessly depending on your intent.

## Scenario

You can ask about mobile service, such as 

- Weather
- Mobile phone billing
- Mobile phoen current plan
- Mobile phone options
- Consulation on usage
- Mobile phoe store related question, etc.

You can find the assistant definitions at [assistants.ts](./src//assistants.ts).
See all tools set for each assistant to understand what each assistant can do, or modify as you need.

## Prereqs

1. Node.js installation (https://nodejs.org)
1. Azure Open AI account
1. GPT-4o realtime model
1. Bing Search Resource

## Using the sample

1. Navigate to this folder
1. Run `npm install` to download a small number of dependency packages (see `package.json`)
1. Rename `.env_sample` to `.env` and update variables
1. Run `npm run dev` to start the web server, navigating any firewall permissions prompts
1. Use any of the provided URIs from the console output, e.g. `http://localhost:5173/`, in a browser
1. If you want to debug the application, press F5 that will launch the browser for debug.
1. Check `Chat Only` if you prefer to use text input only, otherwise you can use both Speech and text.
1. Click the "Start" button to start the session; accept any microphone permissions dialog
1. You should see a `<< Session Started >>` message in the left-side output, after which you can speak to the app
1. You can interrupt the chat at any time by speaking and completely stop the chat by using the "Stop" button
1. Optionally, you can use chat area to talk to the bot rather than speak to.
1. Assitant name will be displayed in the assistant name text input whenever an assistant is loaded.
1. To delete the specific message, enter the Id of the message to `Delete Item` which you can find in the chat history and click `Delete` that will strike sthough the idem.

## Known issues

1. Connection errors are not yet gracefully handled and looping error spew may be observed in script debug output. Please just refresh the web page if an error appears.
1. Voice selection is not yet supported.
1. More authentication mechanisms, including keyless support via Entra, will come in a future service update.

## Code description

This sample uses a custom client to simplify the usage of the realtime API. The client package is included  in this repo in the `rt-client-0.4.7.tgz` file. Check the  [AOAI Realtime Audio SDK](https://github.com/Azure-Samples/aoai-realtime-audio-sdk) to see if there is a newer version of the package if you need the latest version of the SDK.

The primary file demonstrating `/realtime` use is [src/main.ts](./src/main.ts); the first few functions demonstrate connecting to `/realtime` using the client, sending an inference configuration message, and then processing the send/receive of messages on the connection.

## Assistants

In this repo, we define an assistant as:

- has system prompt
- has tools (function calling definitions)

We use `function calling` feature to switch to other assistant. 

For example, the generic assistant has following function calling definition.

```typescript
{
    name: 'Assistant_MobileAssistant',
    description: 'Help user to answer mobile related question, such as billing, contract, etc.',
    parameters: {
        type: 'object',
        properties: {}
    },
    returns: async (arg: string) => "Assistant_MobileAssistant"
}
```

This function will be called whenever you asked about mobile phone related question. When we excute the function, instead of returns the function calling result back to the LLM, we send:

1. `SessionUpdateMessage` to switch the assistant.
1. `response.create` to let the model to continue the message.

### Function Calling 

To simplify the demo, we define the function calling metadata and the function defintion into one object. The `returns` property contains the anonymous function that returns the function calling result.

The below example is the `get weather` function, that always returns the weather as `40F and rainy` with the `location` name.

```typescript
{
    name: 'get_weather',
    description: 'get the weather of the locaion',
    parameters: {
        type: 'object',
        properties: {
            location: { type: 'string', description: 'location for the weather' }
        }
    },
    returns: async (arg: string) => `the weather of ${JSON.parse(arg).location} is 40F and rainy`
}
```


