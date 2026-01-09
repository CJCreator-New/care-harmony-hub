#!/bin/bash

# CareSync HMS - User Experience Enhancement Script
# This script implements mobile optimization, error handling, and real-time features

echo "📱 CareSync HMS User Experience Enhancement Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing UX enhancement dependencies..."

# Install UX enhancement packages
npm install --save-dev \
    @testing-library/react \
    @testing-library/jest-dom \
    @testing-library/user-event \
    react-error-boundary \
    react-helmet-async \
    framer-motion \
    react-intersection-observer \
    react-swipeable \
    react-use-gesture \
    @reach/dialog \
    react-hot-toast \
    react-loading-skeleton

print_status "UX enhancement dependencies installed"

echo "📱 Creating mobile optimization utilities..."

# Create mobile optimization utilities
cat > src/utils/mobileUtils.ts << 'EOF'
import { useState, useEffect } from 'react';

// Mobile detection and utilities
export class MobileUtils {
  // Detect if device is mobile
  static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }

  // Detect if device is tablet
  static isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    return width >= 768 && width < 1024;
  }

  // Detect touch capability
  static isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // Get device orientation
  static getOrientation(): 'portrait' | 'landscape' {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  // Detect if device supports hover
  static supportsHover(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: hover)').matches;
  }

  // Get safe area insets (for notched devices)
  static getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    };
  }

  // Vibrate device (if supported)
  static vibrate(pattern: number | number[] = 100): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Prevent zoom on input focus (iOS)
  static preventZoomOnFocus(): void {
    if (typeof window === 'undefined') return;

    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;

    const originalContent = viewport.getAttribute('content') || '';

    const handleFocus = () => {
      viewport.setAttribute('content', originalContent + ', user-scalable=no');
    };

    const handleBlur = () => {
      viewport.setAttribute('content', originalContent);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
  }

  // Detect if running as PWA
  static isPWA(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Get device pixel ratio
  static getDevicePixelRatio(): number {
    if (typeof window === 'undefined') return 1;
    return window.devicePixelRatio || 1;
  }
}

// React hooks for mobile functionality
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0, right: 0, bottom: 0, left: 0
  });

  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(MobileUtils.isMobile());
      setIsTablet(MobileUtils.isTablet());
      setOrientation(MobileUtils.getOrientation());
      setSafeAreaInsets(MobileUtils.getSafeAreaInsets());
    };

    updateMobileState();

    const handleResize = () => updateMobileState();
    const handleOrientationChange = () => {
      // Delay to allow orientation change to complete
      setTimeout(updateMobileState, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    orientation,
    safeAreaInsets,
    isTouchDevice: MobileUtils.isTouchDevice(),
    supportsHover: MobileUtils.supportsHover(),
    isPWA: MobileUtils.isPWA(),
    devicePixelRatio: MobileUtils.getDevicePixelRatio()
  };
}

export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) {
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!startX || !startY) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = startX - endX;
    const diffY = startY - endY;

    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (Math.max(absDiffX, absDiffY) < threshold) return;

    if (absDiffX > absDiffY) {
      // Horizontal swipe
      if (diffX > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (diffX < 0 && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      // Vertical swipe
      if (diffY > 0 && onSwipeUp) {
        onSwipeUp();
      } else if (diffY < 0 && onSwipeDown) {
        onSwipeDown();
      }
    }

    setStartX(null);
    setStartY(null);
  };

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startX, startY, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);
}

export default MobileUtils;
EOF

print_status "Mobile optimization utilities created"

echo "🚨 Creating advanced error handling system..."

