import { Player } from "./player.ts";
import { Recorder } from "./recorder.ts";
import { AssistantService } from "./assistants.ts";
import "./style.css";
import { LowLevelRTClient, ResponseItem, SessionUpdateMessage } from "rt-client";

let endpoint = import.meta.env.VITE_AOAI_ENDPOINT;
let apiKey = import.meta.env.VITE_AOAI_API_KEY;
let deployment = import.meta.env.VITE_AOAI_DEPLOYMENT;
let realtimeStreaming: LowLevelRTClient;
let audioRecorder: Recorder;
let audioPlayer: Player;
let assistantService = new AssistantService();

async function start_realtime(endpoint: string, apiKey: string, deploymentOrModel: string) {
  if (isAzureOpenAI()) {
    realtimeStreaming = new LowLevelRTClient(new URL(endpoint), { key: apiKey }, { deployment: deploymentOrModel });
  } else {
    realtimeStreaming = new LowLevelRTClient({ key: apiKey }, { model: deploymentOrModel });
  }

  try {
    let configMessage: SessionUpdateMessage = {
      type: "session.update",
      session: {
        turn_detection: {
          type: "server_vad",
        },
        input_audio_transcription: {
          model: "whisper-1"
        }
      }
    };
    assistantService.language = formLanguageField.value;
    let assistant: [systemMessage: string, tools: any[]] = assistantService.createGenericAssistantConfigMessage();
    configMessage.session.instructions = assistant[0];
    formAssistantField.value = "Generic Assistant";
    configMessage.session.tools = assistant[1];
    configMessage.session.voice = getVoice();
    configMessage.session.temperature = getTemperature();
    await realtimeStreaming.send(configMessage);
  } catch (error) {
    console.log(error);
    makeNewTextBlock("[Connection error]: Unable to send initial set_inference_config message. Please check your endpoint and authentication details.");
    setFormInputState(InputState.ReadyToStart);
    return;
  }
  await Promise.all([resetAudio(!formChatOnlyToggle.checked), handleRealtimeMessages()]);
}

let assistantMessage: string = "";
async function handleRealtimeMessages() {
  for await (const message of realtimeStreaming.messages()) {
    //console.log(message.type);

    switch (message.type) {
      case "session.created":
        console.log(JSON.stringify(message, null, 2));
        setFormInputState(InputState.ReadyToStop);
        makeNewTextBlock("<< Session Started >>");
        makeNewTextBlock();
        break;
      case "conversation.item.created":
        if (message.item.type == "message" && message.item.role == "user" && message.item.content[0].type == "input_text") {
          appendMessageId(message.item.id!);
        }
        break;
      case "response.content_part.added":
        makeNewTextBlock();
        appendToTextBlock("Assisatnt: ");
        break;
      case "response.audio_transcript.delta":
        appendToTextBlock(message.delta);
        formReceivedTextContainer.scrollTo(0, formReceivedTextContainer.scrollHeight);
        break;
      case "response.audio.delta":
        const binary = atob(message.delta);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const pcmData = new Int16Array(bytes.buffer);
        audioPlayer.play(pcmData);
        break;
      case "input_audio_buffer.speech_started":
        makeNewTextBlock("");
        let textElements = formReceivedTextContainer.children;
        latestInputSpeechBlock = textElements[textElements.length - 1];
        makeNewTextBlock();
        audioPlayer.clear();
        break;
      case "conversation.item.input_audio_transcription.completed":
        latestInputSpeechBlock.textContent += 
        `User (Speech): ${message.transcript.replace(/[\n\r]+/g, '')} >> ${message.item_id!}`;
        latestInputSpeechBlock.id = message.item_id!;
        break;
      case "response.done":
        message.response.output.forEach(async (output: ResponseItem) => {
          if (output.type == 'function_call') {
            console.log(JSON.stringify(output, null, 2));
            let response = await assistantService.getToolResponse(output.name, output.arguments, output.call_id);
            console.log(JSON.stringify(response, null, 2));
            if (response.type == 'session.update') {
              response.session.voice = getVoice();
              response.session.temperature = getTemperature();
              formAssistantField.value = output.name;
            }
            realtimeStreaming.send(
              response
            );
            realtimeStreaming.send(
              {
                type: 'response.create'
              });
          }
          else if (output.type == 'message') {
            appendMessageId(output.id!);
            console.log(assistantMessage);
            assistantMessage = "";
            formReceivedTextContainer.appendChild(document.createElement("hr"));
          }
        });

        break;
      case "error":
        console.log(JSON.stringify(message, null, 2));
        break;
      default:
        break
    }
  }
  resetAudio(false);
}

/**
 * Basic audio handling
 */

let recordingActive: boolean = false;

// function processAudioRecordingBuffer(buffer: Buffer) {
//   const uint8Array = new Uint8Array(buffer);
//   const regularArray = String.fromCharCode(...uint8Array);
//   const base64 = btoa(regularArray);
//   if (recordingActive) {
//     realtimeStreaming.send({
//       event: "add_user_audio",
//       data: base64,
//     });
//   }
// }
function processAudioRecordingBuffer(base64: string) {
  if (recordingActive) {
    realtimeStreaming.send({
      type: "input_audio_buffer.append",
      audio: base64,
    });
  }
}

