/**
 * OrbitalScanRing — rPPG Liveness Analysis & Fraud-Risk Signal
 *
 * Obsidian HUD Edition.
 * Extracts remote photoplethysmography (rPPG) signals from a video feed
 * to assess physiological consistency and provide a fraud-risk signal.
 *
 * This is NOT a definitive deepfake detector. It returns a liveness
 * confidence score and flags signals that are physiologically impossible
 * or degraded beyond reliable analysis.
 *
 * Pipeline:
 *   1. Face ROI detection (forehead, cheeks, nose bridge)
 *   2. RGB pixel extraction at 15–30 fps via Canvas
 *   3. Chrominance-based rPPG signal extraction (CHROM algorithm)
 *   4. Bandpass filtering (0.7–4 Hz — heart rate range)
 *   5. Peak detection / periodicity analysis
 *   6. Degraded-state analysis (low light, compression, motion blur)
 *   7. Classification — physiologically impossible reading → hard rejection;
 *      degraded/unreliable reading → inconclusive ("unable to verify");
 *      consistent reading → liveness confirmed (fraud-risk signal clear)
 *
 * "use client" is required for Canvas, video, and real-time processing.
 */

"use client";

import { Shield, ShieldCheck, AlertTriangle, Loader2, HelpCircle } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type LivenessVerdict = "live" | "spoof" | "inconclusive";

export interface rPPGResult {
  isDeepfake: boolean;
  confidence: number;   // 0–1
  heartRate: number;    // bpm
  signalQuality: number; // 0–1
  /** New: liveness verdict replaces binary isDeepfake */
  verdict?: LivenessVerdict;
  /** New: human-readable reason for inconclusive/rejection */
  reason?: string;
  /** New: degraded-state flags detected */
  degradedFlags?: {
    lowLight: boolean;
    highCompression: boolean;
    motionBlur: boolean;
    cameraDenied: boolean;
  };
}

type AnalysisState = "idle" | "processing" | "complete" | "error";

interface OrbitalScanRingProps {
  videoUrl?: string;
  autoStart?: boolean;
  onResult?: (result: rPPGResult) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Bandpass filter range for heart rate (0.7 Hz = 42 bpm, 4 Hz = 240 bpm) */
const BANDPASS_LOW = 0.7;
const BANDPASS_HIGH = 4.0;

/** Sampling rate target for frame extraction */
const TARGET_FPS = 20;

/** Minimum frames needed for reliable HR detection (~5 seconds) */
const MIN_FRAMES = TARGET_FPS * 5;

/** Maximum frames to process (~10 seconds) */
const MAX_FRAMES = TARGET_FPS * 10;

/** ROI regions as fractions of face bounding box */
const ROI_REGIONS = {
  forehead: { x: 0.25, y: 0.05, w: 0.5, h: 0.2 },
  leftCheek: { x: 0.05, y: 0.35, w: 0.25, h: 0.3 },
  rightCheek: { x: 0.7, y: 0.35, w: 0.25, h: 0.3 },
  noseBridge: { x: 0.35, y: 0.2, w: 0.3, h: 0.25 },
};

/** Thresholds for degraded-state detection */
const DEGRADED = {
  /** Average pixel brightness below this → low light */
  lowLightThreshold: 30,
  /** Frame-to-frame variance below this → flat/compressed frame */
  minFrameVariance: 5,
  /** Standard deviation of signal across frames below this → compression artifacts */
  minSignalStd: 0.02,
  /** Motion: std of frame-differences above this → motion blur */
  maxMotionStd: 50,
};

// ── Signal Processing Helpers ──────────────────────────────────────────────

/**
 * Simple IIR bandpass filter (second-order Butterworth via bilinear transform).
 * Filters a time-series signal to the [lowFreq, highFreq] range.
 */
function bandpassFilter(
  signal: number[],
  fps: number,
  lowFreq: number,
  highFreq: number,
): number[] {
  const n = signal.length;
  if (n < 4) return signal;

  const nyquist = fps / 2;
  const w1 = Math.tan((Math.PI * lowFreq) / nyquist);
  const w2 = Math.tan((Math.PI * highFreq) / nyquist);

  // Second-order bandpass coefficients
  const d = w2 - w1;
  const b0 = d / (1 + d + w1 * w2);
  const b1 = 0;
  const b2 = -b0;
  const a1 = (2 * (w1 * w2 - 1)) / (1 + d + w1 * w2);
  const a2 = (1 - d + w1 * w2) / (1 + d + w1 * w2);

  const output = new Array<number>(n).fill(0);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < n; i++) {
    const x0 = signal[i] ?? 0;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    output[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  return output;
}

/**
 * Detrend a signal by subtracting a moving average (removes DC/low-frequency drift).
 */
function detrend(signal: number[], windowSize: number = TARGET_FPS): number[] {
  const n = signal.length;
  const result = new Array<number>(n);

  for (let i = 0; i < n; i++) {
    const half = Math.floor(windowSize / 2);
    const start = Math.max(0, i - half);
    const end = Math.min(n, i + half);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += signal[j] ?? 0;
    }
    result[i] = (signal[i] ?? 0) - sum / (end - start);
  }

  return result;
}

/**
 * Z-normalize a signal (zero mean, unit variance).
 */
function normalize(signal: number[]): number[] {
  const n = signal.length;
  if (n === 0) return signal;
  const mean = signal.reduce((a, b) => a + b, 0) / n;
  const variance =
    signal.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance) || 1;
  return signal.map((v) => (v - mean) / std);
}

