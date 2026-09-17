import { RaceSaveData } from '../types';

const SAVE_STORAGE_KEY = 'MONPROJETCOURSE_URaceSaveGame';

export const RaceStorageService = {
  loadSaveGame(): RaceSaveData {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          savedBestLapTime: typeof parsed.savedBestLapTime === 'number' ? parsed.savedBestLapTime : 0.0,
          recordedDate: parsed.recordedDate || undefined,
          totalRacesFinished: typeof parsed.totalRacesFinished === 'number' ? parsed.totalRacesFinished : 0,
        };
      }
    } catch {
      // ignore parsing errors and fallback
    }
    return {
      savedBestLapTime: 0.0,
      totalRacesFinished: 0,
    };
  },

  writeSaveGame(bestLap: number, isNewRaceFinished = false): RaceSaveData {
    const current = this.loadSaveGame();
    let newBest = current.savedBestLapTime;

    if (bestLap > 0) {
      if (newBest === 0 || bestLap < newBest) {
        newBest = bestLap;
      }
    }

    const updated: RaceSaveData = {
      savedBestLapTime: newBest,
      recordedDate: new Date().toISOString(),
      totalRacesFinished: isNewRaceFinished ? current.totalRacesFinished + 1 : current.totalRacesFinished,
    };

    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }

    return updated;
  },

  resetSaveGame(): RaceSaveData {
    const empty: RaceSaveData = {
      savedBestLapTime: 0.0,
      totalRacesFinished: 0,
    };
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(empty));
    } catch {
      // ignore
    }
    return empty;
  }
};
