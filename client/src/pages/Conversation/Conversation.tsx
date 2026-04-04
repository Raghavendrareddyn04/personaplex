import { FC, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "./hooks/useSocket";
import { SocketContext } from "./SocketContext";
import { ServerAudio } from "./components/ServerAudio/ServerAudio";
import { UserAudio } from "./components/UserAudio/UserAudio";
import { Button } from "../../components/Button/Button";
import { QoboxChrome } from "../../components/QoboxChrome/QoboxChrome";
import { ServerAudioStats } from "./components/ServerAudio/ServerAudioStats";
import { AudioStats } from "./hooks/useServerAudio";
import { TextDisplay } from "./components/TextDisplay/TextDisplay";
import { MediaContext } from "./MediaContext";
import { ServerInfo } from "./components/ServerInfo/ServerInfo";
import { ModelParamsValues, useModelParams } from "./hooks/useModelParams";
import fixWebmDuration from "webm-duration-fix";
import { getMimeType, getExtension } from "./getMimeType";
import { type ThemeType } from "./hooks/useSystemTheme";

type ConversationProps = {
  workerAddr: string;
  workerAuthId?: string;
  sessionAuthId?: string;
  sessionId?: number;
  email?: string;
  theme: ThemeType;
  audioContext: MutableRefObject<AudioContext | null>;
  worklet: MutableRefObject<AudioWorkletNode | null>;
  onConversationEnd?: () => void;
  isBypass?: boolean;
  startConnection: () => Promise<void>;
  /** When set, server retrieves matching Qobox KB chunks instead of the full KB. */
  ragQuery?: string;
} & Partial<ModelParamsValues>;

const buildURL = ({
  workerAddr,
  params,
  workerAuthId,
  email,
  textSeed,
  audioSeed,
  ragQuery,
}: {
  workerAddr: string;
  params: ModelParamsValues;
  workerAuthId?: string;
  email?: string;
  textSeed: number;
  audioSeed: number;
  ragQuery?: string;
}) => {
  let newWorkerAddr = workerAddr;
  if (workerAddr === "same" || workerAddr === "") {
    newWorkerAddr = window.location.hostname + ":" + window.location.port;
    console.log("Overriding workerAddr to", newWorkerAddr);
  }
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(`${wsProtocol}//${newWorkerAddr}/api/chat`);
  if (workerAuthId) {
    url.searchParams.append("worker_auth_id", workerAuthId);
  }
  if (email) {
    url.searchParams.append("email", email);
  }
  url.searchParams.append("text_temperature", params.textTemperature.toString());
  url.searchParams.append("text_topk", params.textTopk.toString());
  url.searchParams.append("audio_temperature", params.audioTemperature.toString());
  url.searchParams.append("audio_topk", params.audioTopk.toString());
  url.searchParams.append("pad_mult", params.padMult.toString());
  url.searchParams.append("text_seed", textSeed.toString());
  url.searchParams.append("audio_seed", audioSeed.toString());
  url.searchParams.append("repetition_penalty_context", params.repetitionPenaltyContext.toString());
  url.searchParams.append("repetition_penalty", params.repetitionPenalty.toString());
  url.searchParams.append("text_prompt", params.textPrompt.toString());
  url.searchParams.append("voice_prompt", params.voicePrompt.toString());
  if (params.includeQoboxKb === false) {
    url.searchParams.append("qobox_kb", "0");
  }
  const rq = ragQuery?.trim();
  if (rq) {
    url.searchParams.append("rag_query", rq);
  }
  console.log(url.toString());
  return url.toString();
};

export const Conversation: FC<ConversationProps> = ({
  workerAddr,
  workerAuthId,
  audioContext,
  worklet,
  sessionAuthId: _sessionAuthId,
  sessionId: _sessionId,
  onConversationEnd: _onConversationEnd,
  startConnection,
  isBypass: _isBypass = false,
  email,
  theme,
  ragQuery,
  ...params
}) => {
  const getAudioStats = useRef<() => AudioStats>(() => ({
    playedAudioDuration: 0,
    missedAudioDuration: 0,
    totalAudioMessages: 0,
    delay: 0,
    minPlaybackDelay: 0,
    maxPlaybackDelay: 0,
  }));
  const isRecording = useRef<boolean>(false);
  const audioChunks = useRef<Blob[]>([]);

  const audioStreamDestination = useRef<MediaStreamAudioDestinationNode>(
    audioContext.current!.createMediaStreamDestination(),
  );
  const stereoMerger = useRef<ChannelMergerNode>(audioContext.current!.createChannelMerger(2));
  const audioRecorder = useRef<MediaRecorder>(
    new MediaRecorder(audioStreamDestination.current.stream, {
      mimeType: getMimeType("audio"),
      audioBitsPerSecond: 128000,
    }),
  );
  const [audioURL, setAudioURL] = useState<string>("");
  const [isOver, setIsOver] = useState(false);
  const modelParams = useModelParams(params);
  const micDuration = useRef<number>(0);
  const actualAudioPlayed = useRef<number>(0);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textSeed = useMemo(() => Math.round(1000000 * Math.random()), []);
  const audioSeed = useMemo(() => Math.round(1000000 * Math.random()), []);

  const WSURL = buildURL({
    workerAddr,
    params: modelParams,
    workerAuthId,
    email: email,
    textSeed: textSeed,
    audioSeed: audioSeed,
    ragQuery,
  });

  const onDisconnect = useCallback(() => {
    setIsOver(true);
    console.log("on disconnect!");
    stopRecording();
  }, [setIsOver]);

  const { socketStatus, sendMessage, socket, start, stop } = useSocket({
    uri: WSURL,
    onDisconnect,
  });
  useEffect(() => {
    audioRecorder.current.ondataavailable = (e) => {
      audioChunks.current.push(e.data);
    };
    audioRecorder.current.onstop = async () => {
      let blob: Blob;
      const mimeType = getMimeType("audio");
      if (mimeType.includes("webm")) {
        blob = await fixWebmDuration(new Blob(audioChunks.current, { type: mimeType }));
      } else {
        blob = new Blob(audioChunks.current, { type: mimeType });
      }
      setAudioURL(URL.createObjectURL(blob));
      audioChunks.current = [];
      console.log("Audio Recording and encoding finished");
    };
  }, [audioRecorder, setAudioURL, audioChunks]);

  useEffect(() => {
    start();
    return () => {
      stop();
    };
  }, [start, workerAuthId]);

  const startRecording = useCallback(() => {
    if (isRecording.current) {
      return;
    }
    console.log(Date.now() % 1000, "Starting recording");
    console.log("Starting recording");
    try {
      stereoMerger.current.disconnect();
    } catch {
      /* noop */
    }
    try {
      worklet.current?.disconnect(audioStreamDestination.current);
    } catch {
      /* noop */
    }
    worklet.current?.connect(stereoMerger.current, 0, 0);
    stereoMerger.current.connect(audioStreamDestination.current);

    setAudioURL("");
    audioRecorder.current.start();
    isRecording.current = true;
  }, [isRecording, worklet, audioStreamDestination, audioRecorder, stereoMerger]);

  const stopRecording = useCallback(() => {
    console.log("Stopping recording");
    console.log("isRecording", isRecording);
    if (!isRecording.current) {
      return;
    }
    try {
      worklet.current?.disconnect(stereoMerger.current);
    } catch {
      /* noop */
    }
    try {
      stereoMerger.current.disconnect(audioStreamDestination.current);
    } catch {
      /* noop */
    }
    audioRecorder.current.stop();
    isRecording.current = false;
  }, [isRecording, worklet, audioStreamDestination, audioRecorder, stereoMerger]);

  const onPressConnect = useCallback(async () => {
    if (isOver) {
      window.location.reload();
    } else {
      audioContext.current?.resume();
      if (socketStatus !== "connected") {
        start();
      } else {
        stop();
      }
    }
  }, [socketStatus, isOver, start, stop]);

  const socketColor = useMemo(() => {
    if (socketStatus === "connected") {
      return "bg-[#15803d]";
    } else if (socketStatus === "connecting") {
      return "bg-orange-300";
    } else {
      return "bg-red-400";
    }
  }, [socketStatus]);

  const socketButtonMsg = useMemo(() => {
    if (isOver) {
      return "New Conversation";
    }
    if (socketStatus === "connected") {
      return "Disconnect";
    } else {
      return "Connecting...";
    }
  }, [isOver, socketStatus]);

  return (
    <SocketContext.Provider
      value={{
        socketStatus,
        sendMessage,
        socket,
      }}
    >
      <QoboxChrome subtitle="Live session">
        <div className="qobox-conversation-grid">
          <aside className="qobox-legend-conv border border-[#14532d] bg-[#22c55e] p-3 text-left text-black">
            <h2 className="mb-2 text-sm font-bold">Legend:</h2>
            <ul className="mb-3 list-disc pl-4 text-[0.75rem] leading-snug">
              <li>Server audio (visualizer) plays the assistant; your mic feeds the model.</li>
              <li>Use Disconnect to end the socket, or New Conversation to reload after a drop.</li>
              <li>Transcript and timing stats appear in the right column.</li>
            </ul>
            <div className="border-t border-[#14532d] pt-2 text-[0.7rem] leading-snug">
              <ServerInfo />
            </div>
          </aside>

          <div className="qobox-conv-controls controls flex items-center justify-center gap-2 text-center">
            <Button onClick={onPressConnect} disabled={socketStatus !== "connected" && !isOver}>
              {socketButtonMsg}
            </Button>
            <div className={`h-4 w-4 rounded-full ${socketColor}`} title={socketStatus} />
          </div>

          {audioContext.current && worklet.current && (
            <MediaContext.Provider
              value={{
                startRecording,
                stopRecording,
                audioContext: audioContext as MutableRefObject<AudioContext>,
                worklet: worklet as MutableRefObject<AudioWorkletNode>,
                audioStreamDestination,
                stereoMerger,
                micDuration,
                actualAudioPlayed,
              }}
            >
              <div className="relative player flex h-full max-h-full w-full flex-col items-center justify-between gap-3 md:p-8">
                <ServerAudio
                  setGetAudioStats={(callback: () => AudioStats) =>
                    (getAudioStats.current = callback)
                  }
                  theme={theme}
                />
                <UserAudio theme={theme} />
                <div className="download-links flex flex-col items-center justify-center pt-4 text-sm">
                  {audioURL && (
                    <a
                      href={audioURL}
                      download={`qobox_audio.${getExtension("audio")}`}
                      className="block pt-2 text-center underline"
                    >
                      Download audio
                    </a>
                  )}
                </div>
              </div>

              <div className="qobox-conv-right">
                <div className="qobox-detail-panel w-full shrink-0">
                  <ServerAudioStats getAudioStats={getAudioStats} />
                </div>
                <div
                  className="qobox-detail-panel qobox-detail-panel--text scrollbar player-text"
                  ref={textContainerRef}
                >
                  <TextDisplay containerRef={textContainerRef} />
                </div>
              </div>
            </MediaContext.Provider>
          )}
        </div>
      </QoboxChrome>
    </SocketContext.Provider>
  );
};
