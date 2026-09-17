import React from 'react';
import { CameraViewMode, VehicleTelemetry } from '../types';
import {
  Gauge,
  Timer,
  Trophy,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Code2,
  Sliders,
  ShieldAlert,
  Flame,
  Info,
} from 'lucide-react';

interface RacingHUDProps {
  telemetry: VehicleTelemetry;
  savedBestLapTime: number;
  cameraMode: CameraViewMode;
  onCycleCamera: () => void;
  onResetCar: () => void;
  onTestCrashImpulse: () => void;
  onOpenCodeInspector: () => void;
  onOpenTuning: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  detachmentThreshold: number;
}

export const RacingHUD: React.FC<RacingHUDProps> = ({
  telemetry,
  savedBestLapTime,
  cameraMode,
  onCycleCamera,
  onResetCar,
  onTestCrashImpulse,
  onOpenCodeInspector,
  onOpenTuning,
  isMuted,
  onToggleMute,
  detachmentThreshold,
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Impulse meter percentage relative to threshold (e.g. 80,000 Ns)
  const impulsePercent = Math.min(100, (telemetry.lastImpulseSize / (detachmentThreshold * 1.3)) * 100);
  const isOverThreshold = telemetry.lastImpulseSize >= detachmentThreshold;

  return (
    <div id="racing-hud-overlay" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top Header: Timing & Checkpoint & Saved Record */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Lap & Timing Bar */}
        <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-3 shadow-2xl text-white">
          <div className="flex items-center gap-2 border-r border-slate-700/80 pr-4">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Current Lap</div>
              <div className="text-xl font-black tracking-tight text-white font-mono">
                {telemetry.currentLap} <span className="text-xs text-slate-400">/ {telemetry.totalLaps}</span>
              </div>
            </div>
          </div>

          {/* Current Lap Time */}
          <div className="flex items-center gap-2 border-r border-slate-700/80 pr-4">
            <Timer className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Lap Time</div>
              <div className="text-xl font-black font-mono tracking-tight text-sky-300">
                {formatTime(telemetry.currentLapTime)}
              </div>
            </div>
          </div>

          {/* Best Lap This Session */}
          <div className="flex items-center gap-2 border-r border-slate-700/80 pr-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Session Best</div>
              <div className="text-base font-bold font-mono tracking-tight text-amber-300">
                {formatTime(telemetry.bestLapTime)}
              </div>
            </div>
          </div>

          {/* URaceSaveGame Saved Record */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-1.5 h-8 bg-indigo-500/80 rounded-full" />
            <div>
              <div className="text-[10px] tracking-wider uppercase font-mono text-indigo-300">SaveGame Best</div>
              <div className="text-base font-bold font-mono tracking-tight text-indigo-200">
                {formatTime(savedBestLapTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="hud-cycle-camera-btn"
            onClick={onCycleCamera}
            title="Change Camera View (Key: C)"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase font-mono bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-lg shadow-lg backdrop-blur-md transition-colors"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">{cameraMode}</span>
          </button>

          <button
            id="hud-mute-btn"
            onClick={onToggleMute}
            title="Toggle Engine Audio Sound"
            className="p-2 text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg shadow-lg backdrop-blur-md transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            id="hud-tuning-btn"
            onClick={onOpenTuning}
            title="Vehicle Chaos Physics Tuning"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase font-mono bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-lg shadow-lg backdrop-blur-md transition-colors"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Tuning</span>
          </button>

          <button
            id="hud-code-inspector-btn"
            onClick={onOpenCodeInspector}
            title="Inspect UE5 C++ Architecture & Code"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase font-mono bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-lg shadow-sky-600/30 transition-colors"
          >
            <Code2 className="w-4 h-4" />
            <span>UE5 Source</span>
          </button>
        </div>
      </div>

      {/* Middle Alerts: Checkpoint Counter & Detachable Part Status */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Front Bumper Mesh Status */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl p-3.5 shadow-2xl text-white max-w-xs pointer-events-auto">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>FrontBumperMesh</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                telemetry.isBumperAttached
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              }`}
            >
              {telemetry.isBumperAttached ? 'ATTACHED' : 'DETACHED'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            {telemetry.isBumperAttached ? (
              'Attached to Socket_FrontBumper. Detaches if impact impulse > 80,000 Ns.'
            ) : (
              <span className="text-amber-300">
                Physics simulated in world space! Lifespan countdown:{' '}
                <strong className="text-white font-mono">{telemetry.bumperLifespanRemaining}s</strong>
              </span>
            )}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              id="hud-crash-test-btn"
              onClick={onTestCrashImpulse}
              title="Simulates heavy impact (>80,000 Ns) to detach bumper"
              className="flex-1 py-1.5 px-2 bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-mono font-bold rounded flex items-center justify-center gap-1 transition-colors shadow"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Test 80,000 Ns Hit [B]</span>
            </button>

            <button
              id="hud-reset-car-btn"
              onClick={onResetCar}
              title="Reset vehicle position & reattach parts (Key: R)"
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono rounded flex items-center justify-center gap-1 transition-colors border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset [R]</span>
            </button>
          </div>
        </div>

        {/* Center: Checkpoint progress banner */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-full px-4 py-1.5 text-xs font-mono text-slate-300 shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Checkpoint:</span>
          <span className="font-bold text-sky-300">
            {telemetry.currentCheckpointIndex + 1} / {telemetry.totalCheckpoints}
          </span>
        </div>
      </div>

      {/* Bottom Area: Digital Speedometer & Cockpit Gauge Telemetry */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Left: Input Telemetry (Steering, Throttle, Brake) */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl p-3 shadow-2xl text-white min-w-[200px] hidden sm:block">
          <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 mb-2">
            Enhanced Input Values
          </div>

          {/* Steering */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
              <span>SteeringAction</span>
              <span>{telemetry.steeringInput > 0 ? `+${telemetry.steeringInput}` : telemetry.steeringInput}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div className="w-1/2 flex justify-end">
                {telemetry.steeringInput < 0 && (
                  <div
                    className="h-full bg-sky-400 rounded-l"
                    style={{ width: `${Math.abs(telemetry.steeringInput) * 100}%` }}
                  />
                )}
              </div>
              <div className="w-1/2 flex justify-start">
                {telemetry.steeringInput > 0 && (
                  <div
                    className="h-full bg-sky-400 rounded-r"
                    style={{ width: `${telemetry.steeringInput * 100}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Throttle */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
              <span>ThrottleInput</span>
              <span className="text-emerald-400 font-bold">{Math.round(telemetry.throttleInput * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded transition-all duration-75"
                style={{ width: `${telemetry.throttleInput * 100}%` }}
              />
            </div>
          </div>

          {/* Brake */}
          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
              <span>BrakeInput</span>
              <span className="text-rose-400 font-bold">{Math.round(telemetry.brakeInput * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-400 rounded transition-all duration-75"
                style={{ width: `${telemetry.brakeInput * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Impulse Gauge (threshold 80,000 Ns) */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-xl p-3 shadow-2xl text-white w-full sm:w-72">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
            <span className="text-slate-400 uppercase">Collision Impulse</span>
            <span className={isOverThreshold ? 'text-rose-400 font-bold' : 'text-slate-300'}>
              {telemetry.lastImpulseSize.toLocaleString()} Ns
            </span>
          </div>

          {/* Progress bar with 80,000 Ns marker */}
          <div className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 rounded ${
                isOverThreshold ? 'bg-rose-500' : 'bg-gradient-to-r from-sky-400 via-amber-400 to-rose-400'
              }`}
              style={{ width: `${impulsePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>0 Ns</span>
            <span className="text-amber-400 font-semibold font-mono">80k Ns (Bumper Detach)</span>
            <span>120k+</span>
          </div>
        </div>

        {/* Right: Digital Speedometer & Tachometer */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-2xl p-4 shadow-2xl text-white flex items-center gap-5">
          {/* Gear Indicator */}
          <div className="flex flex-col items-center justify-center w-12 h-14 bg-slate-800/90 rounded-xl border border-slate-700">
            <span className="text-[9px] font-mono uppercase text-slate-400">Gear</span>
            <span className="text-2xl font-black font-mono text-sky-400">
              {telemetry.speedKmh === 0 ? 'N' : telemetry.gear}
            </span>
          </div>

          {/* Speed Number */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-black font-mono tracking-tighter leading-none text-white">
                {telemetry.speedKmh}
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">KM/H</span>
            </div>

            {/* RPM Bar */}
            <div className="w-36 mt-2">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                <span>RPM: {telemetry.rpm}</span>
                {telemetry.driftFactor > 0.4 && <span className="text-amber-400 font-bold uppercase animate-pulse">DRIFT</span>}
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-sky-400 transition-all duration-75"
                  style={{ width: `${Math.min(75, (telemetry.rpm / 8000) * 100)}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(25, ((telemetry.rpm - 6000) / 2000) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
