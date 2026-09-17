import React from 'react';
import { VehicleConfig } from '../types';
import { X, Sliders, Palette, ShieldCheck, Gauge, RotateCcw } from 'lucide-react';

interface VehicleTuningPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: VehicleConfig;
  setConfig: React.Dispatch<React.SetStateAction<VehicleConfig>>;
  carColor: string;
  setCarColor: (color: string) => void;
  onResetDefaults: () => void;
}

const CAR_PAINTS = [
  { name: 'Apex Red', hex: '#dc2626' },
  { name: 'Cyber Cyan', hex: '#0284c7' },
  { name: 'Stealth Noir', hex: '#18181b' },
  { name: 'Electric Lime', hex: '#16a34a' },
  { name: 'Sunset Gold', hex: '#d97706' },
  { name: 'Ultra Violet', hex: '#7c3aed' },
];

export const VehicleTuningPanel: React.FC<VehicleTuningPanelProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
  carColor,
  setCarColor,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Chaos Vehicle Tuning</h2>
              <p className="text-xs text-slate-400">Tweak physical pawn parameters and paint scheme</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sliders */}
        <div className="p-6 space-y-5">
          {/* Paint Swatches */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-sky-400" />
              <span>Chassis Paint Coating</span>
            </label>
            <div className="flex items-center gap-3">
              {CAR_PAINTS.map((paint) => (
                <button
                  key={paint.hex}
                  onClick={() => setCarColor(paint.hex)}
                  title={paint.name}
                  className={`w-9 h-9 rounded-xl border-2 transition-transform ${
                    carColor.toLowerCase() === paint.hex.toLowerCase()
                      ? 'scale-110 border-white shadow-lg'
                      : 'border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: paint.hex }}
                />
              ))}
            </div>
          </div>

          {/* Engine Horsepower */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-300 font-bold">Engine Horsepower:</span>
              <span className="text-sky-400 font-bold">{config.engineHorsepower} HP</span>
            </div>
            <input
              type="range"
              min="200"
              max="900"
              step="25"
              value={config.engineHorsepower}
              onChange={(e) => setConfig((prev) => ({ ...prev, engineHorsepower: Number(e.target.value) }))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Max Speed */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-300 font-bold">Max Speed (Terminal Velocity):</span>
              <span className="text-sky-400 font-bold">{config.maxSpeedKmh} KM/H</span>
            </div>
            <input
              type="range"
              min="140"
              max="320"
              step="10"
              value={config.maxSpeedKmh}
              onChange={(e) => setConfig((prev) => ({ ...prev, maxSpeedKmh: Number(e.target.value) }))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Steering Sensitivity */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-300 font-bold">Steering Sensitivity (Ackermann):</span>
              <span className="text-sky-400 font-bold">{config.steeringSharpness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={config.steeringSharpness}
              onChange={(e) => setConfig((prev) => ({ ...prev, steeringSharpness: Number(e.target.value) }))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Tire Friction */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-300 font-bold">Tire Grip / Friction:</span>
              <span className="text-sky-400 font-bold">{config.tireFriction.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={config.tireFriction}
              onChange={(e) => setConfig((prev) => ({ ...prev, tireFriction: Number(e.target.value) }))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>Drift Loose</span>
              <span>Track Grip</span>
            </div>
          </div>

          {/* Detachment Threshold Impulse */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Bumper Detachment Impulse Threshold:</span>
              </span>
              <span className="text-amber-300 font-bold">{config.detachmentThresholdImpulse.toLocaleString()} Ns</span>
            </div>
            <input
              type="range"
              min="30000"
              max="140000"
              step="5000"
              value={config.detachmentThresholdImpulse}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, detachmentThresholdImpulse: Number(e.target.value) }))
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Default in C++ code: <strong className="text-slate-200">80,000.0f</strong>. Triggered inside OnVehicleHit.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-t border-slate-800">
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase font-mono bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shadow-lg shadow-sky-600/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
