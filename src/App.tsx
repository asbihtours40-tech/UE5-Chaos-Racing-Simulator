import React, { useState, useEffect, useCallback } from 'react';
import { RaceCanvas3D } from './components/RaceCanvas3D';
import { RacingHUD } from './components/RacingHUD';
import { CodeInspectorModal } from './components/CodeInspectorModal';
import { VehicleTuningPanel } from './components/VehicleTuningPanel';
import { RaceResultsModal } from './components/RaceResultsModal';
import { OnScreenControls } from './components/OnScreenControls';
import { CameraViewMode, VehicleTelemetry, VehicleConfig, RaceSaveData } from './types';
import { RaceStorageService } from './services/raceStorage';
import { SoundFX } from './services/soundEffects';
import { Keyboard, HelpCircle } from 'lucide-react';

const DEFAULT_CONFIG: VehicleConfig = {
  maxSpeedKmh: 240,
  engineHorsepower: 480,
  steeringSharpness: 100,
  tireFriction: 1.0,
  detachmentThresholdImpulse: 80000.0, // Matches C++: NormalImpulse.Size() > 80000.0f
};

const INITIAL_TELEMETRY: VehicleTelemetry = {
  speedKmh: 0,
  rpm: 900,
  gear: 1,
  steeringInput: 0,
  throttleInput: 0,
  brakeInput: 0,
  isHandbraking: false,
  lastImpulseSize: 0,
  isBumperAttached: true,
  bumperLifespanRemaining: 15.0,
  driftFactor: 0,
  currentLapTime: 0,
  bestLapTime: 0,
  currentLap: 1,
  totalLaps: 3,
  bIsRaceActive: true,
  currentCheckpointIndex: 0,
  totalCheckpoints: 8,
  lapTimes: [],
};

export default function App() {
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(INITIAL_TELEMETRY);
  const [config, setConfig] = useState<VehicleConfig>(DEFAULT_CONFIG);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [carColor, setCarColor] = useState<string>('#dc2626'); // Apex Red
  const [saveData, setSaveData] = useState<RaceSaveData>({ savedBestLapTime: 0, totalRacesFinished: 0 });
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState(false);
  const [isTuningOpen, setIsTuningOpen] = useState(false);
  const [isRaceResultsOpen, setIsRaceResultsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);

  // Load URaceSaveGame on initialization
  useEffect(() => {
    const data = RaceStorageService.loadSaveGame();
    setSaveData(data);
  }, []);

  // Keyboard shortcut listener for camera cycle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') {
        cycleCameraMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cycleCameraMode = useCallback(() => {
    const modes: CameraViewMode[] = ['chase', 'hood', 'top', 'orbit'];
    setCameraMode((prev) => {
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  }, []);

  const handleLapComplete = useCallback((lapTime: number, isBest: boolean) => {
    if (isBest) {
      const updated = RaceStorageService.writeSaveGame(lapTime, false);
      setSaveData(updated);
    }
  }, []);

  const handleRaceFinished = useCallback((finalBestLap: number) => {
    const updated = RaceStorageService.writeSaveGame(finalBestLap, true);
    setSaveData(updated);
    setIsRaceResultsOpen(true);
  }, []);

  const handleRestartRace = useCallback(() => {
    setIsRaceResultsOpen(false);
    const resetEvent = new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true });
    window.dispatchEvent(resetEvent);
  }, []);

  const handleResetCar = useCallback(() => {
    const resetEvent = new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true });
    window.dispatchEvent(resetEvent);
  }, []);

  const handleTestCrashImpulse = useCallback(() => {
    const crashEvent = new KeyboardEvent('keydown', { code: 'KeyB', bubbles: true });
    window.dispatchEvent(crashEvent);
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = SoundFX.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleResetDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setCarColor('#dc2626');
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* 3D Simulation Canvas */}
      <div className="relative w-full h-full flex-1">
        <RaceCanvas3D
          telemetry={telemetry}
          setTelemetry={setTelemetry}
          config={config}
          cameraMode={cameraMode}
          onLapComplete={handleLapComplete}
          onRaceFinished={handleRaceFinished}
          carColor={carColor}
        />

        {/* Cockpit HUD and Overlays */}
        <RacingHUD
          telemetry={telemetry}
          savedBestLapTime={saveData.savedBestLapTime}
          cameraMode={cameraMode}
          onCycleCamera={cycleCameraMode}
          onResetCar={handleResetCar}
          onTestCrashImpulse={handleTestCrashImpulse}
          onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
          onOpenTuning={() => setIsTuningOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          detachmentThreshold={config.detachmentThresholdImpulse}
        />

        {/* Mobile / Touch D-pad and Pedals */}
        <OnScreenControls onTestCrash={handleTestCrashImpulse} onReset={handleResetCar} />

        {/* Quick Keyboard Hint Bar (Floating discreetly at bottom left on desktop) */}
        <div className="hidden lg:flex absolute bottom-2 left-6 z-10 items-center gap-3 text-[11px] font-mono text-slate-400/90 bg-slate-950/70 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-slate-800 pointer-events-none">
          <span className="flex items-center gap-1 text-slate-300">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] text-white">W/A/S/D</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] text-white">ARROWS</kbd> Drive
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] text-white">SPACE</kbd> Drift
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] text-white">C</kbd> Camera
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] text-white">B</kbd> 80k Ns Bumper Test
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] text-white">R</kbd> Respawn
          </span>
        </div>
      </div>

      {/* Modals & Inspectors */}
      <CodeInspectorModal
        isOpen={isCodeInspectorOpen}
        onClose={() => setIsCodeInspectorOpen(false)}
        telemetry={telemetry}
        savedBestLapTime={saveData.savedBestLapTime}
      />

      <VehicleTuningPanel
        isOpen={isTuningOpen}
        onClose={() => setIsTuningOpen(false)}
        config={config}
        setConfig={setConfig}
        carColor={carColor}
        setCarColor={setCarColor}
        onResetDefaults={handleResetDefaults}
      />

      <RaceResultsModal
        isOpen={isRaceResultsOpen}
        onRestartRace={handleRestartRace}
        onClose={() => setIsRaceResultsOpen(false)}
        lapTimes={telemetry.lapTimes}
        bestLapTime={telemetry.bestLapTime}
        savedBestLapTime={saveData.savedBestLapTime}
        totalRacesFinished={saveData.totalRacesFinished}
      />
    </main>
  );
}
