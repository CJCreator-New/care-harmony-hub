import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone,
  Maximize2, Minimize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PatientVideoCallModalProps {
  /** Set to true to keep the component mounted and listening for incoming calls */
  listening: boolean;
  appointmentId: string;
  doctorName?: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function PatientVideoCallModal({
  listening,
  appointmentId,
  doctorName,
}: PatientVideoCallModalProps) {
  const [open, setOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanup = useCallback(() => {
    signalingChannelRef.current?.send({ type: 'broadcast', event: 'hang-up', payload: {} });
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    setIsConnected(false);
    setRemoteConnected(false);
    setCallDuration(0);
    setIncomingCall(false);
    setOpen(false);
  }, []);

  // Subscribe to signaling channel and wait for incoming offer
  useEffect(() => {
    if (!listening || !appointmentId) return;

    const channel = supabase.channel(`telemedicine:${appointmentId}`, {
      config: { broadcast: { self: false } },
    });
    signalingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.sdp) {
          pendingOfferRef.current = payload.sdp as RTCSessionDescriptionInit;
          setIncomingCall(true);
          setOpen(true);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (!payload.candidate) return;
        const pc = peerConnectionRef.current;
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate as RTCIceCandidateInit));
        } else {
          pendingCandidatesRef.current.push(payload.candidate as RTCIceCandidateInit);
        }
      })
      .on('broadcast', { event: 'hang-up' }, () => {
        toast.info('Doctor ended the call');
        cleanup();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, appointmentId]);

  const handleAnswerCall = async () => {
    if (!pendingOfferRef.current || !signalingChannelRef.current) return;

    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setRemoteConnected(true);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signalingChannelRef.current?.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          setRemoteConnected(false);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));

      // Drain any ICE candidates that arrived before remote description was set
      for (const c of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: { sdp: answer },
      });

      setIncomingCall(false);
      setIsConnected(true);

      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      toast.success('Call connected');
    } catch (error) {
      console.error('Failed to answer call:', error);
      toast.error('Could not join the call. Check camera/microphone permissions.');
    }
  };

  const handleDeclineCall = () => {
    signalingChannelRef.current?.send({ type: 'broadcast', event: 'hang-up', payload: {} });
    setIncomingCall(false);
    setOpen(false);
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioEnabled(track.enabled);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerConnectionRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      if (signalingChannelRef.current) supabase.removeChannel(signalingChannelRef.current);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cleanup(); }}>
      <DialogContent className={`${isFullscreen ? 'max-w-full h-full' : 'max-w-3xl'} p-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">Telemedicine Consultation</h3>
                {doctorName && (
                  <p className="text-sm text-muted-foreground">Dr. {doctorName}</p>
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
              <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 bg-muted p-4">
            {incomingCall && !isConnected ? (
              /* Incoming call banner */
              <div className="flex items-center justify-center h-full min-h-[320px]">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
                    <Phone className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Incoming Video Call</h3>
                    <p className="text-muted-foreground mt-1">
                      {doctorName ? `Dr. ${doctorName}` : 'Your doctor'} is calling
                    </p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button size="lg" onClick={handleAnswerCall} className="gap-2 bg-green-600 hover:bg-green-700">
                      <Phone className="h-5 w-5" />
                      Answer
                    </Button>
                    <Button size="lg" variant="destructive" onClick={handleDeclineCall} className="gap-2">
                      <PhoneOff className="h-5 w-5" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ) : isConnected ? (
              /* Active call — show remote + local video */
              <div className="relative h-full min-h-[400px]">
                <div className="w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${!remoteConnected ? 'hidden' : ''}`}
                  />
                  {!remoteConnected && (
                    <div className="text-center text-white">
                      <p className="text-lg">Connecting to doctor...</p>
                    </div>
                  )}
                </div>
                {/* Local PiP */}
                <div className="absolute bottom-4 right-4 w-40 h-28 rounded-lg overflow-hidden shadow-lg border-2 border-background">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                  />
                  {!isVideoEnabled && (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <VideoOff className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Controls (shown only when connected) */}
          {isConnected && (
            <div className="flex items-center justify-center gap-4 p-4 border-t bg-background">
              <Button
                variant={isAudioEnabled ? 'outline' : 'destructive'}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                variant={isVideoEnabled ? 'outline' : 'destructive'}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={cleanup}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
