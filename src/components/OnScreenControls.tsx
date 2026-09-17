import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Flame, RotateCcw } from 'lucide-react';

interface OnScreenControlsProps {
  onTestCrash: () => void;
  onReset: () => void;
}

export const OnScreenControls: React.FC<OnScreenControlsProps> = ({ onTestCrash, onReset }) => {
  const triggerKey = (code: string, isDown: boolean) => {
    const event = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
      code,
      key: code === 'KeyW' ? 'w' : code === 'KeyS' ? 's' : code === 'KeyA' ? 'a' : code === 'KeyD' ? 'd' : ' ',
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between items-end md:hidden z-20 select-none">
      {/* Steering D-Pad */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          onTouchStart={() => triggerKey('KeyA', true)}
          onTouchEnd={() => triggerKey('KeyA', false)}
          onMouseDown={() => triggerKey('KeyA', true)}
          onMouseUp={() => triggerKey('KeyA', false)}
          className="w-14 h-14 bg-slate-900/80 active:bg-sky-600 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg"
          aria-label="Steer Left"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onTouchStart={() => triggerKey('KeyD', true)}
          onTouchEnd={() => triggerKey('KeyD', false)}
          onMouseDown={() => triggerKey('KeyD', true)}
          onMouseUp={() => triggerKey('KeyD', false)}
          className="w-14 h-14 bg-slate-900/80 active:bg-sky-600 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg"
          aria-label="Steer Right"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Throttle & Brake Buttons */}
      <div className="flex flex-col gap-2 pointer-events-auto items-end">
        <div className="flex gap-2">
          <button
            onClick={onTestCrash}
            className="w-12 h-12 bg-rose-900/80 active:bg-rose-600 text-white border border-rose-700/80 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg"
            title="Crash Test Bumper"
          >
            <Flame className="w-5 h-5 text-rose-300" />
          </button>
          <button
            onClick={onReset}
            className="w-12 h-12 bg-slate-900/80 active:bg-slate-700 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg"
            title="Reset Car"
          >
            <RotateCcw className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onTouchStart={() => triggerKey('KeyS', true)}
            onTouchEnd={() => triggerKey('KeyS', false)}
            onMouseDown={() => triggerKey('KeyS', true)}
            onMouseUp={() => triggerKey('KeyS', false)}
            className="w-14 h-14 bg-slate-900/80 active:bg-rose-600 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg font-mono font-bold text-xs"
            aria-label="Brake or Reverse"
          >
            <ArrowDown className="w-6 h-6 text-rose-400" />
          </button>
          <button
            onTouchStart={() => triggerKey('KeyW', true)}
            onTouchEnd={() => triggerKey('KeyW', false)}
            onMouseDown={() => triggerKey('KeyW', true)}
            onMouseUp={() => triggerKey('KeyW', false)}
            className="w-16 h-16 bg-slate-900/80 active:bg-emerald-600 text-white border border-slate-700/80 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg font-mono font-bold"
            aria-label="Throttle"
          >
            <ArrowUp className="w-8 h-8 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