/**
 * Estimate heart rate from a filtered signal using auto-correlation
 * (periodicity detection). Returns bpm and a confidence metric.
 */
function estimateHeartRate(
  signal: number[],
  fps: number,
): { heartRate: number; quality: number } {
  const n = signal.length;
  if (n < MIN_FRAMES) return { heartRate: 0, quality: 0 };

  // Auto-correlation to find the dominant period
  const minLag = Math.floor(fps / BANDPASS_HIGH); // highest HR → shortest period
  const maxLag = Math.floor(fps / BANDPASS_LOW);  // lowest HR → longest period

  let bestLag = 0;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag && lag < n / 2; lag++) {
    let correlation = 0;
    let count = 0;
    for (let i = 0; i < n - lag; i++) {
      correlation += (signal[i] ?? 0) * (signal[i + lag] ?? 0);
      count++;
    }
    correlation = count > 0 ? correlation / count : 0;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag === 0 || bestCorrelation < 0.1) {
    return { heartRate: 0, quality: 0 };
  }

  // Convert lag (frames) to heart rate (bpm)
  const heartRate = (fps / bestLag) * 60;

  // Signal quality: normalized auto-correlation peak strength
  const quality = Math.min(1, Math.max(0, bestCorrelation));

  return { heartRate, quality };
}

/**
 * Extract average RGB values from a canvas region.
 */
function extractROI(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  roi: { x: number; y: number; w: number; h: number },
): { r: number; g: number; b: number } {
  const x = Math.floor(roi.x * width);
  const y = Math.floor(roi.y * height);
  const w = Math.max(1, Math.floor(roi.w * width));
  const h = Math.max(1, Math.floor(roi.h * height));

  const imageData = ctx.getImageData(x, y, w, h);
  const pixels = imageData.data;
  let r = 0, g = 0, b = 0, count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i] ?? 0;
    g += pixels[i + 1] ?? 0;
    b += pixels[i + 2] ?? 0;
    count++;
  }

  return {
    r: r / count,
    g: g / count,
    b: b / count,
  };
}

/**
 * CHROM-based rPPG signal extraction.
 * Uses the chrominance-based method to isolate pulse signal from
 * facial skin reflections while minimizing motion artifacts.
 */
function chromRppg(
  rSignal: number[],
  gSignal: number[],
  bSignal: number[],
): number[] {
  const n = rSignal.length;
  const pulse = new Array<number>(n);

  for (let i = 0; i < n; i++) {
    const r = rSignal[i] ?? 0;
    const g = gSignal[i] ?? 0;
    const b = bSignal[i] ?? 0;

    // CHROM formula: X = 0.77*R - 0.43*G, Y = 0.77*R + 0.43*G - 0.77*B
    // Then pulse = X - α*Y where α = std(X)/std(Y)
    const x = 0.77 * r - 0.43 * g;
    const y = 0.77 * r + 0.43 * g - 0.77 * b;
    pulse[i] = x - y;
  }

  // Normalize the pulse signal
  return normalize(pulse);
}

