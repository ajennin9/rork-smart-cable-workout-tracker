import { NFCHelloPayload, NFCSessionPayload } from '@/types/workout';

export const mockMachines = [
  {
    machineId: 'machine-001',
    machineType: 'cable_stack',
    machineName: 'Lat Pulldown',
  },
  {
    machineId: 'machine-002',
    machineType: 'cable_stack',
    machineName: 'Cable Row',
  },
  {
    machineId: 'machine-003',
    machineType: 'cable_stack',
    machineName: 'Chest Press',
  },
  {
    machineId: 'machine-004',
    machineType: 'cable_stack',
    machineName: 'Leg Press',
  },
];

export const generateMockHelloPayload = (machineIndex: number = 0): NFCHelloPayload => ({
  v: 1,
  op: 'HELLO',
  machine_id: mockMachines[machineIndex].machineId,
  machine_type: mockMachines[machineIndex].machineType,
  fw: '1.0.0',
});

export const mockExercises = [
  'Lat Pulldown',
  'Cable Row',
  'Chest Press',
  'Leg Press',
  'Shoulder Press',
  'Bicep Curls',
  'Tricep Extensions',
  'Leg Curls',
  'Leg Extensions',
  'Calf Raises',
  'Pull-ups',
  'Push-ups',
  'Squats',
  'Deadlifts',
  'Bench Press',
  'Incline Press',
  'Dumbbell Rows',
  'Lateral Raises',
  'Face Pulls',
  'Hip Thrusts',
];

export const generateMockSessionPayload = (machineIndex: number = 0): NFCSessionPayload => {
  const sets = [
    { w: 90, r: 12, d: 38000 }, // 90 lbs
    { w: 90, r: 10, d: 34000 }, // 90 lbs  
    { w: 100, r: 8, d: 32000 }, // 100 lbs
  ];
  
  const startTime = Math.floor(Date.now() / 1000) - 360;
  const endTime = Math.floor(Date.now() / 1000);
  
  return {
    v: 1,
    op: 'SESSION',
    machine_id: mockMachines[machineIndex].machineId,
    seq: 42,
    session: {
      s: startTime,
      e: endTime,
      sets: sets,
    },
    sig: 'ed25519:MOCK_SIGNATURE',
  };
};