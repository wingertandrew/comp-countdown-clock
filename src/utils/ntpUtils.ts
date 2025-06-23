
export const syncWithNTP = async (ntpServer: string): Promise<{ offset: number; lastSync: string }> => {
  try {
    const before = Date.now();
    const response = await fetch(`http://${ntpServer}/api/timezone/Etc/UTC`);
    const after = Date.now();
    const data = await response.json();
    
    const serverTime = new Date(data.datetime).getTime();
    const networkDelay = (after - before) / 2;
    const clientTime = before + networkDelay;
    const offset = serverTime - clientTime;
    
    console.log('NTP sync completed. Offset:', offset, 'ms');
    return { offset, lastSync: new Date().toLocaleTimeString() };
  } catch (error) {
    console.log('NTP sync failed, using local time:', error);
    throw error;
  }
};

export const getNTPTime = (ntpOffset: number) => Date.now() + ntpOffset;
