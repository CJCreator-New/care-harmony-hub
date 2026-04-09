# Telemedicine Integration Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Integration engineers, backend developers, clinical IT staff

---

## Table of Contents

1. [Overview](#overview)
2. [Video Provider Integration](#video-provider-integration)
3. [Session Management](#session-management)
4. [API Integration](#api-integration)
5. [Security & Compliance](#security--compliance)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Supported Telemedicine Providers

CareSync HIMS integrates with the following telemedicine providers:

| Provider | Type | Latency | Features | Cost |
|----------|------|---------|----------|------|
| Twilio Video | SDKs | <150ms | Screen share, recording, 100+ users | $0.01-0.05/min |
| Jitsi Meet | Open source | <200ms | Self-hosted, bandwidth efficient | Free |
| Zoom SDK | Enterprise | <100ms | Exam room, whiteboard, waiting room | $0.13-0.50/min |
| WebRTC (custom) | Custom | <100ms | Full control, low cost | Infrastructure only |

**Current implementation**: Twilio Video + Jitsi (fallback)

---

## Video Provider Integration

### Twilio Video Setup

```
TWILIO VIDEO CREDENTIALS

Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: [stored in secrets vault]
API Key: SK[... generated per meeting]

Environment variables:
├─ TWILIO_ACCOUNT_SID
├─ TWILIO_AUTH_TOKEN
└─ TWILIO_TWIML_APP_SID

API Endpoints:
├─ Generate tokens: /api/telemedicine/token
├─ End session: /api/telemedicine/end-session
├─ Record session: /api/telemedicine/recording
└─ Get logs: /api/telemedicine/session-logs

TOKEN GENERATION FLOW

Request comes from frontend:

POST /api/telemedicine/token
Content-Type: application/json
Authorization: Bearer [JWT]
{
  "patient_id": "pat-001",
  "appointment_id": "apt-123",
  "role": "doctor"
}

Backend generates token:

Code: backend/services/telemedicine.ts

import twilio from 'twilio';

export async function generateVideoToken(params: {
  patientId: string;
  appointmentId: string;
  role: 'doctor' | 'patient';
  userId: string;
}) {
  const { appointmentId, role, userId } = params;
  
  // Room name: stable identifier for this appointment
  const roomName = `apt-${appointmentId}`;
  
  // Generate token valid for 1 hour
  const token = twilio.jwt.AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );
  
  // Grant video permission
  const videoGrant = new twilio.jwt.AccessToken.VideoGrant({
    room: roomName
  });
  
  token.addGrant(videoGrant);
  
  // Customize participant name & identity
  token.identity = `${role}-${userId}`;
  
  return token.toJwt();
}

Response to frontend:

{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "roomName": "apt-123",
  "participantName": "doctor-user-456"
}

ROOM CONFIGURATION

Room settings for medical consultation:

Kind: group (max participants: 100)
Recording: Enabled (for medical record)
Audio codec: opus (clearer than g722)
Video codec: vp9 (better quality)
Max participants: 2 (doctor + patient) for standard consultation
  - If multiple participants (e.g., family): max 4

Room stability:
├─ Room created when first participant joins
├─ Remains available while any participant is present
├─ Auto-destroys 5 minutes after last participant leaves
└─ Manual destroy via API if needed
```

### WebRTC Connection

```
WEBRTC NEGOTIATION PROCESS

Step 1: Doctor initiates consultation
├─ Frontend calls: POST /api/telemedicine/initiate
├─ Backend creates room reservation
├─ Backend generates Twilio token
└─ Response includes: token, room ID, configuration

Step 2: Frontend establishes WebRTC connection

Code: frontend/components/TelemedicineConsult.tsx

import { connect, createLocalAudioTrack, createLocalVideoTrack } 
  from 'twilio-video';

export function TelemedicineConsult({ token, roomName }) {
  const [room, setRoom] = useState(null);
  
  useEffect(() => {
    // Request permissions first
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: { width: 640 } })
      .then(stream => {
        // Connect to Twilio room
        return connect(token, {
          name: roomName,
          audio: true,
          video: { width: 640, height: 480 },
          networkQuality: {
            local: 2,  // Publish quality
            remote: 2  // Subscribe quality
          },
          dominantSpeaker: true,
          bandwidthProfile: {
            video: {
              mode: 'collaboration',  // Equal bandwidth to all
              maxSubscriptionBitrate: 2500000  // 2.5 Mbps
            }
          }
        });
      })
      .then(room => {
        console.log(`Joined room: ${room.name}`);
        setRoom(room);
        
        // Participant join handler
        room.on('participantConnected', participant => {
          console.log(`Participant connected: ${participant.sid}`);
        });
        
        // Participant disconnect handler
        room.on('participantDisconnected', participant => {
          console.log(`Participant disconnected: ${participant.sid}`);
        });
        
        return () => {
          room.localParticipant.videoTracks.forEach(track => 
            track.stop()
          );
          room.disconnect();
        };
      })
      .catch(error => {
        console.error('Error connecting to room:', error);
      });
  }, [token, roomName]);
  
  return (
    <div className="telemedicine-container">
      {room && (
        <>
          <Participant key={room.localParticipant.sid} 
                        participant={room.localParticipant} />
          <div className="remote-participants">
            {Array.from(room.participants.values()).map(
              participant => (
                <Participant key={participant.sid} 
                              participant={participant} />
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

Step 3: Stream video/audio between participants
├─ Video codec negotiation (VP9 preferred)
├─ Audio transmission (opus)
├─ Bitrate adaptation based on network quality
└─ Statistics logged every 30 seconds

Step 4: Participant disconnect
├─ Send disconnect event to backend
├─ Cleanup local tracks
├─ Update appointment status to "consulted"
└─ Trigger clinical note auto-save
```

---

## Session Management

### Consultation Lifecycle

```
CONSULTATION STATE MACHINE

States:
┌─────────────┐
│   PENDING   │──────┐
└─────────────┘      │
      ↑              │
      │    schedule  ↓
      │        ┌──────────────┐
      │        │ AWAITING_DOC │
      │        └──────────────┘
      │                │
      │    doc ready   │
      │                ↓
      │        ┌──────────────┐
      │        │   AWAITING_PT │  (patient not yet joined)
      │        └──────────────┘
      │                │
      │  both joined   │
      │                ↓
      │        ┌──────────────┐
      │────────│  IN_PROGRESS │
      │        └──────────────┘
      │                │
      │  doc leaves    │
      │  or timeout     │
      │                ↓
      │        ┌──────────────┐
      │────────│  COMPLETED   │
      │        └──────────────┘
      │
   cancel
      │
      ↓
   CANCELLED

Database schema:

CREATE TABLE telemedicine_sessions (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  doctor_id UUID REFERENCES auth.users(id),
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  room_name VARCHAR(255) UNIQUE,  -- "apt-123"
  status VARCHAR(50),             -- pending, awaiting_doc, etc.
  
  -- Call details
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  
  -- Recording
  recording_sid VARCHAR(255),     -- Twilio recording ID
  recording_url TEXT,             -- Download URL
  recording_stored BOOLEAN,       -- Moved to cold storage?
  transcription TEXT,             -- AI-generated transcript
  
  -- Quality metrics
  doctor_avg_latency_ms INTEGER,
  patient_avg_latency_ms INTEGER,
  max_packet_loss NUMERIC(5,2),
  
  -- Clinical notes
  clinical_notes_id UUID,
  prescription_ids UUID[],        -- Associated prescriptions
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  
  -- RLS: Token scoping
  hospital_scoped_id TEXT GENERATED ALWAYS AS (
    hospital_id::text || ':' || id::text
  ) STORED
);
```

### Session Timeout & Recovery

```
TIMEOUT BEHAVIOR

Session timeout scenarios:

1. Doctor joins but patient doesn't arrive
   ├─ Wait time: 15 minutes
   ├─ Send patient reminder at: 5-minute mark
   ├─ Auto-end at: 15-minute mark
   └─ Status: "No-show"

2. Patient joins, doctor doesn't arrive
   ├─ Auto refund: Issue credit
   ├─ Send apology notification
   └─ Mark doctor as "no-show" (accountability)

3. Network disconnect during session
   ├─ Tolerance: 30 seconds
   ├─ After 30 sec: Participant rejoins or session ends
   ├─ If rejoined: Session continues
   └─ If not rejoined: Session ends, data preserved

4. Inactivity timeout
   ├─ Both participants: 4 hours max session
   ├─ No activity: Close session after 4 hours
   └─ Send warning at: 3:50 mark

RECOVERY AFTER DISCONNECTION

If doctor's internet drops:

1. Reconnection window: 30 seconds
2. Backend updates status: "DOCTOR_RECONNECTING"
3. Patient sees: "Doctor reconnecting..."
4. Doctor can rejoin with same token (still valid)
5. If not rejoined within 30 sec: "consultation ended"

Code: backend handle reconnection

export async function handleParticipantDisconnect(
  sessionId: string,
  participantRole: 'doctor' | 'patient'
) {
  // Update status
  await updateSessionStatus(sessionId, 
    participantRole === 'doctor' 
      ? 'DOCTOR_RECONNECTING' 
      : 'PATIENT_RECONNECTING'
  );
  
  // Start 30-second timer
  const reconnectTimer = setTimeout(async () => {
    const session = await getSession(sessionId);
    if (session.status === 'DOCTOR_RECONNECTING') {
      // Still disconnected after 30 sec - end session
      await endTelemedicineSession(sessionId);
      await updateAppointmentStatus(session.appointment_id, 
        'incomplete'
      );
      // Notify both parties
      await sendNotification(session.doctor_id, 
        'Consultation ended: connection lost');
      await sendNotification(session.patient_id, 
        'Consultation ended: doctor connection lost');
    }
  }, 30000);
  
  // If reconnected before timer: clear timer
  session.on('reconnect', () => {
    clearTimeout(reconnectTimer);
    updateSessionStatus(sessionId, 'IN_PROGRESS');
  });
}
```

---

## API Integration

### Starting a Consultation

```
CONSULTATION API

Start consultation endpoint:

POST /api/v1/telemedicine/start-consultation
Authorization: Bearer [JWT]
Content-Type: application/json

Request:
{
  "appointment_id": "apt-456",
  "doctor_id": "usr-123",
  "patient_id": "pat-789",
  "room_preferences": {
    "max_participants": 2,
    "recording_enabled": true,
    "transcription_enabled": true
  }
}

Response: 200 OK
{
  "status": "success",
  "token": "[JWT Twilio token]",
  "room_name": "apt-456",
  "participant_name": "doctor-usr-123",
  "expires_in": 3600,
  "room_config": {
    "max_bitrate": 2500000,
    "codec": "vp9",
    "recording": {
      "enabled": true,
      "format": "mp4"
    }
  }
}

Error cases:
├─ 400: Appointment not found / Invalid state
├─ 403: Not authorized (requires doctor or patient role)
├─ 409: Appointment already in progress
├─ 500: Telemedicine service unavailable

END CONSULTATION

POST /api/v1/telemedicine/end-consultation
Authorization: Bearer [JWT]
Content-Type: application/json

Request:
{
  "appointment_id": "apt-456",
  "end_reason": "normal" | "doctor_no_show" | "patient_no_show" | "connection_error"
}

Response: 200 OK
{
  "status": "success",
  "session_duration": 1847,  // seconds
  "recording_id": "RTxxxxxxx",
  "next_steps": [
    "Wait for recording processing (~5 min)",
    "Review recording transcript",
    "Upload to patient records"
  ]
}

RECORDING MANAGEMENT

Recording lifecycle:

1. Recording starts automatically when consultation begins
2. Recording stops when last participant leaves
3. Twilio processes: transcodes to MP4, generates SID
4. CareSync downloads and stores in secure storage

Retrieve recording:

GET /api/v1/telemedicine/recording/:session_id
Authorization: Bearer [JWT]

Response:
{
  "session_id": "sess-123",
  "recording": {
    "sid": "RTxxxxxxx",
    "size_mb": 125,
    "duration_sec": 1847,
    "recording_url": "[temporary signed URL, expires in 1 hour]",
    "transcript": "[AI-generated transcript, PII redacted]",
    "stored_at": "2026-04-08T14:30:00Z",
    "storage_location": "s3://medical-videos/2026/04/..."
  }
}

STATISTICS & QUALITY MONITORING

POST /api/v1/telemedicine/session-stats
Authorization: Bearer [JWT]

Request:
{
  "session_id": "sess-123"
}

Response:
{
  "session_stats": {
    "duration_sec": 1847,
    "participants": 2,
    "stats": {
      "doctor": {
        "audio": {
          "codec": "opus",
          "bitrate_kbps": "32-64",
          "packet_loss": "0.2%"
        },
        "video": {
          "codec": "vp9",
          "resolution": "640x480",
          "frame_rate": 24,
          "bitrate_kbps": "800-1500"
        },
        "network": {
          "avg_latency_ms": 45,
          "max_jitter_ms": 12
        }
      },
      "patient": {
        // Similar stats
      }
    },
    "quality_assessment": {
      "overall": "Excellent",
      "audio_quality": "Clear",
      "video_quality": "Good",
      "network_stability": "Stable"
    }
  }
}
```

---

## Security & Compliance

### HIPAA Compliance

```
HIPAA REQUIREMENTS FOR TELEMEDICINE

1. Authentication & Access Control
   ├─ Multi-factor authentication required for doctors
   ├─ Patient authentication (email link or secure question)
   ├─ Room access restricted to invited participants
   └─ No public/shareable links to live rooms

2. Encryption
   ├─ TLS 1.3 for all data in transit
   ├─ SRTP for RTP media streams (audio/video)
   ├─ AES-256 for recording storage
   ├─ Perfect forward secrecy enabled
   └─ No unencrypted data transmitted

3. Recording & Audit
   ├─ All sessions recorded unless patient opts out (documented)
   ├─ Recording storage: Encrypted, access controlled
   ├─ Recording retention: Per hospital privacy policy
   ├─ Audit log: Who accessed recording, when, IP address
   └─ Immutable: Cannot delete (regulatory requirement)

4. Data Handling
   ├─ No PII in room names (use appointment IDs, not patient names)
   ├─ No PHI in chat logs (if chat enabled)
   ├─ Recording transcripts: PII redacted automatically
   └─ Patient address/SSN: Never transmitted

5. Physician Requirements
   ├─ Uses licensed platform compliant with 21 CFR Part 11
   ├─ Maintains privacy standards per state law
   ├─ Documents informed consent (patient acknowledges recording)
   └─ Preserves medical record integrity

CONSENT DOCUMENTATION

Patient must acknowledge before consultation:

┌─────────────────────────────────┐
│ TELEMEDICINE CONSENT FORM       │
│                                 │
│ I understand this consultation  │
│ will be conducted via secure    │
│ video conference. I understand: │
│                                 │
│ ☑ Session will be recorded      │
│ ☑ Recording stored with my      │
│   medical records               │
│ ☑ Only healthcare providers     │
│   can access recording          │
│ ☑ Data is encrypted end-to-end  │
│                                 │
│ Patient signature: ___________  │
│ Date: ___________              │
│                                 │
│ [ACCEPT] [DECLINE]             │
└─────────────────────────────────┘

Record in database:

INSERT INTO telemedicine_consents (
  patient_id,
  appointment_id,
  recording_consent,
  transcript_consent,
  consented_at,
  ip_address,
  user_agent
) VALUES (
  'pat-789',
  'apt-456',
  true,   -- Patient agreed to recording
  true,   -- Patient agreed to transcript
  NOW(),
  '192.168.1.100',
  'Mozilla/5.0...'
);

SECURITY POSTURE

Regular security audits of telemedicine:

- Penetration testing (quarterly)
- Code review of video integration (before each release)
- OWASP Top 10 scanning
- Dependency vulnerability scanning (continuous)
- Twilio security certifications verified
  ├─ SOC 2 Type II ✓
  ├─ HIPAA Compliant (when configured) ✓
  └─ GDPR Compliant ✓
```

---

## Troubleshooting

### Common Issues

```
ISSUE: Video not starting - "Permission denied"

Cause: Browser camera/microphone permissions denied

Solution:
1. Patient sees: "Camera access required" prompt
2. Patient clicks: [Allow] in browser prompt
3. If blocked previously:
   └─ Open Chrome/Edge settings → Privacy → Camera/Microphone
   └─ Find hospital domain → Change to "Allow"
4. Reload consultation page
5. Retry video connection

Backend handling:
const [permission, setPermission] = useState('pending');

navigator.mediaDevices
  .getUserMedia({ audio: true, video: true })
  .then(stream => setPermission('granted'))
  .catch(error => {
    if (error.name === 'NotAllowedError') {
      setPermission('denied');
      showMessage('Please allow camera and microphone access');
    } else if (error.name === 'NotFoundError') {
      setPermission('no-device');
      showMessage('No camera or microphone found');
    }
  });

---

ISSUE: Audio/video quality degradation - "Pixelation", "Freezing"

Cause: Poor network connection or bandwidth limiting

Solution:
1. Check internet speed:
   └─ Minimum: 2 Mbps upload, 2 Mbps download
   └─ Recommended: 5 Mbps upload, 5 Mbps download

2. Network quality detection (automatic):
   └─ System monitors packet loss, jitter
   └─ If poor: Reduce video resolution/bitrate automatically
   └─ Alert: "Low bandwidth detected, video quality reduced"

3. Manual quality settings:
   ├─ High quality: 1280x720 @ 24fps (≈ 3 Mbps)
   ├─ Standard quality: 640x480 @ 24fps (≈ 1.5 Mbps)
   └─ Low quality: 320x240 @ 15fps (≈ 400 kbps)

4. Switch to audio-only:
   └─ If video not working: Use audio-only consultation
   └─ Click: [Switch to audio-only]

---

ISSUE: Participant not connecting - "Room not found"

Cause: Token expired or wrong room name

Solution:
1. Check token expiration:
   └─ Token valid for 1 hour from generation
   └─ If consultation > 1 hour: Refresh token endpoint

2. Verify room name matches:
   └─ Token room: "apt-456"
   └─ App trying to join: "apt-456" ✓
   └─ If mismatch: Different appointment

3. Check Twilio credentials:
   └─ Backend: Verify TWILIO_ACCOUNT_SID, AUTH_TOKEN
   └─ Test: $ curl https://api.twilio.com/... (auth)
   └─ If 401: Credentials invalid, update secrets vault

ISSUE: Recording not available - "No recording found"

Cause: Twilio processing delay or recording disabled

Solution:
1. Check recording enabled:
   └─ Verify: room_preferences.recording_enabled = true

2. Wait for processing:
   └─ Twilio typically processes in 5-10 minutes
   └─ For 1-hour session: Can take up to 30 minutes

3. Check Twilio composition:
   $ curl https://api.twilio.com/v1/Video/Compositions \
     -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN

4. Retrieve with retry logic:
   └─ Retry GET /recording every 30 seconds (max 10 retries)
   └─ If still not found after 5 minutes: Contact Twilio support

DEBUGGING ENDPOINTS

Enable debug logs:
$ curl -X POST http://localhost:3000/admin/debug \
  -H "Authorization: Bearer [admin-jwt]" \
  -d '{"telemedicine_logging": "verbose"}'

View real-time logs:
$ kubectl logs -f deployment/api -n prod | grep telemedicine

Check session stats:
curl http://localhost:3000/admin/telemedicine/sessions \
  -H "Authorization: Bearer [admin-jwt]" \
  | jq '.[] | select(.status == "error")'
```

---

**Related Documentation**:
- [SECURITY_CHECKLIST.md](../product/SECURITY_CHECKLIST.md) - Deployment security review
- Twilio Video API: https://www.twilio.com/video/api
- HIPAA Compliance: https://www.hipaa.gov/telemedicine

**Support Contacts**:
- Twilio Support: https://support.twilio.com
- Clinical IT: [internal contact]
- Security Team: [contact info]