async function resetAudio(startRecording: boolean) {
  recordingActive = false;
  if (audioRecorder) {
    audioRecorder.stop();
  }
  if (audioPlayer) {
    audioPlayer.clear();
  }
  audioRecorder = new Recorder(processAudioRecordingBuffer);
  audioPlayer = new Player();
  audioPlayer.init(24000);
  if (startRecording) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioRecorder.start(stream);
    recordingActive = true;
  }
}

/**
 * UI and controls
 */

const formReceivedTextContainer = document.querySelector<HTMLDivElement>("#received-text-container")!;
const formStartButton = document.querySelector<HTMLButtonElement>("#start-recording")!;
const formStopButton = document.querySelector<HTMLButtonElement>("#stop-recording")!;
const formAssistantField = document.querySelector<HTMLInputElement>("#assistant")!;
const formTemperatureField = document.querySelector<HTMLInputElement>("#temperature")!;
const formVoiceSelection = document.querySelector<HTMLInputElement>("#voice")!;
const formLanguageField = document.querySelector<HTMLInputElement>("#language")!;
const formAzureToggle = document.querySelector<HTMLInputElement>("#azure-toggle")!;
const formChatOnlyToggle = document.querySelector<HTMLInputElement>("#chat-only")!;
const chatField = document.querySelector<HTMLTextAreaElement>("#chat")!;
const sendTextButton = document.querySelector<HTMLButtonElement>("#send-text")!;
const deleteItemId = document.querySelector<HTMLButtonElement>("#delete-item-id")!;
const deleteItemButton = document.querySelector<HTMLButtonElement>("#delete-item")!;

let latestInputSpeechBlock: Element;

enum InputState {
  Working,
  ReadyToStart,
  ReadyToStop,
}

function isAzureOpenAI(): boolean {
  return formAzureToggle.checked;
}

function setFormInputState(state: InputState) {
  formStartButton.disabled = state != InputState.ReadyToStart;
  formStopButton.disabled = state != InputState.ReadyToStop;
  formLanguageField.disabled = state != InputState.ReadyToStart;
  formAssistantField.disabled = state != InputState.ReadyToStart;
  formAzureToggle.disabled = state != InputState.ReadyToStart;
  formChatOnlyToggle.disabled = state != InputState.ReadyToStart;
  chatField.disabled = state != InputState.ReadyToStop;
  sendTextButton.disabled = state != InputState.ReadyToStop;
  deleteItemButton.disabled = state != InputState.ReadyToStop;
}

function getTemperature(): number {
  return parseFloat(formTemperatureField.value);
}

function getVoice(): "alloy" | "echo" | "shimmer" {
  return formVoiceSelection.value as "alloy" | "echo" | "shimmer";
}

function makeNewTextBlock(text: string = "") {
  let newElement = document.createElement("p");
  newElement.textContent = text;
  formReceivedTextContainer.appendChild(newElement);
}

function appendMessageId(id: string) {
  let textElements = formReceivedTextContainer.children;
  textElements[textElements.length - 1].id = id;
  textElements[textElements.length - 1].textContent += ` >> ${id}`;
}

function markTextAsDeleted(id: string) {
  let textElements = document.getElementById(id);
  textElements?.classList.add("strike");
}

function appendToTextBlock(text: string) {
  let textElements = formReceivedTextContainer.children;
  if (textElements.length == 0) {
    makeNewTextBlock();
  }
  textElements[textElements.length - 1].textContent += text;
}

formStartButton.addEventListener("click", async () => {
  setFormInputState(InputState.Working);

  try {
    start_realtime(endpoint, apiKey, deployment);
  } catch (error) {
    console.log(error);
    setFormInputState(InputState.ReadyToStart);
  }
});

formStopButton.addEventListener("click", async () => {
  setFormInputState(InputState.Working);
  resetAudio(false);
  realtimeStreaming.close();
  setFormInputState(InputState.ReadyToStart);
});

sendTextButton.addEventListener('click', async () => {
  let input = chatField.value.trim();
  realtimeStreaming.send(
    {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: input
        }]
      }
    }
  );
  audioPlayer.clear();
  appendToTextBlock(`User: ${input}`);
  chatField.value = '';
});

chatField.addEventListener('keypress', async (e) => {
  if (e.key !== 'Enter') {
    return;
  }

  e.preventDefault();

  let input = chatField.value.trim();
  realtimeStreaming.send(
    {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: input
        }]
      }
    }
  );
  realtimeStreaming.send(
    {
      type: 'response.create'
    }
  );
  audioPlayer.clear();
  appendToTextBlock(`User: ${input}`);
  chatField.value = '';
});

deleteItemButton.addEventListener('click', async () => {
  let id = deleteItemId.value.trim();
  if (id != "") {
    realtimeStreaming.send(
      {
        type: 'conversation.item.delete',
        item_id: id
      }
    );
    deleteItemId.value = '';
    markTextAsDeleted(id);
  }
});