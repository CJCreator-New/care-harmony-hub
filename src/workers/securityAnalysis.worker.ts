/**
 * Security Analysis Web Worker
 * 
 * Offloads security analysis tasks from the main thread to prevent UI blocking.
 * Handles intrusion detection, pattern analysis, and threat detection.
 * 
 * @module securityAnalysisWorker
 * @version 1.0.0
 */

// Type definitions for worker messages
interface SecurityAnalysisRequest {
  type: 'analyzeLogs' | 'detectAnomalies' | 'checkPatterns';
  data: any;
  requestId: string;
}

interface SecurityAnalysisResponse {
  type: 'result' | 'error';
  requestId: string;
  data?: any;
  error?: string;
}

// Security patterns to detect
const SUSPICIOUS_PATTERNS = {
  // Multiple failed login attempts
  bruteForce: {
    pattern: /failed_login/g,
    threshold: 5,
    timeWindow: 5 * 60 * 1000 // 5 minutes
  },
  
  // Unusual access times
  afterHours: {
    startHour: 22, // 10 PM
    endHour: 6     // 6 AM
  },
  
  // Multiple rapid requests
  rapidRequests: {
    threshold: 100,
    timeWindow: 60 * 1000 // 1 minute
  },
  
  // Privilege escalation attempts
  privilegeEscalation: [
    /attempted.*admin/i,
    /unauthorized.*access/i,
    /permission.*denied.*retry/i
  ],
  
  // Data exfiltration patterns
  dataExfiltration: {
    largeDownloads: 1000, // records
    unusualExport: /export.*all/i
  }
};

// Alert severity levels
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface SecurityAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  details: Record<string, any>;
  affectedUsers?: string[];
  affectedResources?: string[];
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analyze security logs for threats
 */
function analyzeLogs(logs: any[], timeRange: { start: Date; end: Date }): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];
  
  // Group logs by user
  const userLogs = new Map<string, any[]>();
  logs.forEach(log => {
    const userId = log.user_id || 'anonymous';
    if (!userLogs.has(userId)) {
      userLogs.set(userId, []);
    }
    userLogs.get(userId)!.push(log);
  });
  
  // Check for brute force attempts
  userLogs.forEach((userLogEntries, userId) => {
    const failedLogins = userLogEntries.filter(log => 
      log.action_type?.includes('failed_login')
    );
    
    if (failedLogins.length >= SUSPICIOUS_PATTERNS.bruteForce.threshold) {
      alerts.push({
        id: generateAlertId(),
        type: 'brute_force_attempt',
        severity: 'high',
        message: `Potential brute force attack detected for user ${userId}`,
        timestamp: Date.now(),
        details: {
          failedAttempts: failedLogins.length,
          timeWindow: SUSPICIOUS_PATTERNS.bruteForce.timeWindow,
          lastAttempt: failedLogins[failedLogins.length - 1]?.timestamp
        },
        affectedUsers: [userId]
      });
    }
  });
  
  // Check for after-hours access
  logs.forEach(log => {
    const timestamp = new Date(log.timestamp);
    const hour = timestamp.getHours();
    
    if (hour >= SUSPICIOUS_PATTERNS.afterHours.startHour || 
        hour < SUSPICIOUS_PATTERNS.afterHours.endHour) {
      
      // Check if this is unusual for this user
      const userId = log.user_id;
      const userHistory = userLogs.get(userId) || [];
      const afterHoursCount = userHistory.filter(l => {
        const h = new Date(l.timestamp).getHours();
        return h >= 22 || h < 6;
      }).length;
      
      if (afterHoursCount === 1) { // First after-hours access
        alerts.push({
          id: generateAlertId(),
          type: 'after_hours_access',
          severity: 'medium',
          message: `After-hours access detected for user ${userId}`,
          timestamp: Date.now(),
          details: {
            accessTime: log.timestamp,
            action: log.action_type
          },
          affectedUsers: [userId]
        });
      }
    }
  });
  
  // Check for rapid request patterns
  userLogs.forEach((userLogEntries, userId) => {
    const sortedLogs = userLogEntries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Sliding window check
    for (let i = 0; i < sortedLogs.length; i++) {
      const windowStart = new Date(sortedLogs[i].timestamp).getTime();
      const windowEnd = windowStart + SUSPICIOUS_PATTERNS.rapidRequests.timeWindow;
      
      const requestsInWindow = sortedLogs.filter((log, idx) => {
        if (idx < i) return false;
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= windowStart && logTime <= windowEnd;
      });
      
      if (requestsInWindow.length >= SUSPICIOUS_PATTERNS.rapidRequests.threshold) {
        alerts.push({
          id: generateAlertId(),
          type: 'rapid_requests',
          severity: 'medium',
          message: `Rapid request pattern detected for user ${userId}`,
          timestamp: Date.now(),
          details: {
            requestCount: requestsInWindow.length,
            timeWindow: SUSPICIOUS_PATTERNS.rapidRequests.timeWindow,
            startTime: sortedLogs[i].timestamp
          },
          affectedUsers: [userId]
        });
        break; // Only alert once per user
      }
    }
  });
  
  // Check for privilege escalation attempts
  logs.forEach(log => {
    const logString = JSON.stringify(log).toLowerCase();
    
    SUSPICIOUS_PATTERNS.privilegeEscalation.forEach(pattern => {
      if (pattern.test(logString)) {
        alerts.push({
          id: generateAlertId(),
          type: 'privilege_escalation_attempt',
          severity: 'critical',
          message: `Potential privilege escalation attempt detected`,
          timestamp: Date.now(),
          details: {
            userId: log.user_id,
            action: log.action_type,
            pattern: pattern.toString()
          },
          affectedUsers: [log.user_id]
        });
      }
    });
  });
  
  return alerts;
}