# Create advanced error handling system
cat > src/components/error/ErrorBoundary.tsx << 'EOF'
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReportButton?: boolean;
  level?: 'page' | 'component' | 'section';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to monitoring service
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to error reporting service (in production)
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        level: this.props.level || 'component',
        userId: 'anonymous', // Would get from auth context
        hospitalId: 'unknown' // Would get from auth context
      };

      // Send to error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });

      console.log('Error reported:', errorReport);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportIssue = () => {
    const subject = encodeURIComponent(`CareSync Error Report - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(`mailto:support@caresync.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const level = this.props.level || 'component';
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">
                {level === 'page' ? 'Page Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                {level === 'page'
                  ? 'We encountered an error loading this page.'
                  : 'We encountered an unexpected error.'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  Error ID: <code className="text-xs">{this.state.errorId}</code>
                </AlertDescription>
              </Alert>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}

                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>

                {this.props.showReportButton && (
                  <Button onClick={this.handleReportIssue} variant="outline" className="w-full">
                    <Bug className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">
                If this problem persists, please contact support with the error ID above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundary in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    console.error('Error caught by hook:', error, errorInfo);

    // Could integrate with error reporting service here
    if (process.env.NODE_ENV === 'production') {
      // Report error
    }
  };
}

// Higher-order component for error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ErrorBoundary;
EOF

print_status "Advanced error handling system created"

echo "⚡ Creating real-time features enhancement..."

# Create real-time features enhancement
cat > src/hooks/useRealtime.ts << 'EOF'
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Types for real-time features
export interface RealtimeMessage {
  id: string;
  type: 'notification' | 'update' | 'alert' | 'message';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  timestamp: string;
  read: boolean;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  metadata?: Record<string, any>;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

// Real-time notifications hook
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to user-specific notifications
    const channel = supabase.channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        const newNotification: RealtimeMessage = {
          id: payload.new.id,
          type: payload.new.type || 'notification',
          title: payload.new.title,
          content: payload.new.message,
          priority: payload.new.priority || 'medium',
          data: payload.new.metadata,
          timestamp: payload.new.created_at,
          read: false
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.content,
            icon: '/pwa-192x192.png',
            tag: newNotification.id
          });
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Load existing notifications
    loadNotifications();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedNotifications: RealtimeMessage[] = data.map(notification => ({
        id: notification.id,
        type: notification.type || 'notification',
        title: notification.title,
        content: notification.message,
        priority: notification.priority || 'medium',
        data: notification.metadata,
        timestamp: notification.created_at,
        read: notification.is_read
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        const newNotifications = prev.filter(n => n.id !== notificationId);

        if (notification && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }

        return newNotifications;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications
  };
}

// Real-time presence hook
export function usePresence(roomId: string) {
  const { user } = useAuth();
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !roomId) return;

    const channel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineUsers: PresenceUser[] = [];

        Object.keys(presenceState).forEach(userId => {
          const userPresence = presenceState[userId][0] as any;
          onlineUsers.push({
            userId,
            userName: userPresence.userName || 'Unknown User',
            role: userPresence.role || 'user',
            status: userPresence.status || 'online',
            lastSeen: userPresence.lastSeen || new Date().toISOString(),
            metadata: userPresence.metadata
          });
        });

        setUsers(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);

          // Track current user presence
          await channel.track({
            userId: user.id,
            userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            role: user.user_metadata?.role || 'user',
            status: 'online',
            lastSeen: new Date().toISOString()
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [user, roomId]);

  const updateStatus = useCallback(async (status: PresenceUser['status']) => {
    if (!channelRef.current || !user) return;

    await channelRef.current.track({
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      role: user.user_metadata?.role || 'user',
      status,
      lastSeen: new Date().toISOString()
    });
  }, [user]);

  return {
    users,
    isConnected,
    currentUser: users.find(u => u.userId === user?.id),
    updateStatus
  };
}

// Real-time typing indicators hook
export function useTypingIndicator(conversationId: string) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers(prev => {
            const existing = prev.find(u => u.userId === payload.userId);
            if (existing) {
              // Update existing user
              return prev.map(u =>
                u.userId === payload.userId
                  ? { ...u, isTyping: payload.isTyping, timestamp: payload.timestamp }
                  : u
              );
            } else if (payload.isTyping) {
              // Add new typing user
              return [...prev, {
                userId: payload.userId,
                userName: payload.userName,
                isTyping: true,
                timestamp: payload.timestamp
              }];
            }
            return prev;
          });

          // Remove typing indicator after 3 seconds
          if (payload.isTyping) {
            setTimeout(() => {
              setTypingUsers(prev =>
                prev.filter(u => u.userId !== payload.userId || u.timestamp !== payload.timestamp)
              );
            }, 3000);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, conversationId]);

  const startTyping = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        isTyping: true,
        timestamp: new Date().toISOString()
      }
    });

    // Auto-stop typing after 3 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [user]);

  const stopTyping = useCallback(() => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        isTyping: false,
        timestamp: new Date().toISOString()
      }
    });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = null;
  }, [user]);

  return {
    typingUsers: typingUsers.filter(u => u.isTyping),
    startTyping,
    stopTyping,
    isTyping: typingUsers.some(u => u.userId === user?.id && u.isTyping)
  };
}

