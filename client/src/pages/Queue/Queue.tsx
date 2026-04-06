import moshiProcessorUrl from "../../audio-processor.ts?worker&url";
import { FC, useEffect, useState, useCallback, useRef, MutableRefObject } from "react";
import eruda from "eruda";
import { useSearchParams } from "react-router-dom";
import { Conversation } from "../Conversation/Conversation";
import { Button } from "../../components/Button/Button";
import { QoboxChrome } from "../../components/QoboxChrome/QoboxChrome";
import { useModelParams } from "../Conversation/hooks/useModelParams";
import { env } from "../../env";
import { prewarmDecoderWorker } from "../../decoder/decoderWorker";

const VOICE_OPTIONS = [
  "NATF0.pt", "NATF1.pt", "NATF2.pt", "NATF3.pt",
  "NATM0.pt", "NATM1.pt", "NATM2.pt", "NATM3.pt",
  "VARF0.pt", "VARF1.pt", "VARF2.pt", "VARF3.pt", "VARF4.pt",
  "VARM0.pt", "VARM1.pt", "VARM2.pt", "VARM3.pt", "VARM4.pt",
];

const TEXT_PROMPT_PRESETS = [
  {
    label: "Assistant (default)",
    text: "You are a wise and friendly teacher. Answer questions or provide advice in a clear and engaging way.",
  },
  {
    label: "888 IVR (1-9 menu)",
    text: "You are 888 IVR. First response must be short: greet and ask caller to press or say one number from 1 to 9. Menu: 1 My Best Offers, 2 Data Bundles, 3 Voice Bundles, 4 Mixed & Other Bundles, 5 Services, 6 Packages & Migration, 7 Balance Inquiry, 8 Further Assistance, 9 DRN Bundles/Deactivation. Accept only one digit (1-9). If invalid, reprompt briefly. After valid input, confirm selected number and continue only in that branch with concise call-center replies.",
    disableQoboxKb: true,
  },
  {
    label: "Medical office (service)",
    text: "You work for Dr. Jones's medical office, and you are receiving calls to record information for new patients. Information: Record full name, date of birth, any medication allergies, tobacco smoking history, alcohol consumption history, and any prior medical conditions. Assure the patient that this information will be confidential, if they ask.",
  },
  {
    label: "Bank (service)",
    text: "You work for First Neuron Bank which is a bank and your name is Alexis Kim. Information: The customer's transaction for $1,200 at Home Depot was declined. Verify customer identity. The transaction was flagged due to unusual location (transaction attempted in Miami, FL; customer normally transacts in Seattle, WA).",
  },
  {
    label: "Astronaut (fun)",
    text: "You enjoy having a good conversation. Have a technical discussion about fixing a reactor core on a spaceship to Mars. You are an astronaut on a Mars mission. Your name is Alex. You are already dealing with a reactor core meltdown on a Mars mission. Several ship systems are failing, and continued instability will lead to catastrophic failure. You explain what is happening and you urgently ask for help thinking through how to stabilize the reactor.",
  },
];

interface HomepageProps {
  showMicrophoneAccessMessage: boolean;
  startConnection: () => Promise<void>;
  textPrompt: string;
  setTextPrompt: (value: string) => void;
  voicePrompt: string;
  setVoicePrompt: (value: string) => void;
  includeQoboxKb: boolean;
  setIncludeQoboxKb: (value: boolean) => void;
}

