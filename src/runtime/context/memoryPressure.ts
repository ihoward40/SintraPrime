// Simple memory pressure checker for PR1. Reads SINTRA_MEMORY_PRESSURE_MB env var.

export function getMemoryPressureThresholdMb(): number {
  return Number(process.env.SINTRA_MEMORY_PRESSURE_MB || 24000);
}

export function checkMemoryPressure(currentMb: number): { over: boolean; threshold: number } {
  const threshold = getMemoryPressureThresholdMb();
  return { over: currentMb > threshold, threshold };
}

export default { getMemoryPressureThresholdMb, checkMemoryPressure };
