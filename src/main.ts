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
    switch (message.type) {
      case "session.created":
        setFormInputState(InputState.ReadyToStop);
        makeNewTextBlock("<< セッション開始 >>", "system");
        break;
      case "conversation.item.created":
        // itemは画面に表示しない
        break;
      case "response.content_part.added":
        makeNewTextBlock("", "assistant");
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
        makeNewTextBlock("", "user");
        let textElements = formReceivedTextContainer.querySelectorAll('.chat-bubble.user');
        latestInputSpeechBlock = textElements[textElements.length - 1];
        audioPlayer.clear();
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (latestInputSpeechBlock) {
          latestInputSpeechBlock.textContent += `User: ${message.transcript.replace(/\n|\r/g, '')}`;
        }
        break;
      case "response.done":
        message.response.output.forEach(async (output: ResponseItem) => {
          if (output.type == 'function_call') {
            let response = await assistantService.getToolResponse(output.name, output.arguments, output.call_id);
            if (response.type == 'session.update') {
              response.session.voice = getVoice();
              response.session.temperature = getTemperature();
              formAssistantField.value = output.name;
            }
            realtimeStreaming.send(response);
            realtimeStreaming.send({ type: 'response.create' });
          }
          else if (output.type == 'message') {
            // Assistantの返答をバブルで表示（text型のみ抽出）
            const textPart = output.content.find(part => part.type === 'text');
            makeNewTextBlock(textPart ? (textPart as any).text : "", "assistant");
          }
        });
        break;
      case "error":
        // エラーはsystemとして表示
        makeNewTextBlock("[エラー] " + JSON.stringify(message), "system");
        break;
      default:
        break;
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

function makeNewTextBlock(text: string = "", role: "user"|"assistant"|"system" = "assistant") {
  if (role === "system") return;
  const wrapper = document.createElement("div");
  wrapper.className = `chat-row ${role}`;

  // アイコン
  const icon = document.createElement("span");
  icon.className = "icon-large";
  icon.textContent = role === "user" ? "😊" : "🤖";

  // バブル
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  const span = document.createElement("span");
  span.textContent = text;
  bubble.appendChild(span);

  if (role === "user") {
    // ユーザー: 右寄せ、バブル→アイコンの順
    wrapper.appendChild(bubble);
    wrapper.appendChild(icon);
    wrapper.style.justifyContent = "flex-end";
  } else {
    // アシスタント: 左寄せ、アイコン→バブルの順
    wrapper.appendChild(icon);
    wrapper.appendChild(bubble);
    wrapper.style.justifyContent = "flex-start";
  }
  formReceivedTextContainer.appendChild(wrapper);
}

function appendToTextBlock(text: string) {
  // 最後のバブルに追記
  const textElements = formReceivedTextContainer.querySelectorAll('.chat-bubble');
  if (textElements.length === 0) {
    makeNewTextBlock("", "assistant");
  }
  textElements[textElements.length - 1].textContent += text;
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
  realtimeStreaming.send({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: input }]
    }
  });
  audioPlayer.clear();
  makeNewTextBlock(input, "user");
  chatField.value = '';
});

chatField.addEventListener('keypress', async (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  let input = chatField.value.trim();
  realtimeStreaming.send({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: input }]
    }
  });
  realtimeStreaming.send({ type: 'response.create' });
  audioPlayer.clear();
  makeNewTextBlock(input, "user");
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