const Homepage = ({
  startConnection,
  showMicrophoneAccessMessage,
  textPrompt,
  setTextPrompt,
  voicePrompt,
  setVoicePrompt,
  includeQoboxKb,
  setIncludeQoboxKb,
}: HomepageProps) => {
  return (
    <QoboxChrome subtitle="Session setup">
      <div className="qobox-home-grid">
        <aside className="qobox-legend-panel">
          <h2>Legend:</h2>
          <ul>
            <li>Grant microphone access when the browser asks—required for duplex audio.</li>
            <li>Define the assistant behavior with a text prompt; use presets or write your own (max 1000 characters).</li>
            <li>Select a voice profile (natural or variety) for synthesized replies.</li>
            <li>Connect to start the live session with the server.</li>
          </ul>
        </aside>

        <div className="qobox-home-flow-col">
          <div className="qobox-flow-box">
            <div className="qobox-flow-box-title">Text prompt</div>
            <label htmlFor="text-prompt" className="sr-only">
              Text prompt
            </label>
            <div className="mb-2 border border-zinc-400 bg-zinc-50 p-2">
              <span className="mb-1 block text-left text-[0.65rem] font-medium text-zinc-600">
                Examples:
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {TEXT_PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setTextPrompt(preset.text);
                      if (preset.disableQoboxKb) {
                        setIncludeQoboxKb(false);
                      }
                    }}
                    className="rounded-sm border border-zinc-400 bg-white px-2 py-0.5 text-[0.65rem] text-zinc-800 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="text-prompt"
              name="text-prompt"
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              className="h-28 w-full resize-y border border-zinc-400 bg-white p-2 text-sm text-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#15803d]"
              placeholder="Enter your text prompt..."
              maxLength={1000}
            />
            <div className="mt-1 text-right text-[0.65rem] text-zinc-600">
              {textPrompt.length}/1000
            </div>
            <div className="mt-3 flex items-start gap-2 border-t border-zinc-200 pt-3 text-left">
              <input
                id="include-qobox-kb"
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 border-zinc-400 text-[#15803d] focus:ring-[#15803d]"
                checked={includeQoboxKb}
                onChange={(e) => setIncludeQoboxKb(e.target.checked)}
              />
              <label htmlFor="include-qobox-kb" className="text-[0.8rem] leading-snug text-zinc-800">
                Include Qobox company knowledge in this session (server merges the knowledge base into
                the system prompt). Turn off for the original behavior with only your text prompt above.
              </label>
            </div>
          </div>

          <div className="qobox-flow-arrow" aria-hidden>
            ↓
          </div>

          <div className="qobox-flow-box">
            <div className="qobox-flow-box-title">Voice</div>
            <label htmlFor="voice-prompt" className="sr-only">
              Voice
            </label>
            <select
              id="voice-prompt"
              name="voice-prompt"
              value={voicePrompt}
              onChange={(e) => setVoicePrompt(e.target.value)}
              className="w-full border border-zinc-400 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            >
              {VOICE_OPTIONS.map((voice) => (
                <option key={voice} value={voice}>
                  {voice
                    .replace(".pt", "")
                    .replace(/^NAT/, "NATURAL_")
                    .replace(/^VAR/, "VARIETY_")}
                </option>
              ))}
            </select>
          </div>

          <div className="qobox-flow-arrow" aria-hidden>
            ↓
          </div>

          <div className="qobox-flow-box">
            <div className="qobox-flow-box-title">Connect</div>
            {showMicrophoneAccessMessage && (
              <p className="mb-2 text-center text-xs text-red-600">
                Please enable your microphone before proceeding
              </p>
            )}
            <div className="flex justify-center">
              <Button onClick={async () => await startConnection()}>Connect</Button>
            </div>
          </div>
        </div>

        <div className="qobox-home-detail-col">
          <div className="qobox-detail-panel" data-step="1">
            Example dialogue style: greeting and assistance (e.g. a friendly teacher answering clearly).
            Presets cover assistant, medical intake, bank verification, or technical crisis roleplay—tap
            one to load, or write your own instructions.
          </div>
          <div className="hidden qobox-flow-arrow lg:block" aria-hidden>
            ↓
          </div>
          <div className="qobox-detail-panel" data-step="2">
            Choose a natural or variety voice bundle for the assistant output. Each option maps to a
            different speaker checkpoint.
          </div>
          <div className="hidden qobox-flow-arrow lg:block" aria-hidden>
            ↓
          </div>
          <div className="qobox-detail-panel" data-step="3">
            The browser will request microphone permission when you connect. Approve it so your speech
            can reach the assistant in real time.
          </div>
          <div className="hidden qobox-flow-arrow lg:block" aria-hidden>
            ↓
          </div>
          <div className="qobox-detail-panel" data-step="4">
            Starts the duplex WebSocket session: you speak, the model replies with audio and text.
            Ensure the worker is reachable from this page.
          </div>
        </div>
      </div>
    </QoboxChrome>
  );
};

export const Queue: FC = () => {
  const theme = "light" as const;
  const [searchParams] = useSearchParams();
  const overrideWorkerAddr = searchParams.get("worker_addr");
  const [hasMicrophoneAccess, setHasMicrophoneAccess] = useState<boolean>(false);
  const [showMicrophoneAccessMessage, setShowMicrophoneAccessMessage] = useState<boolean>(false);
  const modelParams = useModelParams();

  const audioContext = useRef<AudioContext | null>(null);
  const worklet = useRef<AudioWorkletNode | null>(null);

  useEffect(() => {
    if (env.VITE_ENV === "development") {
      eruda.init();
    }
    return () => {
      if (env.VITE_ENV === "development") {
        eruda.destroy();
      }
    };
  }, []);

  const getMicrophoneAccess = useCallback(async () => {
    try {
      await window.navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicrophoneAccess(true);
      return true;
    } catch (e) {
      console.error(e);
      setShowMicrophoneAccessMessage(true);
      setHasMicrophoneAccess(false);
    }
    return false;
  }, [setHasMicrophoneAccess, setShowMicrophoneAccessMessage]);

  const startProcessor = useCallback(async () => {
    if (!audioContext.current) {
      audioContext.current = new AudioContext();
      prewarmDecoderWorker(audioContext.current.sampleRate);
    }
    if (worklet.current) {
      return;
    }
    const ctx = audioContext.current;
    ctx.resume();
    try {
      worklet.current = new AudioWorkletNode(ctx, "moshi-processor");
    } catch {
      await ctx.audioWorklet.addModule(moshiProcessorUrl);
      worklet.current = new AudioWorkletNode(ctx, "moshi-processor");
    }
    worklet.current.connect(ctx.destination);
  }, [audioContext, worklet]);

  const startConnection = useCallback(async () => {
    await startProcessor();
    await getMicrophoneAccess();
  }, [startProcessor, getMicrophoneAccess]);

  return (
    <>
      {hasMicrophoneAccess && audioContext.current && worklet.current ? (
        <Conversation
          workerAddr={overrideWorkerAddr ?? ""}
          audioContext={audioContext as MutableRefObject<AudioContext | null>}
          worklet={worklet as MutableRefObject<AudioWorkletNode | null>}
          theme={theme}
          startConnection={startConnection}
          {...modelParams}
        />
      ) : (
        <Homepage
          startConnection={startConnection}
          showMicrophoneAccessMessage={showMicrophoneAccessMessage}
          textPrompt={modelParams.textPrompt}
          setTextPrompt={modelParams.setTextPrompt}
          voicePrompt={modelParams.voicePrompt}
          setVoicePrompt={modelParams.setVoicePrompt}
          includeQoboxKb={modelParams.includeQoboxKb}
          setIncludeQoboxKb={modelParams.setIncludeQoboxKb}
        />
      )}
    </>
  );
};