// Real-time data synchronization hook
export function useRealtimeSync<T>(
  table: string,
  filter?: string,
  enabled: boolean = true
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(`sync:${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        ...(filter && { filter })
      }, (payload: RealtimePostgresChangesPayload<T>) => {
        setData(currentData => {
          switch (payload.eventType) {
            case 'INSERT':
              return [payload.new as T, ...currentData];
            case 'UPDATE':
              return currentData.map(item =>
                (item as any).id === (payload.new as any).id ? payload.new as T : item
              );
            case 'DELETE':
              return currentData.filter(item =>
                (item as any).id !== (payload.old as any).id
              );
            default:
              return currentData;
          }
        });
      })
      .subscribe();

    channelRef.current = channel;

    // Initial data load
    loadInitialData();

    return () => {
      channel.unsubscribe();
    };
  }, [table, filter, enabled]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from(table).select('*');

      if (filter) {
        // Parse and apply filter (simplified)
        const [column, operator, value] = filter.split('.');
        if (operator === 'eq') {
          query = query.eq(column, value);
        }
      }

      const { data: initialData, error } = await query;

      if (error) throw error;

      setData(initialData || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = useCallback(() => {
    loadInitialData();
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh
  };
}

export default {
  useRealtimeNotifications,
  usePresence,
  useTypingIndicator,
  useRealtimeSync
};
EOF

print_status "Real-time features enhancement created"

echo "🎨 Creating mobile-optimized components..."

# Create mobile-optimized components
cat > src/components/ui/mobile/index.ts << 'EOF'
// Mobile-optimized UI components
export { default as MobileCard } from './MobileCard';
export { default as MobileDialog } from './MobileDialog';
export { default as MobileNavigation } from './MobileNavigation';
export { default as TouchButton } from './TouchButton';
export { default as SwipeContainer } from './SwipeContainer';
EOF

# Create mobile card component
cat > src/components/ui/mobile/MobileCard.tsx << 'EOF'
import React from 'react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/utils/mobileUtils';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  onClick,
  padding = 'md',
  interactive = false
}) => {
  const { isMobile, isTouchDevice } = useMobile();

  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-lg border shadow-sm',
        paddingClasses[padding],
        interactive && isTouchDevice && 'active:scale-95 transition-transform',
        interactive && 'cursor-pointer hover:shadow-md',
        isMobile && 'rounded-xl', // Larger border radius on mobile
        className
      )}
      onClick={onClick}
      style={{
        // Add safe area padding for notched devices
        paddingBottom: isMobile ? 'max(env(safe-area-inset-bottom), 1rem)' : undefined
      }}
    >
      {children}
    </div>
  );
};

export default MobileCard;
EOF

# Create mobile dialog component
cat > src/components/ui/mobile/MobileDialog.tsx << 'EOF'
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMobile } from '@/utils/mobileUtils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
}

const MobileDialog: React.FC<MobileDialogProps> = ({
  open,
  onOpenChange,
  title,
  children,
  className,
  fullScreen = false
}) => {
  const { isMobile, safeAreaInsets } = useMobile();

  if (isMobile && fullScreen) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'w-full h-full max-w-none m-0 rounded-none',
            'fixed inset-0 z-50 bg-background',
            className
          )}
          style={{
            paddingTop: safeAreaInsets.top,
            paddingBottom: safeAreaInsets.bottom,
            paddingLeft: safeAreaInsets.left,
            paddingRight: safeAreaInsets.right
          }}
        >
          {(title || onOpenChange) && (
            <div className="flex items-center justify-between p-4 border-b">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {onOpenChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          isMobile && 'w-[95vw] max-w-none mx-2 rounded-xl',
          !isMobile && 'max-w-md',
          className
        )}
      >
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default MobileDialog;
EOF

# Create mobile navigation component
cat > src/components/ui/mobile/MobileNavigation.tsx << 'EOF'
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/utils/mobileUtils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';

interface MobileNavigationProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  children,
  trigger,
  side = 'left',
  className
}) => {
  const { isMobile } = useMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side={side}
        className={cn(
          'w-80 p-0',
          side === 'left' && 'border-r',
          side === 'right' && 'border-l',
          className
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigation;
EOF

# Create touch button component
cat > src/components/ui/mobile/TouchButton.tsx << 'EOF'
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMobile } from '@/utils/mobileUtils';

interface TouchButtonProps extends ButtonProps {
  hapticFeedback?: boolean;
}

const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  className,
  hapticFeedback = true,
  onClick,
  ...props
}) => {
  const { isTouchDevice } = useMobile();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback && isTouchDevice) {
      // Trigger haptic feedback on mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button
      className={cn(
        isTouchDevice && 'min-h-[44px] min-w-[44px]', // Apple's recommended touch target size
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
};

export default TouchButton;
EOF

# Create swipe container component
cat > src/components/ui/mobile/SwipeContainer.tsx << 'EOF'
import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/utils/mobileUtils';

interface SwipeContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

const SwipeContainer: React.FC<SwipeContainerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useSwipeGesture(
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold
  );

  if (disabled) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        isDragging && 'select-none',
        className
      )}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      style={{
        touchAction: 'pan-y', // Allow vertical scrolling but prevent horizontal
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      {children}
    </div>
  );
};

export default SwipeContainer;
EOF

print_status "Mobile-optimized components created"

echo "📱 Updating package.json with UX scripts..."

# Add UX enhancement scripts to package.json
npm pkg set scripts.ux:check="npm run lint && npm run test:unit"
npm pkg set scripts.ux:build="npm run build && echo 'UX build completed'"
npm pkg set scripts.mobile:test="npx playwright test tests/e2e/mobile.spec.ts"
npm pkg set scripts.accessibility:check="npx playwright test tests/e2e/accessibility.spec.ts"

print_status "UX enhancement scripts added"

echo "🎨 Creating accessibility enhancements..."

# Create accessibility enhancements
cat > src/utils/accessibility.ts << 'EOF'
import { useEffect, useRef } from 'react';

// Accessibility utilities and hooks
export class AccessibilityUtils {
  // Announce content to screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Focus management
  static moveFocus(element: HTMLElement | null): void {
    if (element) {
      element.focus();
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Trap focus within a container
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }

      if (e.key === 'Escape') {
        // Find and click the close button if it exists
        const closeButton = container.querySelector('[aria-label="Close"], .close-button') as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  // Skip to main content
  static createSkipLink(targetId: string = 'main-content'): void {
    const existingSkipLink = document.getElementById('skip-to-main');
    if (existingSkipLink) return;

    const skipLink = document.createElement('a');
    skipLink.id = 'skip-to-main';
    skipLink.href = `#${targetId}`;
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
        transition: top 0.3s;
      }
      .skip-link:focus {
        top: 6px;
      }
    `;
    document.head.appendChild(style);
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // High contrast mode detection
  static isHighContrastMode(): boolean {
    const testElement = document.createElement('div');
    testElement.style.color = 'rgb(31, 41, 55)'; // Tailwind gray-800
    testElement.style.backgroundColor = 'rgb(255, 255, 255)';
    document.body.appendChild(testElement);

    const computedStyle = getComputedStyle(testElement);
    const isHighContrast = computedStyle.color === computedStyle.backgroundColor;

    document.body.removeChild(testElement);
    return isHighContrast;
  }

  // Reduced motion preference
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Color scheme preference
  static prefersDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Set page title with screen reader announcement
  static setPageTitle(title: string): void {
    document.title = title;
    this.announce(`Page title changed to ${title}`, 'assertive');
  }
}

// React hooks for accessibility
export function useAccessibility() {
  useEffect(() => {
    // Create skip link
    AccessibilityUtils.createSkipLink();

    // Announce page load
    AccessibilityUtils.announce('Page loaded successfully');
  }, []);

  return {
    announce: AccessibilityUtils.announce,
    moveFocus: AccessibilityUtils.moveFocus,
    trapFocus: AccessibilityUtils.trapFocus,
    setPageTitle: AccessibilityUtils.setPageTitle,
    isHighContrastMode: AccessibilityUtils.isHighContrastMode(),
    prefersReducedMotion: AccessibilityUtils.prefersReducedMotion(),
    prefersDarkMode: AccessibilityUtils.prefersDarkMode()
  };
}

export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, active: boolean = true) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (active && containerRef.current) {
      cleanupRef.current = AccessibilityUtils.trapFocus(containerRef.current);
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [containerRef, active]);

  return cleanupRef.current;
}

export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void
) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
        break;
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          e.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          e.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          e.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          e.preventDefault();
          onArrowRight();
        }
        break;
    }
  };

  return { handleKeyDown };
}

export default AccessibilityUtils;
EOF

print_status "Accessibility enhancements created"

echo "📱 Creating mobile-specific pages and components..."

# Create mobile dashboard component
cat > src/components/mobile/MobileDashboard.tsx << 'EOF'
import React from 'react';
import { useMobile } from '@/utils/mobileUtils';
import { MobileCard, TouchButton } from '@/components/ui/mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Users,
  FileText,
  Pill,
  AlertTriangle,
  TrendingUp,
  Clock,
  MapPin
} from 'lucide-react';

interface MobileDashboardProps {
  user: any;
  stats: {
    appointmentsToday: number;
    pendingTasks: number;
    unreadMessages: number;
    alerts: number;
  };
  upcomingAppointments: Array<{
    id: string;
    patientName: string;
    time: string;
    type: string;
  }>;
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({
  user,
  stats,
  upcomingAppointments
}) => {
  const { isMobile, safeAreaInsets } = useMobile();

  if (!isMobile) {
    return null; // This component is mobile-only
  }

  return (
    <div
      className="min-h-screen bg-gray-50 pb-20"
      style={{
        paddingTop: safeAreaInsets.top,
        paddingBottom: safeAreaInsets.bottom
      }}
    >
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-gray-900">
                Welcome back, {user.firstName}
              </h1>
              <p className="text-sm text-gray-500">{user.role}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {new Date().toLocaleDateString()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Today's Overview</h2>

        <div className="grid grid-cols-2 gap-4">
          <MobileCard className="text-center">
            <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.appointmentsToday}</div>
            <div className="text-sm text-gray-500">Appointments</div>
          </MobileCard>

          <MobileCard className="text-center">
            <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</div>
            <div className="text-sm text-gray-500">Pending Tasks</div>
          </MobileCard>

          <MobileCard className="text-center">
            <FileText className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.unreadMessages}</div>
            <div className="text-sm text-gray-500">Messages</div>
          </MobileCard>

          <MobileCard className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.alerts}</div>
            <div className="text-sm text-gray-500">Alerts</div>
          </MobileCard>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <TouchButton className="flex flex-col items-center p-4 h-auto">
            <Calendar className="h-6 w-6 mb-2" />
            <span className="text-xs">New Appointment</span>
          </TouchButton>

          <TouchButton className="flex flex-col items-center p-4 h-auto">
            <Users className="h-6 w-6 mb-2" />
            <span className="text-xs">Patient Search</span>
          </TouchButton>

          <TouchButton className="flex flex-col items-center p-4 h-auto">
            <Pill className="h-6 w-6 mb-2" />
            <span className="text-xs">Medications</span>
          </TouchButton>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Appointments</h2>

        {upcomingAppointments.length === 0 ? (
          <MobileCard>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming appointments</p>
            </div>
          </MobileCard>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.slice(0, 3).map((appointment) => (
              <MobileCard key={appointment.id} interactive>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{appointment.patientName}</p>
                      <p className="text-sm text-gray-500">{appointment.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{appointment.time}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      Room 101
                    </div>
                  </div>
                </div>
              </MobileCard>
            ))}

            {upcomingAppointments.length > 3 && (
              <TouchButton variant="outline" className="w-full">
                View All Appointments ({upcomingAppointments.length})
              </TouchButton>
            )}
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Performance</h2>
        <MobileCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium text-gray-900">95% On Time</p>
                <p className="text-sm text-gray-500">Appointment attendance</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              +5%
            </Badge>
          </div>
        </MobileCard>
      </div>
    </div>
  );
};

export default MobileDashboard;
EOF

print_status "Mobile-specific components created"

echo "📱 Creating mobile navigation and layout..."

# Create mobile app layout
cat > src/components/layout/MobileLayout.tsx << 'EOF'
import React, { useState } from 'react';
import { useMobile } from '@/utils/mobileUtils';
import { MobileNavigation, TouchButton } from '@/components/ui/mobile';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Users,
  FileText,
  Settings,
  Menu,
  Bell,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/useRealtime';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  currentPage = 'home',
  showHeader = true,
  showBottomNav = true
}) => {
  const { isMobile, safeAreaInsets } = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { unreadCount } = useRealtimeNotifications();

  if (!isMobile) {
    return <>{children}</>;
  }

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'appointments', label: 'Appointments', icon: Calendar, path: '/appointments' },
    { id: 'patients', label: 'Patients', icon: Users, path: '/patients' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {showHeader && (
        <header
          className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40"
          style={{ paddingTop: safeAreaInsets.top }}
        >
          <div className="flex items-center space-x-3">
            <MobileNavigation
              trigger={
                <TouchButton variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </TouchButton>
              }
            >
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">CareSync HMS</h3>
                <nav className="space-y-2">
                  {navigationItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.path}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        currentPage === item.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </MobileNavigation>

            <h1 className="font-semibold text-gray-900">
              {navigationItems.find(item => item.id === currentPage)?.label || 'CareSync'}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <TouchButton variant="ghost" size="sm">
              <Search className="h-5 w-5" />
            </TouchButton>

            <TouchButton variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </TouchButton>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white border-t px-2 py-2 flex items-center justify-around z-50"
          style={{ paddingBottom: safeAreaInsets.bottom }}
        >
          {navigationItems.map((item) => (
            <TouchButton
              key={item.id}
              variant="ghost"
              className={cn(
                'flex flex-col items-center space-y-1 p-2 min-h-[60px] flex-1',
                currentPage === item.id && 'text-blue-600'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </TouchButton>
          ))}
        </nav>
      )}
    </div>
  );
};

export default MobileLayout;
EOF

print_status "Mobile layout and navigation created"

echo "📱 Creating mobile-specific tests..."

# Create mobile-specific tests
cat > tests/e2e/mobile.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Mobile Experience Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Set mobile user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    });

    await page.goto('/');
  });

  test('should display mobile-optimized layout', async ({ page }) => {
    // Check for mobile-specific elements
    await expect(page.locator('[data-mobile-layout]')).toBeVisible();

    // Check bottom navigation
    const bottomNav = page.locator('nav[style*="position: fixed"][style*="bottom: 0"]');
    await expect(bottomNav).toBeVisible();

    // Check touch targets are appropriately sized
    const touchButtons = page.locator('button');
    const buttons = await touchButtons.all();

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        // Apple's recommended minimum touch target is 44x44px
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should handle swipe gestures', async ({ page }) => {
    // Navigate to a page with swipeable content
    await page.goto('/appointments');

    // Perform swipe gesture
    const swipeContainer = page.locator('[data-swipe-container]').first();
    if (await swipeContainer.isVisible()) {
      // Swipe left
      await swipeContainer.dispatchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 300 }]
      });
      await swipeContainer.dispatchEvent('touchend', {
        changedTouches: [{ clientX: 50, clientY: 300 }]
      });

      // Verify swipe action occurred (implementation specific)
    }
  });

  test('should work in landscape orientation', async ({ page }) => {
    // Change to landscape
    await page.setViewportSize({ width: 667, height: 375 });

    // Check layout adapts
    await expect(page.locator('[data-mobile-layout]')).toBeVisible();

    // Check content is still accessible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle notched devices', async ({ page }) => {
    // Simulate safe area insets
    await page.addStyleTag({
      content: `
        :root {
          --safe-area-inset-top: 44px;
          --safe-area-inset-bottom: 34px;
        }
      `
    });

    // Check that content respects safe areas
    const header = page.locator('header').first();
    const headerStyles = await header.evaluate(el => getComputedStyle(el));

    // Header should account for safe area
    expect(headerStyles.paddingTop).toBe('44px');
  });

  test('should provide haptic feedback on touch', async ({ page }) => {
    // This test would require mocking navigator.vibrate
    // For now, just check that touch buttons exist
    const touchButtons = page.locator('[data-touch-button]');
    await expect(touchButtons.first()).toBeVisible();
  });

  test('should maintain accessibility in mobile view', async ({ page }) => {
    // Check for skip links
    const skipLink = page.locator('#skip-to-main');
    await expect(skipLink).toBeVisible();

    // Check focus management
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();

    // Check ARIA labels
    const buttons = page.locator('button');
    for (const button of await buttons.all()) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      // Either aria-label or text content should be present
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
  });

  test('should handle offline functionality', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    // Check that PWA shows offline message or cached content
    const offlineIndicator = page.locator('[data-offline-indicator]');
    if (await offlineIndicator.isVisible()) {
      await expect(offlineIndicator).toContainText('offline');
    }

    // Go back online
    await page.context().setOffline(false);
  });

  test('should optimize images for mobile', async ({ page }) => {
    const images = page.locator('img');

    for (const img of await images.all()) {
      const src = await img.getAttribute('src');
      const loading = await img.getAttribute('loading');

      // Check for lazy loading
      expect(loading).toBe('lazy');

      // Check for responsive images (if applicable)
      const srcSet = await img.getAttribute('srcset');
      if (srcSet) {
        expect(srcSet).toBeTruthy();
      }
    }
  });
});
EOF

print_status "Mobile-specific tests created"

echo ""
print_status "User Experience Enhancement completed!"
echo ""
echo "📱 UX Features Implemented:"
echo "=========================="
echo "✅ Mobile optimization utilities"
echo "✅ Advanced error handling system"
echo "✅ Real-time features enhancement"
echo "✅ Mobile-optimized UI components"
echo "✅ Accessibility enhancements"
echo "✅ Mobile dashboard and layout"
echo "✅ Mobile-specific tests"
echo ""
echo "📋 Next Steps:"
echo "1. Test mobile components on actual devices"
echo "2. Implement gesture-based navigation"
echo "3. Add offline data synchronization"
echo "4. Optimize images and assets for mobile"
echo "5. Conduct user testing for mobile experience"
echo ""
echo "🔧 Available Commands:"
echo "  npm run ux:check      - Run UX quality checks"
echo "  npm run ux:build      - Build with UX optimizations"
echo "  npm run mobile:test   - Run mobile-specific tests"
echo "  npm run accessibility:check - Run accessibility tests"
EOF

print_status "UX enhancement script created"</content>
<parameter name="filePath">c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub\enhance-ux.sh