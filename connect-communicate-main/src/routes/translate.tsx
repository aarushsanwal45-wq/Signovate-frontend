import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Hand,
  Glasses,
  Volume2,
  VolumeX,
  Copy,
  Send,
  Save,
  Play,
  Square,
  Mic,
  MicOff,
  X,
  RefreshCcw,
  Activity,
  Server,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  predictGesture,
  synthesizeSpeech,
  getStatus,
} from "@/lib/api";

export const Route = createFileRoute("/translate")({
  head: () => ({
    meta: [
      { title: "Live Translate — SignovateAI" },
      {
        name: "description",
        content:
          "Real-time sign language translation with camera, gloves, or AR goggles.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <Translate />
    </AppShell>
  ),
});

const SOURCES = [
  { value: "camera", label: "Camera", icon: Camera },
  { value: "gloves", label: "Gloves", icon: Hand },
  { value: "goggles", label: "Goggles", icon: Glasses },
] as const;

/*
 * ─────────────────────────────────────────────────────────────
 * PERFORMANCE SETTINGS
 * ─────────────────────────────────────────────────────────────
 *
 * Camera:
 *   30 FPS
 *
 * AI:
 *   ~12.5 FPS maximum
 *
 * IMPORTANT:
 *   Only ONE /gesture request can be active at a time.
 *
 * This prevents:
 *
 *   frame → request
 *   frame → request
 *   frame → request
 *   frame → request
 *   ...
 *
 * from creating a giant backend queue.
 */

const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

const TARGET_INFERENCE_FPS = 12.5;
const INFERENCE_INTERVAL = 1000 / TARGET_INFERENCE_FPS;

const JPEG_QUALITY = 0.7;

const LETTER_COOLDOWN = 1500;

function Translate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────
  // Camera refs
  // ─────────────────────────────────────────────────────────

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  // Prevent multiple backend requests at once.
  const inferenceBusyRef = useRef(false);

  // Timestamp of last AI inference.
  const lastInferenceRef = useRef(0);

  // Used to invalidate old async requests after stopping camera.
  const runIdRef = useRef(0);

  // ─────────────────────────────────────────────────────────
  // Detection performance
  // ─────────────────────────────────────────────────────────

  const [inferenceLatency, setInferenceLatency] = useState(0);
  const [inferenceFps, setInferenceFps] = useState(0);

  const inferenceCountRef = useRef(0);
  const fpsWindowStartRef = useRef(performance.now());

  // ─────────────────────────────────────────────────────────
  // Translation state
  // ─────────────────────────────────────────────────────────

  const [source, setSource] = useState<string>("camera");

  const [running, setRunning] = useState(false);

  const [confidence, setConfidence] = useState(0);

  const [currentLetter, setCurrentLetter] = useState<string | null>(null);

  const currentLetterRef = useRef<string | null>(null);

  const [sentence, setSentence] = useState("");

  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // Speaker
  // ─────────────────────────────────────────────────────────

  const [autoSpeaker, setAutoSpeaker] = useState(false);

  const autoSpeakerRef = useRef(false);

  // ─────────────────────────────────────────────────────────
  // Model classes
  // ─────────────────────────────────────────────────────────

  const [dynamicClasses, setDynamicClasses] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────
  // Camera
  // ─────────────────────────────────────────────────────────

  const [facingMode, setFacingMode] = useState<
    "user" | "environment"
  >("user");

  // ─────────────────────────────────────────────────────────
  // Backend status
  // ─────────────────────────────────────────────────────────

  const [backendOnline, setBackendOnline] = useState(false);

  // ─────────────────────────────────────────────────────────
  // STT
  // ─────────────────────────────────────────────────────────

  const [isRecording, setIsRecording] = useState(false);

  const [sttTranscript, setSttTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const recognitionRef = useRef<any>(null);

  // ─────────────────────────────────────────────────────────
  // Last accepted letter
  // ─────────────────────────────────────────────────────────

  const lastLetterChangeRef = useRef(0);

  // ─────────────────────────────────────────────────────────
  // Stop everything
  // ─────────────────────────────────────────────────────────

  const stop = () => {
    /*
     * Incrementing this invalidates any old async prediction
     * that might still be returning from the backend.
     */
    runIdRef.current += 1;

    // Stop animation loop.
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Allow future inference.
    inferenceBusyRef.current = false;

    // Stop camera.
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    // Stop separate audio stream if one exists.
    audioStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    audioStreamRef.current = null;

    // Stop speech recognition.
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore if already stopped.
    }

    recognitionRef.current = null;

    // Stop recorder.
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // Ignore if already stopped.
    }

    mediaRecorderRef.current = null;

    // Remove video source.
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setRunning(false);
    setConfidence(0);
    setInferenceLatency(0);
    setInferenceFps(0);

    currentLetterRef.current = null;
    setCurrentLetter(null);
  };

  // ─────────────────────────────────────────────────────────
  // Load backend/model status
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    getStatus()
      .then((res) => {
        if (cancelled) return;

        setBackendOnline(true);

        if (res.classes && res.classes.length > 0) {
          setDynamicClasses(res.classes);
        }
      })
      .catch((err) => {
        console.error("Failed to load backend status:", err);

        if (!cancelled) {
          setBackendOnline(false);
        }
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Camera switching
  // ─────────────────────────────────────────────────────────

  const toggleCamera = () => {
    const newMode =
      facingMode === "user" ? "environment" : "user";

    setFacingMode(newMode);

    if (running) {
      stop();

      setTimeout(() => {
        startWithMode(newMode);
      }, 150);
    }
  };

  const start = async () => {
    await startWithMode(facingMode);
  };

  // ─────────────────────────────────────────────────────────
  // TTS
  // ─────────────────────────────────────────────────────────

  const playSpeech = async (text: string) => {
    if (!text.trim()) return;

    try {
      const result = await synthesizeSpeech(
        text,
        "en",
        "female",
        1.0
      );

      if (result.audio_b64) {
        const audio = new Audio(
          `data:audio/mp3;base64,${result.audio_b64}`
        );

        /*
         * Do not await audio.play().
         * TTS should never block gesture detection.
         */
        audio.play().catch((err) => {
          console.error("Audio play failed:", err);
        });
      }
    } catch (err) {
      console.error("TTS failed:", err);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Process ONE camera frame
  // ─────────────────────────────────────────────────────────

  const processFrame = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    runId: number
  ) => {
    /*
     * If another request is already running,
     * DROP this frame.
     *
     * This is the most important anti-lag mechanism.
     */
    if (inferenceBusyRef.current) {
      return;
    }

    const now = performance.now();

    /*
     * Hard limit inference FPS.
     *
     * 1000 / 12.5 = 80 ms
     */
    if (
      now - lastInferenceRef.current <
      INFERENCE_INTERVAL
    ) {
      return;
    }

    if (video.readyState < 2) {
      return;
    }

    /*
     * Keep canvas resolution fixed.
     *
     * We do NOT continuously resize the canvas to the
     * camera's native resolution.
     */
    if (
      canvas.width !== CAMERA_WIDTH ||
      canvas.height !== CAMERA_HEIGHT
    ) {
      canvas.width = CAMERA_WIDTH;
      canvas.height = CAMERA_HEIGHT;
    }

    ctx.drawImage(
      video,
      0,
      0,
      CAMERA_WIDTH,
      CAMERA_HEIGHT
    );

    /*
     * Mark busy BEFORE toBlob().
     *
     * Otherwise another animation frame could start another
     * request while the JPEG is being generated.
     */
    inferenceBusyRef.current = true;

    lastInferenceRef.current = now;

    const requestStart = performance.now();

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          inferenceBusyRef.current = false;
          return;
        }

        try {
          /*
           * If camera was stopped/restarted while the JPEG was
           * being created, don't send/use this old frame.
           */
          if (runId !== runIdRef.current) {
            return;
          }

          const result = await predictGesture(blob);

          /*
           * Ignore stale results.
           */
          if (runId !== runIdRef.current) {
            return;
          }

          const latency =
            performance.now() - requestStart;

          setInferenceLatency(Math.round(latency));

          // ───────────────────────────────────────────────
          // Calculate actual inference FPS
          // ───────────────────────────────────────────────

          inferenceCountRef.current += 1;

          const fpsNow = performance.now();

          const elapsed =
            fpsNow - fpsWindowStartRef.current;

          if (elapsed >= 1000) {
            const calculatedFps =
              (inferenceCountRef.current * 1000) /
              elapsed;

            setInferenceFps(
              Math.min(
                TARGET_INFERENCE_FPS,
                Math.round(calculatedFps * 10) / 10
              )
            );

            inferenceCountRef.current = 0;
            fpsWindowStartRef.current = fpsNow;
          }

          // ───────────────────────────────────────────────
          // Successful prediction
          // ───────────────────────────────────────────────

          if (
            result.ok &&
            result.letter &&
            typeof result.confidence === "number"
          ) {
            const percentage = Math.round(
              result.confidence * 100
            );

            setConfidence(
              Math.max(0, Math.min(100, percentage))
            );

            const currentTime = performance.now();

            /*
             * Only accept a new letter every 1.5 seconds.
             *
             * This prevents:
             *
             * A A A A A A
             *
             * from being added while the user holds A.
             */
            if (
              result.letter !==
                currentLetterRef.current &&
              currentTime - lastLetterChangeRef.current >
                LETTER_COOLDOWN
            ) {
              currentLetterRef.current =
                result.letter;

              lastLetterChangeRef.current =
                currentTime;

              setCurrentLetter(result.letter);

              setSentence((previous) => {
                return (
                  previous +
                  (previous ? " " : "") +
                  result.letter
                );
              });

              /*
               * TTS is completely fire-and-forget.
               *
               * Detection does NOT wait for speech.
               */
              if (autoSpeakerRef.current) {
                playSpeech(result.letter);
              }
            }
          } else if (result.error === "no_hand") {
            setConfidence(0);

            /*
             * Reset current letter when the hand disappears.
             * This allows the same gesture to be detected again.
             */
            currentLetterRef.current = null;
            setCurrentLetter(null);
          }
        } catch (err) {
          /*
           * Don't destroy the camera loop because one request
           * failed.
           */
          console.error(
            "Gesture prediction error:",
            err
          );
        } finally {
          /*
           * Allow the next frame to be processed.
           */
          inferenceBusyRef.current = false;
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  };

  // ─────────────────────────────────────────────────────────
  // Start camera + optimized inference loop
  // ─────────────────────────────────────────────────────────

  const startWithMode = async (
    mode: "user" | "environment"
  ) => {
    setError(null);

    try {
      /*
       * Stop anything left over from a previous session.
       */
      stop();

      /*
       * New run ID.
       */
      const runId = runIdRef.current;

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: CAMERA_WIDTH,
              max: CAMERA_WIDTH,
            },
            height: {
              ideal: CAMERA_HEIGHT,
              max: CAMERA_HEIGHT,
            },
            frameRate: {
              ideal: 30,
              max: 30,
            },
            facingMode: mode,
          },

          /*
           * Keep audio because your STT feature can use the
           * camera microphone.
           */
          audio: true,
        });

      /*
       * Check if the user stopped/restarted while permission
       * dialog was open.
       */
      if (runId !== runIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // ───────────────────────────────────────────────────
      // Extract microphone track for STT
      // ───────────────────────────────────────────────────

      const audioTracks = stream.getAudioTracks();

      if (audioTracks.length > 0) {
        audioStreamRef.current =
          new MediaStream(audioTracks);
      }

      // ───────────────────────────────────────────────────
      // Attach camera
      // ───────────────────────────────────────────────────

      const video = videoRef.current;

      if (!video) {
        throw new Error("Video element unavailable");
      }

      video.srcObject = stream;

      await video.play();

      /*
       * Tell the browser the camera is active.
       */
      setRunning(true);
      setBackendOnline(true);

      // Reset performance metrics.
      lastInferenceRef.current = 0;
      inferenceCountRef.current = 0;
      fpsWindowStartRef.current =
        performance.now();

      inferenceBusyRef.current = false;

      // ───────────────────────────────────────────────────
      // Canvas
      // ───────────────────────────────────────────────────

      const canvas = canvasRef.current;

      if (!canvas) {
        throw new Error("Canvas unavailable");
      }

      canvas.width = CAMERA_WIDTH;
      canvas.height = CAMERA_HEIGHT;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error(
          "Could not create canvas context"
        );
      }

      /*
       * ────────────────────────────────────────────────
       * REQUESTANIMATIONFRAME LOOP
       * ────────────────────────────────────────────────
       *
       * The browser can render at 30/60 FPS.
       *
       * We simply SAMPLE it at ~12.5 FPS for AI.
       *
       * This gives us a smooth camera without hammering
       * the backend.
       */

      const tick = () => {
        if (runId !== runIdRef.current) {
          return;
        }

        if (!videoRef.current) {
          return;
        }

        processFrame(
          video,
          canvas,
          ctx,
          runId
        );

        animationFrameRef.current =
          requestAnimationFrame(tick);
      };

      animationFrameRef.current =
        requestAnimationFrame(tick);
    } catch (e: any) {
      console.error("Camera start error:", e);

      setError(
        e?.message ?? "Could not start camera"
      );

      setBackendOnline(false);

      toast.error(
        "Camera access denied or unavailable"
      );

      stop();
    }
  };

  // ─────────────────────────────────────────────────────────
  // Speak sentence
  // ─────────────────────────────────────────────────────────

  const speak = async (text: string) => {
    const value = text.trim();

    if (!value) {
      toast.info("Nothing to speak");
      return;
    }

    await playSpeech(value);
  };

  // ─────────────────────────────────────────────────────────
  // Copy sentence
  // ─────────────────────────────────────────────────────────

  const copy = async () => {
    if (!sentence.trim()) {
      toast.info("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(sentence);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy text");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Delete trained gesture
  // ─────────────────────────────────────────────────────────

  const deleteGesture = async (
    gesture: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to remove "${gesture}" from the trained model? This will delete all training data for this gesture.`
      )
    ) {
      return;
    }

    try {
      const {
        deleteGesture: deleteGestureAPI,
        retrainAfterDeletion,
      } = await import("@/lib/api");

      const result =
        await deleteGestureAPI(gesture);

      toast.success(result.message);

      // Immediately update UI.
      setDynamicClasses((previous) =>
        previous.filter(
          (g) => g !== gesture
        )
      );

      // Ask about retraining.
      if (
        confirm(
          "Gesture deleted. Do you want to retrain the model now? (This may take a few minutes)"
        )
      ) {
        const retrainResult =
          await retrainAfterDeletion();

        toast.info(
          retrainResult.message
        );
      } else {
        toast.info(
          "Remember to retrain the model to update predictions"
        );
      }

      // Refresh model classes.
      setTimeout(() => {
        getStatus()
          .then((res) => {
            if (
              res.classes &&
              res.classes.length > 0
            ) {
              setDynamicClasses(
                res.classes
              );
            }
          })
          .catch(console.error);
      }, 500);
    } catch (err: any) {
      toast.error(
        err?.message ||
          "Failed to delete gesture"
      );
    }
  };

  // ─────────────────────────────────────────────────────────
  // Speech-to-text
  // ─────────────────────────────────────────────────────────

  const toggleRecording = async () => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Already stopped.
      }

      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // Already stopped.
      }

      setIsRecording(false);

      return;
    }

    try {
      /*
       * Use the existing camera microphone whenever possible.
       */
      let stream =
        audioStreamRef.current;

      if (!stream) {
        stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
            }
          );
      }

      // ───────────────────────────────────────────────
      // Browser Web Speech API
      // ───────────────────────────────────────────────

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any)
          .webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition =
          new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        recognition.onresult = (
          event: any
        ) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
          ) {
            if (
              event.results[i].isFinal
            ) {
              finalTranscript +=
                event.results[i][0]
                  .transcript;
            } else {
              interimTranscript +=
                event.results[i][0]
                  .transcript;
            }
          }

          setSttTranscript(
            finalTranscript +
              interimTranscript
          );
        };

        recognition.onerror = (
          event: any
        ) => {
          console.error(
            "Speech recognition error:",
            event.error
          );

          if (
            event.error ===
            "not-allowed"
          ) {
            toast.error(
              "Microphone permission denied"
            );
          }
        };

        recognition.onend = () => {
          /*
           * Don't automatically restart here.
           * It can create loops when the browser ends
           * recognition due to permissions/network issues.
           */
        };

        recognitionRef.current =
          recognition;

        recognition.start();
      } else {
        toast.info(
          "Live browser speech recognition is not supported in this browser"
        );
      }

      // ───────────────────────────────────────────────
      // MediaRecorder backup
      // ───────────────────────────────────────────────

      if (
        typeof MediaRecorder !==
        "undefined"
      ) {
        const mediaRecorder =
          new MediaRecorder(stream);

        mediaRecorderRef.current =
          mediaRecorder;

        mediaRecorder.onstop = () => {
          /*
           * Only stop the stream if we created a
           * separate microphone stream.
           */
          if (
            !audioStreamRef.current
          ) {
            stream
              .getTracks()
              .forEach((track) =>
                track.stop()
              );
          }
        };

        mediaRecorder.start();
      }

      setSttTranscript("");
      setIsRecording(true);
    } catch (err) {
      console.error(
        "Microphone error:",
        err
      );

      toast.error(
        "Microphone access denied"
      );
    }
  };

  // ─────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
      {/* ═══════════════════════════════════════════════════
          LEFT — CAMERA
      ═══════════════════════════════════════════════════ */}

      <div className="space-y-3">
        <div className="glow-card p-3 md:p-4">
          {/* Camera */}
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover hidden"
              muted
              playsInline
            />

            <canvas
              ref={canvasRef}
              className={cn(
                "w-full h-full object-cover",
                !running && "hidden"
              )}
            />

            {!running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                <Camera className="h-8 w-8 mb-1 opacity-60" />

                <div className="text-xs">
                  Camera feed will appear here
                </div>

                {error && (
                  <div className="text-[10px] text-destructive mt-2 text-center px-4">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Live indicator */}
            {running && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>

                <span className="text-[10px] font-semibold text-white">
                  LIVE
                </span>
              </div>
            )}

            {/* Performance overlay */}
            {running && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <div className="px-2 py-1 rounded-md bg-black/65 backdrop-blur-md border border-white/10 text-[9px] text-white/80">
                  AI{" "}
                  {inferenceFps > 0
                    ? `${inferenceFps} FPS`
                    : "—"}
                </div>

                <div className="px-2 py-1 rounded-md bg-black/65 backdrop-blur-md border border-white/10 text-[9px] text-white/80">
                  {inferenceLatency > 0
                    ? `${inferenceLatency}ms`
                    : "—"}
                </div>
              </div>
            )}
          </div>

          {/* Source selector */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SOURCES.map((s) => {
              const Icon = s.icon;

              const active =
                source === s.value;

              return (
                <button
                  key={s.value}
                  onClick={() =>
                    setSource(s.value)
                  }
                  className={cn(
                    "py-1.5 px-1 sm:px-2 rounded-lg border text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-2 transition",
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />

                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-row gap-2">
            <Button
              size="sm"
              onClick={
                running ? stop : start
              }
              className={cn(
                "flex-1 h-9",
                running &&
                  "bg-destructive hover:bg-destructive/90"
              )}
            >
              {running ? (
                <>
                  <Square className="h-3.5 w-3.5 mr-1.5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Start translation
                </>
              )}
            </Button>

            {source === "camera" && (
              <Button
                size="sm"
                variant="outline"
                onClick={toggleCamera}
                className="px-3 h-9"
                title="Switch Camera"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            )}

            <Button
              size="sm"
              variant={
                autoSpeaker
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                const next =
                  !autoSpeaker;

                autoSpeakerRef.current =
                  next;

                setAutoSpeaker(next);
              }}
              className={cn(
                "flex-1 h-9",
                autoSpeaker &&
                  "bg-primary-soft text-primary"
              )}
            >
              {autoSpeaker ? (
                <Volume2 className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 mr-1.5" />
              )}

              Auto Speaker{" "}
              {autoSpeaker ? "On" : "Off"}
            </Button>
          </div>

          {/* Confidence */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span>Confidence</span>

              <span>{confidence}%</span>
            </div>

            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-success transition-all duration-150"
                style={{
                  width: `${confidence}%`,
                }}
              />
            </div>
          </div>

          {/* Backend / performance status */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="stat-box p-2">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wide">
                <Server className="h-3 w-3" />

                Backend
              </div>

              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    backendOnline
                      ? "bg-success shadow-[0_0_8px_var(--color-success)]"
                      : "bg-destructive"
                  )}
                />

                <span className="text-[10px] font-medium">
                  {backendOnline
                    ? "Online"
                    : "Offline"}
                </span>
              </div>
            </div>

            <div className="stat-box p-2">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wide">
                <Activity className="h-3 w-3" />

                AI FPS
              </div>

              <div className="mt-1 text-xs font-bold">
                {inferenceFps > 0
                  ? inferenceFps
                  : "—"}
              </div>
            </div>

            <div className="stat-box p-2">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wide">
                <Zap className="h-3 w-3" />

                Latency
              </div>

              <div className="mt-1 text-xs font-bold">
                {inferenceLatency > 0
                  ? `${inferenceLatency}ms`
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT — OUTPUT
      ═══════════════════════════════════════════════════ */}

      <div className="flex flex-col gap-3">
        {/* ───────────────────────────────────────────────
            STT
        ─────────────────────────────────────────────── */}

        <div className="order-2 lg:order-1 glow-card p-3 md:p-4 border-l-4 border-l-primary flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold flex items-center gap-2">
              <Mic
                className={cn(
                  "h-3.5 w-3.5",
                  isRecording &&
                    "text-destructive animate-pulse"
                )}
              />

              Speech to Text (Live)
            </div>

            {isRecording && (
              <span className="flex h-2 w-2 rounded-full bg-destructive animate-ping" />
            )}
          </div>

          <div className="relative min-h-[72px] max-h-[120px] p-3 rounded-xl bg-muted/30 border border-border/50 text-sm leading-relaxed text-foreground overflow-y-auto scrollbar-hide">
            {sttTranscript ? (
              <span className="font-medium whitespace-pre-wrap">
                {sttTranscript}

                {isRecording && (
                  <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse align-middle" />
                )}
              </span>
            ) : (
              <span className="text-muted-foreground italic">
                {isRecording
                  ? "Listening for your voice..."
                  : "Tap the microphone to start live transcription..."}
              </span>
            )}
          </div>

          <div className="flex justify-center pt-1">
            <button
              onClick={toggleRecording}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-md hover:scale-110 active:scale-95",
                isRecording
                  ? "bg-destructive text-white shadow-destructive/20 ring-4 ring-destructive/10"
                  : "bg-primary text-white shadow-primary/20 hover:bg-primary/90"
              )}
            >
              {isRecording ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────
            DETECTED SIGN
        ─────────────────────────────────────────────── */}

        <div className="order-1 lg:order-2 glow-card p-3 md:p-4">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Detected sign
          </div>

          <div className="font-display text-3xl md:text-4xl font-bold text-primary mt-0.5 min-h-[40px] leading-none">
            {currentLetter ?? "—"}
          </div>

          <div className="mt-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">
              Sentence
            </div>

            <div className="min-h-[44px] p-2.5 rounded-lg bg-muted text-foreground text-sm">
              {sentence || (
                <span className="text-muted-foreground">
                  Start signing to build text...
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={() =>
                  speak(sentence)
                }
              >
                <Volume2 className="h-3 w-3 mr-1" />

                Speak
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={copy}
              >
                <Copy className="h-3 w-3 mr-1" />

                Copy
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={() => {
                  if (!sentence.trim()) {
                    toast.info(
                      "Nothing to send"
                    );
                    return;
                  }

                  /*
                   * Preserve the existing Send UI.
                   * Add your preferred sharing/API action here
                   * when your backend supports it.
                   */
                  toast.info(
                    "Send action ready"
                  );
                }}
              >
                <Send className="h-3 w-3 mr-1" />

                Send
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={() =>
                  toast.success(
                    "Saved to history"
                  )
                }
              >
                <Save className="h-3 w-3 mr-1" />

                Save
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-xs"
                onClick={() => {
                  setSentence("");
                  setCurrentLetter(null);
                  currentLetterRef.current =
                    null;
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────
            AVAILABLE GESTURES
        ─────────────────────────────────────────────── */}

        <div className="order-3 glow-card p-3 md:p-4">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
            Available Gestures (Trained Model)
          </div>

          <div className="flex flex-wrap gap-1.5">
            {dynamicClasses.length > 0 ? (
              dynamicClasses.map((gesture) => (
                <div
                  key={gesture}
                  className={cn(
                    "group relative px-2.5 py-1 rounded-full text-xs font-medium transition flex items-center gap-1.5",
                    currentLetter ===
                      gesture
                      ? "bg-primary text-primary-foreground scale-105 shadow-md"
                      : "bg-primary-soft text-primary hover:bg-primary/20"
                  )}
                >
                  <button
                    onClick={() => {
                      setSentence(
                        (previous) =>
                          previous +
                          (previous
                            ? " "
                            : "") +
                          gesture
                      );

                      if (
                        autoSpeakerRef.current
                      ) {
                        playSpeech(
                          gesture
                        );
                      }
                    }}
                    className="flex-1"
                  >
                    {gesture}
                  </button>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();

                      deleteGesture(
                        gesture
                      );
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/20 rounded-full"
                    title="Remove from model"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                Loading available gestures...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}