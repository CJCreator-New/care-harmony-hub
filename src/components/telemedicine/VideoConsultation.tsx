import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTelemedicine } from '@/hooks/useTelemedicine';
import { 
  Video, VideoOff, Mic, MicOff, Phone, 
  PhoneOff, Settings, Users, Clock 
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface VideoConsultationProps {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  userType: 'doctor' | 'patient';
}

export function VideoConsultation({ 
  appointmentId, 
  doctorId, 
  patientId, 
  userType 
}: VideoConsultationProps) {
  const { 
    createSession, 
    joinSession, 
    endSession, 
    recordConsultation,
    isCreating, 
    isJoining 
  } = useTelemedicine();

  const [sessionId, setSessionId] = useState<string>('');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'connecting' | 'connected' | 'ended'>('waiting');
  const [sessionDuration, setSessionDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStatus === 'connected') {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStatus]);

  const handleStartSession = async () => {
    try {
      setSessionStatus('connecting');
      createSession({ appointmentId, doctorId, patientId }, {
        onSuccess: (session) => {
          if (session?.session_id) {
            setSessionId(session.session_id);
            joinSession({ sessionId: session.session_id, userType });
            setSessionStatus('connected');
          }
        },
        onError: () => {
          setSessionStatus('waiting');
        }
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      setSessionStatus('waiting');
    }
  };

  const handleJoinSession = async (existingSessionId: string) => {
    try {
      setSessionStatus('connecting');
      await joinSession({ sessionId: existingSessionId, userType });
      setSessionId(existingSessionId);
      setSessionStatus('connected');
    } catch (error) {
      console.error('Failed to join session:', error);
      setSessionStatus('waiting');
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession(sessionId);
      setSessionStatus('ended');
      setSessionDuration(0);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Session Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Video className="h-5 w-5 mr-2" />
              Video Consultation
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Badge 
                className={
                  sessionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                  sessionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }
              >
                {sessionStatus}
              </Badge>
              {sessionStatus === 'connected' && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDuration(sessionDuration)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Video Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {sessionStatus === 'connected' ? (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Video consultation in progress</p>
                      <p className="text-sm opacity-75">Session ID: {sessionId.slice(0, 8)}...</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">
                        {sessionStatus === 'waiting' ? 'Ready to start consultation' :
                         sessionStatus === 'connecting' ? 'Connecting...' :
                         'Consultation ended'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Picture-in-Picture */}
                {sessionStatus === 'connected' && (
                  <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg border-2 border-white">
                    <div className="w-full h-full flex items-center justify-center text-white text-xs">
                      You
                    </div>
                  </div>
                )}

                {/* Controls Overlay */}
                {sessionStatus === 'connected' && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-full px-6 py-3">
                      <Button
                        size="sm"
                        variant={isVideoOn ? "default" : "destructive"}
                        onClick={() => setIsVideoOn(!isVideoOn)}
                        className="rounded-full w-12 h-12 p-0"
                      >
                        {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={isAudioOn ? "default" : "destructive"}
                        onClick={() => setIsAudioOn(!isAudioOn)}
                        className="rounded-full w-12 h-12 p-0"
                      >
                        {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleEndSession}
                        className="rounded-full w-12 h-12 p-0"
                      >
                        <PhoneOff className="h-5 w-5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full w-12 h-12 p-0"
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Controls & Info */}
        <div className="space-y-4">
          {/* Connection Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessionStatus === 'waiting' && (
                <Button 
                  onClick={handleStartSession}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? 'Starting...' : 'Start Consultation'}
                </Button>
              )}

              {sessionStatus === 'connected' && userType === 'doctor' && (
                <Button 
                  onClick={() => recordConsultation({
                    sessionId,
                    notes: {
                      chief_complaint: 'Telemedicine consultation',
                      diagnosis: 'To be updated',
                      treatment_plan: 'Follow-up as needed'
                    }
                  })}
                  variant="outline"
                  className="w-full"
                >
                  Save Consultation Notes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Participant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Doctor</span>
                  <Badge variant="outline">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Patient</span>
                  <Badge variant="outline">Connected</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Appointment ID:</span>
                <span className="font-mono text-xs">{appointmentId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Session Type:</span>
                <span>Video Consultation</span>
              </div>
              <div className="flex justify-between">
                <span>Quality:</span>
                <Badge variant="outline" className="text-xs">HD</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}