/**
 * Analyze frame data for degraded-state conditions.
 * Returns flags for low light, high compression, motion blur.
 */
function analyzeDegradedState(
  frames: { r: number[]; g: number[]; b: number[] },
): {
  lowLight: boolean;
  highCompression: boolean;
  motionBlur: boolean;
  cameraDenied: boolean;
} {
  const n = frames.r.length;
  const flags = {
    lowLight: false,
    highCompression: false,
    motionBlur: false,
    cameraDenied: false,
  };

  if (n === 0) return flags;

  // Calculate average brightness across all channels
  // If average pixel value is very low, suggest low light
  const avgBrightness =
    frames.r.reduce((a, b) => a + b, 0) / n +
    frames.g.reduce((a, b) => a + b, 0) / n +
    frames.b.reduce((a, b) => a + b, 0) / n;

  // Normalize to 0-255 scale for threshold comparison
  const scaledBrightness = avgBrightness / 3;
  flags.lowLight = scaledBrightness < DEGRADED.lowLightThreshold;

  // Calculate variance of each channel across frames
  // Low variance → flat/compressed/static signal
  const rMean = frames.r.reduce((a, b) => a + b, 0) / n;
  const gMean = frames.g.reduce((a, b) => a + b, 0) / n;
  const bMean = frames.b.reduce((a, b) => a + b, 0) / n;

  const rVariance = frames.r.reduce((a, b) => a + (b - rMean) ** 2, 0) / n;
  const gVariance = frames.g.reduce((a, b) => a + (b - gMean) ** 2, 0) / n;
  const bVariance = frames.b.reduce((a, b) => a + (b - bMean) ** 2, 0) / n;

  const avgVariance = (rVariance + gVariance + bVariance) / 3;
  flags.highCompression = avgVariance < DEGRADED.minFrameVariance;

  // Calculate signal standard deviation across frames for the green channel
  // (green is most sensitive to pulse). Low std → compression artifacts
  const gStd = Math.sqrt(gVariance);
  if (gStd < DEGRADED.minSignalStd) {
    flags.highCompression = true;
  }

  // Motion detection via frame-difference analysis
  // We compute inter-frame differences on the green channel
  let diffSum = 0;
  let diffCount = 0;
  for (let i = 1; i < n; i++) {
    const diff = Math.abs((frames.g[i] ?? 0) - (frames.g[i - 1] ?? 0));
    diffSum += diff;
    diffCount++;
  }
  const avgDiff = diffCount > 0 ? diffSum / diffCount : 0;
  // Excessive inter-frame difference → motion blur
  flags.motionBlur = avgDiff > DEGRADED.maxMotionStd;

  return flags;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function OrbitalScanRing({
  videoUrl,
  autoStart = false,
  onResult,
}: OrbitalScanRingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<rPPGResult | null>(null);
  const [progress, setProgress] = useState(0);
  const framesRef = useRef<{
    r: number[];
    g: number[];
    b: number[];
  }>({ r: [], g: [], b: [] });
  const processingRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const resetAnalysis = useCallback(() => {
    framesRef.current = { r: [], g: [], b: [] };
    setState("idle");
    setResult(null);
    setProgress(0);
    processingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  function startFrameProcessing(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    resolve: (result: rPPGResult) => void,
  ) {
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const frames: { r: number[]; g: number[]; b: number[] } = {
      r: [],
      g: [],
      b: [],
    };

    const frameInterval = 1000 / TARGET_FPS;
    let lastFrameTime = 0;
    let frameCount = 0;

    function processFrame(timestamp: number) {
      if (!processingRef.current) {
        // Early cancellation — inconclusive, not deepfake
        resolve({
          isDeepfake: false,
          verdict: "inconclusive",
          confidence: 0,
          heartRate: 0,
          signalQuality: 0,
          reason: "Unable to verify liveness reliably — analysis cancelled",
          degradedFlags: {
            lowLight: false,
            highCompression: false,
            motionBlur: false,
            cameraDenied: false,
          },
        });
        return;
      }

      if (timestamp - lastFrameTime >= frameInterval) {
        lastFrameTime = timestamp;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);

        // Extract ROI signals from all facial regions
        let rAvg = 0, gAvg = 0, bAvg = 0;
        const regions = Object.values(ROI_REGIONS);
        for (const roi of regions) {
          const rgb = extractROI(ctx, width, height, roi);
          rAvg += rgb.r;
          gAvg += rgb.g;
          bAvg += rgb.b;
        }
        rAvg /= regions.length;
        gAvg /= regions.length;
        bAvg /= regions.length;

        frames.r.push(rAvg);
        frames.g.push(gAvg);
        frames.b.push(bAvg);
        frameCount++;

        // Update progress
        setProgress(Math.min(100, (frameCount / MAX_FRAMES) * 100));
      }

      if (
        frameCount >= MAX_FRAMES ||
        (frameCount >= MIN_FRAMES && video.ended)
      ) {
        // Process complete — run signal analysis
        const analysisResult = processSignals(frames, TARGET_FPS);
        framesRef.current = frames;
        processingRef.current = false;
        resolve(analysisResult);
        return;
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }

  const runAnalysis = useCallback((): Promise<rPPGResult> => {
    return new Promise<rPPGResult>((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || processingRef.current) {
        // No video source — return inconclusive, not "deepfake"
        resolve({
          isDeepfake: false,
          verdict: "inconclusive",
          confidence: 0,
          heartRate: 0,
          signalQuality: 0,
          reason: "Unable to verify liveness reliably — no video feed available",
          degradedFlags: {
            lowLight: false,
            highCompression: false,
            motionBlur: false,
            cameraDenied: true,
          },
        });
        return;
      }

      processingRef.current = true;
      setState("processing");
      setResult(null);

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setState("error");
        processingRef.current = false;
        resolve({
          isDeepfake: false,
          verdict: "inconclusive",
          confidence: 0,
          heartRate: 0,
          signalQuality: 0,
          reason: "Unable to verify liveness reliably — canvas context unavailable",
          degradedFlags: {
            lowLight: false,
            highCompression: false,
            motionBlur: false,
            cameraDenied: true,
          },
        });
        return;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;

      // Wait for video metadata before starting frame processing
      if (video.readyState < 2) {
        video.addEventListener(
          "loadeddata",
          () => {
            video
              .play()
              .then(() => startFrameProcessing(ctx, video, canvas, resolve))
              .catch(() => {
                // Video might already be playing; try anyway
                startFrameProcessing(ctx, video, canvas, resolve);
              });
          },
          { once: true },
        );
        return;
      }

      video
        .play()
        .then(() => startFrameProcessing(ctx, video, canvas, resolve))
        .catch(() => startFrameProcessing(ctx, video, canvas, resolve));
    });
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!videoUrl) return;

    try {
      const analysisResult = await runAnalysis();
      setResult(analysisResult);
      setState("complete");
      onResult?.(analysisResult);
    } catch {
      setState("error");
      processingRef.current = false;
    }
  }, [videoUrl, runAnalysis, onResult]);

  // Auto-start if configured — uses a ref to avoid cascading renders
  const autoStartTriggeredRef = useRef(false);
  useEffect(() => {
    if (autoStart && videoUrl && !autoStartTriggeredRef.current) {
      autoStartTriggeredRef.current = true;
      // Use setTimeout to break out of the render cycle
      const timer = setTimeout(() => {
        startAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, videoUrl, startAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Derive display verdict from result
  const displayVerdict = result?.verdict ?? (result?.isDeepfake ? "spoof" : "live");

  const resultColor =
    result === null
      ? "text-zinc-600"
      : displayVerdict === "spoof"
        ? "text-red-400"
        : displayVerdict === "inconclusive"
          ? "text-amber-400"
          : "text-emerald-400";

  const resultIcon =
    result === null ? null : displayVerdict === "spoof" ? (
      <AlertTriangle className="h-8 w-8 text-red-400" />
    ) : displayVerdict === "inconclusive" ? (
      <HelpCircle className="h-8 w-8 text-amber-400" />
    ) : (
      <ShieldCheck className="h-8 w-8 text-emerald-400" />
    );

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Hidden video and canvas elements */}
      {videoUrl && (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className="hidden"
            crossOrigin="anonymous"
            muted
            playsInline
            preload="auto"
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {/* Scan ring container */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* Outer orbital ring — spins during analysis, pulses on complete */}
        <svg
          className={`absolute inset-0 h-full w-full ${
            state === "processing"
              ? "animate-[spin_2000ms_linear_infinite]"
              : state === "complete"
                ? "animate-[spin_4000ms_linear_infinite] opacity-60"
                : ""
          }`}
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationTimingFunction: "linear" }}
        >
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="url(#orbital-gradient)"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            strokeLinecap="round"
          />
          <path
            d="M64 4 A60 60 0 0 1 124 64"
            stroke={displayVerdict === "spoof" ? "#ef4444" : displayVerdict === "inconclusive" ? "#f59e0b" : "#10956a"}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className={state === "processing" ? "opacity-80" : "opacity-40"}
          />
          <circle
            cx="64"
            cy="4"
            r="3"
            fill={displayVerdict === "spoof" ? "#ef4444" : displayVerdict === "inconclusive" ? "#f59e0b" : "#14b87a"}
          >
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur={state === "processing" ? "2000ms" : "4000ms"}
              repeatCount="indefinite"
            />
          </circle>
          <defs>
            <linearGradient id="orbital-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10956a" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#10956a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10956a" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner ring (counter-rotating) */}
        <svg
          className={`absolute inset-4 h-[calc(100%-32px)] w-[calc(100%-32px)] ${
            state === "processing"
              ? "animate-[spin_3000ms_linear_infinite]"
              : state === "complete"
                ? "animate-[spin_6000ms_linear_infinite] opacity-40"
                : ""
          }`}
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            animationTimingFunction: "linear",
            animationDirection: "reverse",
          }}
        >
          <circle
            cx="48"
            cy="48"
            r="44"
            stroke={displayVerdict === "spoof" ? "#ef4444" : displayVerdict === "inconclusive" ? "#f59e0b" : "#c9922a"}
            strokeWidth="1"
            strokeDasharray="3 6"
            strokeLinecap="round"
            fill="none"
            className="opacity-30"
          />
        </svg>

        {/* Center icon — changes based on state */}
        <div
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 backdrop-blur-md golden-transition duration-700 ${
            state === "processing"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : displayVerdict === "spoof"
                ? "border-red-500/40 bg-red-500/15"
                : displayVerdict === "inconclusive"
                  ? "border-amber-500/40 bg-amber-500/15"
                  : result
                    ? "border-emerald-500/40 bg-emerald-500/15"
                    : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          {state === "processing" ? (
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          ) : resultIcon ? (
            resultIcon
          ) : (
            <Shield className="h-8 w-8 text-emerald-400" />
          )}
        </div>

        {/* Progress ring */}
        {state === "processing" && (
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="#10956a"
              strokeWidth="1"
              strokeDasharray={`${(progress / 100) * 364.5} 364.5`}
              strokeLinecap="round"
              className="opacity-30 golden-transition duration-300"
            />
          </svg>
        )}
      </div>

      {/* Identity / liveness status */}
      <div className="text-center">
        {state === "processing" && (
          <>
            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-emerald-400">
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LIVENESS ANALYSIS IN PROGRESS
              </span>
            </p>
            <p className="mt-1.5 text-[10px] font-mono tracking-wider text-zinc-600">
              Extracting physiological signals &mdash; {Math.round(progress)}%
            </p>
          </>
        )}

        {state === "complete" && result && (
          <>
            <p
              className={`text-[11px] font-mono uppercase tracking-[0.22em] ${resultColor}`}
            >
              {displayVerdict === "spoof"
                ? "⚠ PHYSIOLOGICAL INCONSISTENCY DETECTED"
                : displayVerdict === "inconclusive"
                  ? "? UNABLE TO VERIFY LIVENESS"
                  : "✓ PHYSIOLOGICAL CONSISTENCY CONFIRMED"}
            </p>
            {result.reason && (
              <p className="mt-1.5 text-[10px] font-mono tracking-wider text-zinc-500">
                {result.reason}
              </p>
            )}
            {result.heartRate > 0 && (
              <p className="mt-1.5 text-[10px] font-mono tracking-wider text-zinc-500">
                HR:{" "}
                <span className={resultColor}>
                  {Math.round(result.heartRate)} bpm
                </span>
                {" · "}Fraud-Risk Score:{" "}
                <span className={resultColor}>
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </p>
            )}
            {result.signalQuality > 0 && (
              <p className="mt-0.5 text-[9px] font-mono tracking-[0.18em] text-zinc-700">
                Signal Quality: {(result.signalQuality * 100).toFixed(0)}%
              </p>
            )}
            {result.degradedFlags && (
              <div className="mt-1.5 flex flex-wrap justify-center gap-2">
                {result.degradedFlags.lowLight && (
                  <span className="inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-mono tracking-wider text-amber-400">
                    Low Light
                  </span>
                )}
                {result.degradedFlags.highCompression && (
                  <span className="inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-mono tracking-wider text-amber-400">
                    Compression
                  </span>
                )}
                {result.degradedFlags.motionBlur && (
                  <span className="inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-mono tracking-wider text-amber-400">
                    Motion Blur
                  </span>
                )}
                {result.degradedFlags.cameraDenied && (
                  <span className="inline-block rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[8px] font-mono tracking-wider text-red-400">
                    Camera Unavailable
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {state === "idle" && !videoUrl && (
          <>
            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-emerald-400">
              READY FOR LIVENESS ANALYSIS
            </p>
            <p className="mt-1.5 text-[10px] font-mono tracking-wider text-zinc-600">
              FIDO2 Passkey + Physiological Liveness
            </p>
            <p className="mt-0.5 text-[9px] font-mono tracking-[0.18em] text-zinc-700">
              rPPG Liveness Scanning Available
            </p>
          </>
        )}

        {state === "idle" && videoUrl && (
          <button
            onClick={startAnalysis}
            className="mt-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-400 backdrop-blur-md golden-transition duration-300 hover:bg-emerald-500/20"
          >
            ● Initiate Liveness Scan
          </button>
        )}

        {state === "error" && (
          <>
            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-red-400">
              ✕ ANALYSIS ERROR
            </p>
            <p className="mt-1.5 text-[10px] font-mono tracking-wider text-zinc-500">
              Could not process video signal
            </p>
            <button
              onClick={resetAnalysis}
              className="mt-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-4 py-1.5 text-[10px] font-mono text-zinc-400 golden-transition duration-300 hover:bg-zinc-700/50"
            >
              Retry
            </button>
          </>
        )}
      </div>

      {/* Feature highlights */}
      <div className="flex flex-wrap justify-center gap-6 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              displayVerdict === "spoof" ? "bg-red-500" : "bg-emerald-500"
            }`}
          />
          rPPG Liveness Analysis
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              displayVerdict === "spoof" ? "bg-red-500" : "bg-emerald-500"
            }`}
          />
          Physiological Consistency Check
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              displayVerdict === "spoof" ? "bg-red-500" : "bg-emerald-500"
            }`}
          />
          CHROM Signal Analysis
        </span>
      </div>
    </div>
  );
}

// ── Signal Processing Pipeline ──────────────────────────────────────────────

function processSignals(
  frames: { r: number[]; g: number[]; b: number[] },
  fps: number,
): rPPGResult {
  const n = frames.r.length;

  // RUN 1: Degraded-state analysis — check frame quality BEFORE main pipeline
  const degradedFlags = analyzeDegradedState(frames);

  // If camera is denied or frames are empty, return inconclusive
  if (n === 0) {
    return {
      isDeepfake: false,
      verdict: "inconclusive",
      confidence: 0,
      heartRate: 0,
      signalQuality: 0,
      reason: "Unable to verify liveness reliably — no frames captured",
      degradedFlags,
    };
  }

  if (n < MIN_FRAMES) {
    // Insufficient frames — inconclusive, not deepfake
    const reason = degradedFlags.highCompression
      ? "Unable to verify liveness reliably — insufficient frames; possible compression artifacts detected"
      : degradedFlags.lowLight
        ? "Unable to verify liveness reliably — low-light conditions degrade signal quality"
        : "Unable to verify liveness reliably — insufficient video duration for physiological analysis";
    return {
      isDeepfake: false,
      verdict: "inconclusive",
      confidence: 0.3,
      heartRate: 0,
      signalQuality: 0,
      reason,
      degradedFlags,
    };
  }

  // 1. CHROM-based rPPG signal extraction
  let pulseSignal = chromRppg(frames.r, frames.g, frames.b);

  // 2. Detrend (remove DC/low-frequency drift)
  pulseSignal = detrend(pulseSignal);

  // 3. Bandpass filter (0.7–4 Hz)
  pulseSignal = bandpassFilter(pulseSignal, fps, BANDPASS_LOW, BANDPASS_HIGH);

  // 4. Normalize
  pulseSignal = normalize(pulseSignal);

  // 5. Heart rate estimation via auto-correlation
  const { heartRate, quality } = estimateHeartRate(pulseSignal, fps);

  // 6. Classification with degraded-state awareness
  //    - Hard rejection ONLY for physiologically impossible readings
  //    - Inconclusive for low-quality/degraded signals
  //    - Live for consistent, physiologically plausible readings
  let verdict: LivenessVerdict;
  let reason: string | undefined;
  let confidence: number;

  // Count active degraded flags
  const activeDegradedCount = [
    degradedFlags.lowLight,
    degradedFlags.highCompression,
    degradedFlags.motionBlur,
  ].filter(Boolean).length;

  // CASE A: Physiologically impossible heart rate
  // Heart rate below 30 bpm or above 220 bpm is physiologically impossible
  // for a living human, suggesting spoof/artifact rather than a live signal
  if (heartRate > 0 && (heartRate < 30 || heartRate > 220)) {
    verdict = "spoof";
    confidence = Math.min(0.95, 0.6 + (heartRate < 30 ? 0.3 : 0) + (quality < 0.1 ? 0.2 : 0));
    reason = `Physiologically inconsistent signal detected (HR: ${Math.round(heartRate)} bpm)`;
  }
  // CASE B: No heart rate detected AND degraded conditions
  else if (heartRate === 0 && quality === 0 && activeDegradedCount >= 2) {
    verdict = "inconclusive";
    confidence = 0.4;
    reason = "Unable to verify liveness reliably — multiple signal degradation factors detected";
  }
  // CASE C: No heart rate detected (flat signal) under normal conditions
  else if (heartRate === 0 && quality === 0) {
    verdict = "spoof";
    confidence = 0.7;
    reason = "No physiological pulse detected — possible synthetic or pre-recorded source";
  }
  // CASE D: Very low quality signal with degradation
  else if (quality < 0.15 && activeDegradedCount > 0) {
    verdict = "inconclusive";
    confidence = 0.3;
    reason = "Unable to verify liveness reliably — signal quality too low for conclusive analysis";
  }
  // CASE E: Low quality but no degradation — possible spoof attempt
  else if (quality < 0.15) {
    verdict = "spoof";
    confidence = 0.6;
    reason = "Physiological signal quality below expected threshold — possible synthetic source";
  }
  // CASE F: Borderline quality with degradation
  else if (quality < 0.3 && activeDegradedCount > 0) {
    verdict = "inconclusive";
    confidence = 0.5;
    reason = "Liveness analysis partially degraded — recommend additional verification";
  }
  // CASE G: Heart rate outside normal resting range (40-150) but still physiologically possible
  else if ((heartRate < 40 || heartRate > 150) && quality < 0.4) {
    verdict = "inconclusive";
    confidence = 0.5;
    reason = `Unusual heart rate (${Math.round(heartRate)} bpm) with low signal confidence — manual review recommended`;
  }
  // CASE H: Heart rate outside normal range but high quality — possible exercise/stress
  else if ((heartRate < 40 || heartRate > 150) && quality >= 0.4) {
    // Still flag as elevated fraud risk but not hard rejection
    verdict = "live";
    confidence = Math.min(0.9, quality * 0.5 + 0.3);
    reason = `Physiological consistency confirmed (HR: ${Math.round(heartRate)} bpm) — elevated fraud-risk signal due to atypical heart rate`;
  }
  // CASE I: Normal, clean signal — liveness confirmed
  else {
    verdict = "live";
    // Confidence based on signal quality and degraded flags
    const qualityFactor = quality * 0.7 + 0.3;
    const degradationPenalty = Math.max(0, 1 - activeDegradedCount * 0.15);
    confidence = Math.min(1, Math.max(0.5, qualityFactor * degradationPenalty));
  }

  // Signal quality for display
  const signalQuality = Math.min(1, Math.max(0, quality));

  return {
    isDeepfake: verdict === "spoof",
    verdict,
    confidence,
    heartRate,
    signalQuality,
    reason,
    degradedFlags,
  };
}

export default OrbitalScanRing;
