// Persistent logger that survives page reloads
// Logs are stored in sessionStorage and can be viewed after navigation

const MAX_LOGS = 100;
const STORAGE_KEY = 'jamz_diagnostic_logs';

export const persistentLog = {
  log: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      data: data ? JSON.stringify(data) : null,
      url: window.location.href
    };
    
    // Also console.log it
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
    
    // Store in sessionStorage
    try {
      const logs = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      logs.push(logEntry);
      
      // Keep only last MAX_LOGS entries
      if (logs.length > MAX_LOGS) {
        logs.shift();
      }
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to persist log:', e);
    }
  },
  
  getLogs: () => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      console.error('Failed to get logs:', e);
      return [];
    }
  },
  
  clear: () => {
    sessionStorage.removeItem(STORAGE_KEY);
  },
  
  display: () => {
    const logs = persistentLog.getLogs();
    console.group('📜 Persistent Logs (survives page reloads)');
    logs.forEach(log => {
      const data = log.data ? JSON.parse(log.data) : null;
      console.log(`[${log.timestamp}] ${log.message}`, data || '');
    });
    console.groupEnd();
    return logs;
  }
};

// Expose to window for easy access in console
if (typeof window !== 'undefined') {
  window.viewLogs = () => persistentLog.display();
  window.clearLogs = () => persistentLog.clear();
}

export default persistentLog;
