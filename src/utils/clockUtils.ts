
export const formatTime = (minutes: number, seconds: number) => {
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getStatusColor = (isRunning: boolean, isPaused: boolean, minutes: number, seconds: number) => {
  if (!isRunning) return '#6b7280'; // gray-500 for neutral/stopped
  if (isPaused) return '#eab308'; // yellow-500 for paused
  
  // Red in last 10 seconds
  if (minutes === 0 && seconds <= 10) return '#ef4444'; // red-500
  
  return '#22c55e'; // green-500 for running
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

export const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
