
export const syncWithNTP = async (ntpServer: string): Promise<{ offset: number; lastSync: string }> => {
  try {
    const response = await fetch(`/api/ntp-sync?server=${encodeURIComponent(ntpServer)}`);
    if (!response.ok) {
      throw new Error(`NTP request failed: ${response.status}`);
    }
    const data = await response.json();
    const { offset, lastSync } = data;

    console.log('NTP sync completed. Offset:', offset, 'ms');
    return { offset, lastSync };
  } catch (error) {
    console.log('NTP sync failed, using local time:', error);
    throw error;
  }
};

export const getNTPTime = (ntpOffset: number) => Date.now() + ntpOffset;
