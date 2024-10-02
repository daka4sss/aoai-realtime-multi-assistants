# Azure OpenAI /realtime: an interactive chat with multi-assistants

This repo contains a node sample application that uses AOAI Realtime Audio endpoint. See more detail about the SDK at [AOAI Realtime Audio SDK](https://github.com/Azure-Samples/aoai-realtime-audio-sdk)

This bot switches multiple assiants (system prompt + tools set) seamlessly depending on user needs.

## Scenario

You can ask about mobile service, such as 

- Billing
- Current plan
- Options
- Consulation on usage
- Shop related question, etc.

You can find the assistant definition at [assistants.ts](./src//assistants.ts).
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

## Known issues

1. Connection errors are not yet gracefully handled and looping error spew may be observed in script debug output. Please just refresh the web page if an error appears.
1. Voice selection is not yet supported.
1. More authentication mechanisms, including keyless support via Entra, will come in a future service update.

## Code description

This sample uses a custom client to simplify the usage of the realtime API. The client package is included  in this repo in the `rt-client-0.4.6.tgz` file.

The primary file demonstrating `/realtime` use is [src/main.ts](./src/main.ts); the first few functions demonstrate connecting to `/realtime` using the client, sending an inference configuration message, and then processing the send/receive of messages on the connection.