/**
 * Detect anomalies in user behavior
 */
function detectAnomalies(userData: any[]): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];
  
  // Calculate baseline statistics
  const userStats = new Map<string, {
    avgRequestsPerDay: number;
    commonActions: string[];
    typicalHours: number[];
  }>();
  
  // Group by user and calculate stats
  const userLogs = new Map<string, any[]>();
  userData.forEach(log => {
    const userId = log.user_id;
    if (!userLogs.has(userId)) {
      userLogs.set(userId, []);
    }
    userLogs.get(userId)!.push(log);
  });
  
  // Detect anomalies for each user
  userLogs.forEach((logs, userId) => {
    const stats = calculateUserStats(logs);
    userStats.set(userId, stats);
    
    // Check for unusual action patterns
    const recentActions = logs.slice(-10).map(l => l.action_type);
    const unusualActions = recentActions.filter(action => 
      !stats.commonActions.includes(action)
    );
    
    if (unusualActions.length >= 3) {
      alerts.push({
        id: generateAlertId(),
        type: 'unusual_behavior',
        severity: 'medium',
        message: `Unusual action pattern detected for user ${userId}`,
        timestamp: Date.now(),
        details: {
          unusualActions,
          typicalActions: stats.commonActions
        },
        affectedUsers: [userId]
      });
    }
  });
  
  return alerts;
}

/**
 * Calculate user statistics for baseline
 */
function calculateUserStats(logs: any[]): {
  avgRequestsPerDay: number;
  commonActions: string[];
  typicalHours: number[];
} {
  // Group by day
  const dailyCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  
  logs.forEach(log => {
    const date = new Date(log.timestamp).toDateString();
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    
    const action = log.action_type;
    actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    
    const hour = new Date(log.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  
  // Calculate averages
  const avgRequestsPerDay = Array.from(dailyCounts.values())
    .reduce((a, b) => a + b, 0) / dailyCounts.size || 0;
  
  // Get top 5 common actions
  const commonActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action]) => action);
  
  // Get typical hours (top 5)
  const typicalHours = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hour]) => hour);
  
  return {
    avgRequestsPerDay,
    commonActions,
    typicalHours
  };
}

/**
 * Check for specific security patterns
 */
function checkPatterns(logs: any[], patterns: string[]): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];
  
  patterns.forEach(pattern => {
    const regex = new RegExp(pattern, 'i');
    
    logs.forEach(log => {
      const logString = JSON.stringify(log);
      if (regex.test(logString)) {
        alerts.push({
          id: generateAlertId(),
          type: 'pattern_match',
          severity: 'high',
          message: `Security pattern matched: ${pattern}`,
          timestamp: Date.now(),
          details: {
            pattern,
            userId: log.user_id,
            timestamp: log.timestamp
          },
          affectedUsers: [log.user_id]
        });
      }
    });
  });
  
  return alerts;
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (event: MessageEvent<SecurityAnalysisRequest>) => {
  const { type, data, requestId } = event.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'analyzeLogs':
        result = analyzeLogs(data.logs, data.timeRange);
        break;
        
      case 'detectAnomalies':
        result = detectAnomalies(data.userData);
        break;
        
      case 'checkPatterns':
        result = checkPatterns(data.logs, data.patterns);
        break;
        
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }
    
    const response: SecurityAnalysisResponse = {
      type: 'result',
      requestId,
      data: result
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: SecurityAnalysisResponse = {
      type: 'error',
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    self.postMessage(response);
  }
};

// Export types for TypeScript
export type { SecurityAnalysisRequest, SecurityAnalysisResponse, SecurityAlert };
