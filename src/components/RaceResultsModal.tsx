import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Timer, CheckCircle, RotateCcw, X } from 'lucide-react';

interface RaceResultsModalProps {
  isOpen: boolean;
  onRestartRace: () => void;
  onClose: () => void;
  lapTimes: number[];
  bestLapTime: number;
  savedBestLapTime: number;
  totalRacesFinished: number;
}

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({
  isOpen,
  onRestartRace,
  onClose,
  lapTimes,
  bestLapTime,
  savedBestLapTime,
  totalRacesFinished,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // safety
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const isNewRecord = savedBestLapTime > 0 && bestLapTime <= savedBestLapTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-sky-600 to-indigo-600 p-6 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 mx-auto bg-slate-900/30 backdrop-blur-sm rounded-full flex items-center justify-center mb-3 border border-white/20">
            <Trophy className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-2xl font-black font-mono tracking-tight">RACE FINISHED!</h2>
          <p className="text-xs text-white/80 font-mono mt-1">
            All 3 Laps Completed • SaveGame Synchronized
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Best Lap Highlight */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Best Lap Time</span>
              <div className="text-2xl font-black font-mono text-amber-400">
                {formatTime(bestLapTime)}
              </div>
            </div>
            {isNewRecord && (
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                New Record!
              </span>
            )}
          </div>

          {/* Laps Breakdown Table */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-sky-400" />
              <span>Lap Breakdown</span>
            </div>
            <div className="space-y-1.5">
              {lapTimes.map((time, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-mono py-1 border-b border-slate-800/60 last:border-0">
                  <span className="text-slate-400">Lap {idx + 1}</span>
                  <span className={time === bestLapTime ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                    {formatTime(time)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* URaceSaveGame Note */}
          <div className="flex items-start gap-2.5 bg-indigo-950/40 p-3 rounded-lg border border-indigo-900/60 text-xs text-indigo-200 font-mono">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>URaceSaveGame::SavedBestLapTime</strong> updated to{' '}
              <span className="text-white font-bold">{formatTime(savedBestLapTime)}</span>. (Total Races: {totalRacesFinished})
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex items-center gap-3">
          <button
            onClick={onRestartRace}
            className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase font-mono rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Race Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
