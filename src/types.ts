export interface RaceSaveData {
  savedBestLapTime: number; // In seconds (0 means no record)
  recordedDate?: string;
  totalRacesFinished: number;
}

export interface VehicleTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number;
  steeringInput: number; // -1.0 to 1.0
  throttleInput: number; // 0.0 to 1.0
  brakeInput: number;    // 0.0 to 1.0
  isHandbraking: boolean;
  lastImpulseSize: number; // In Newtons (e.g. 0 to 120,000+)
  isBumperAttached: boolean;
  bumperLifespanRemaining: number; // 15.0s countdown when detached
  driftFactor: number;
  currentLapTime: number;
  bestLapTime: number;
  currentLap: number;
  totalLaps: number;
  bIsRaceActive: boolean;
  currentCheckpointIndex: number;
  totalCheckpoints: number;
  lapTimes: number[];
}

export interface VehicleConfig {
  maxSpeedKmh: number;
  engineHorsepower: number;
  steeringSharpness: number;
  tireFriction: number;
  detachmentThresholdImpulse: number; // Default 80000.0f
}

export type CameraViewMode = 'chase' | 'hood' | 'orbit' | 'top';

export interface CheckpointData {
  index: number;
  x: number;
  z: number;
  angle: number; // heading angle in radians
  width: number;
}
