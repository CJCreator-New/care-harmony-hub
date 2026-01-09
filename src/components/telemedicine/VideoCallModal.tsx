import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Maximize2,
  Minimize2,
  MessageSquare,
  Settings,
  Monitor,
  MonitorOff,
  Circle,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';

interface VideoCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  } | null;
  appointmentId?: string;
}

export function VideoCallModal({ 
  open, 
  onOpenChange, 
  patient,
  appointmentId 
}: VideoCallModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start local video stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Could not access camera/microphone. Please check permissions.');
      throw error;
    }
  };

  // Start recording
  const startRecording = () => {
    if (!localStreamRef.current) return;
    
    try {
      const recorder = new MediaRecorder(localStreamRef.current, {
        mimeType: 'video/webm;codecs=vp9',
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telemedicine-call-${new Date().toISOString().slice(0, 19)}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setRecordedChunks([]);
        toast.success('Recording saved');
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (localStreamRef.current) {
          const screenTrack = localStreamRef.current.getVideoTracks().find(track => track.label.includes('screen'));
          if (screenTrack) {
            screenTrack.stop();
            // Switch back to camera
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            
            // Replace the screen track with camera track
            const sender = localStreamRef.current.getVideoTracks().find(track => track.label.includes('screen'));
            if (sender) {
              localStreamRef.current.removeTrack(sender);
              localStreamRef.current.addTrack(cameraTrack);
              
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
              }
            }
          }
        }
        setIsScreenSharing(false);
        toast.success('Screen sharing stopped');
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          // Replace camera track with screen track
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            localStreamRef.current.removeTrack(videoTrack);
            videoTrack.stop();
          }
          
          localStreamRef.current.addTrack(screenTrack);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          
          // Handle when user stops sharing via browser UI
          screenTrack.onended = () => {
            setIsScreenSharing(false);
            toast.info('Screen sharing ended');
          };
        }
        
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to toggle screen sharing');
    }
  };

  // Handle call start
  const handleStartCall = async () => {
    setIsConnecting(true);
    
    try {
      await startLocalStream();
      
      // Simulate connection delay (in real app, this would be WebRTC signaling)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConnected(true);
      setIsConnecting(false);
      
      // Start call timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      toast.success('Call connected');
    } catch (error) {
      setIsConnecting(false);
      toast.error('Failed to start call');
    }
  };

  // Handle call end
  const handleEndCall = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Stop screen sharing
    if (isScreenSharing) {
      setIsScreenSharing(false);
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    setIsConnected(false);
    setCallDuration(0);
    onOpenChange(false);
    
    toast.info('Call ended');
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  // Cleanup when modal closes
  useEffect(() => {
    if (!open && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setIsConnected(false);
      setCallDuration(0);
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isFullscreen ? 'max-w-full h-full' : 'max-w-4xl'} p-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">Telemedicine Consultation</h3>
                {patient && (
                  <p className="text-sm text-muted-foreground">
                    {patient.first_name} {patient.last_name} ({patient.mrn})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
                  {formatDuration(callDuration)}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Video Area */}
          <div className="flex-1 bg-muted p-4">
            {!isConnected ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Card className="p-8 text-center">
                  <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Ready to Start Consultation</h3>
                  <p className="text-muted-foreground mb-6">
                    Click below to start a video call with {patient?.first_name} {patient?.last_name}
                  </p>
                  <Button 
                    size="lg" 
                    onClick={handleStartCall}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Phone className="h-5 w-5" />
                        Start Video Call
                      </>
                    )}
                  </Button>
                </Card>
              </div>
            ) : (
              <div className="relative h-full min-h-[400px]">
                {/* Remote Video (Patient) */}
                <div className="w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover hidden"
                  />
                  {/* Placeholder when no remote stream */}
                  <div className="text-center text-white">
                    <div className="w-24 h-24 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl font-bold">
                        {patient?.first_name?.[0]}{patient?.last_name?.[0]}
                      </span>
                    </div>
                    <p className="text-lg">Waiting for patient to connect...</p>
                    <p className="text-sm text-muted-foreground">
                      Patient will see their video feed here
                    </p>
                  </div>
                </div>

                {/* Local Video (Doctor) - Picture in Picture */}
                <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-background">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                  />
                  {!isVideoEnabled && (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <VideoOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          {isConnected && (
            <div className="flex items-center justify-center gap-4 p-4 border-t bg-background">
              <Button
                variant={isAudioEnabled ? "outline" : "destructive"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isVideoEnabled ? "outline" : "destructive"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleScreenShare}
                title={isScreenSharing ? "Stop screen sharing" : "Share screen"}
              >
                {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleRecording}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? <Square className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </Button>
              
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={handleEndCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
