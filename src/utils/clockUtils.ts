
export const formatTime = (minutes: number, seconds: number) => {
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getStatusColor = (isRunning: boolean, isPaused: boolean) => {
  if (!isRunning) return 'red'; // stopped
  if (isPaused) return 'yellow'; // paused
  return 'green'; // running
};

export const getStatusText = (isRunning: boolean, isPaused: boolean) => {
  if (isPaused) return 'PAUSED';
  if (isRunning) return 'RUNNING';
  return 'READY';
};

export const copyCommand = async (endpoint: string, onSuccess: (command: string) => void) => {
  const url = `${window.location.origin}/api${endpoint}`;
  const command = `curl -X POST ${url}`;
  await navigator.clipboard.writeText(command);
  onSuccess(command);
};
