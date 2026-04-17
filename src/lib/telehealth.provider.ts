// @ts-nocheck
/**
 * Telemedicine Provider Integration
 * Supports: Zoom (primary) + Twilio (fallback)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TelehealthProvider = "zoom" | "twilio";
export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface TelehealthSession {
  id: string;
  hospital_id: string;
  appointment_id: string;
  provider: TelehealthProvider;
  provider_session_id: string;
  scheduled_start_at: string;
  actual_start_at?: string;
  actual_end_at?: string;
  status: SessionStatus;
  host_id: string;
  join_url?: string;
  recording_url?: string;
  encrypted_end_to_end: boolean;
}

/**
 * Zoom API Integration
 */
export class ZoomProvider {
  private clientId: string;
  private clientSecret: string;
  private accountId: string;

  constructor() {
    this.clientId = Deno.env.get("ZOOM_CLIENT_ID") || "";
    this.clientSecret = Deno.env.get("ZOOM_CLIENT_SECRET") || "";
    this.accountId = Deno.env.get("ZOOM_ACCOUNT_ID") || "";

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Zoom credentials not configured");
    }
  }

  /**
   * Generate JWT token for Zoom API
   */
  async getAccessToken(): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.clientId,
      exp: timestamp + 3600,
    };

    // Note: In production, use proper JWT library
    // This is a simplified example
    const response = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "account_credentials",
        account_id: this.accountId,
      }).toString(),
    });

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  /**
   * Create Zoom meeting
   */
  async createMeeting(
    topic: string,
    startTime: Date,
    durationMinutes: number,
    hostEmail: string
  ): Promise<{ meetingId: string; joinUrl: string; password: string }> {
    const accessToken = await this.getAccessToken();

    const meetingPayload = {
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime.toISOString(),
      duration: durationMinutes,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false,
        in_meeting: true,
        join_before_host: false,
        mute_upon_entry: false,
        waiting_room: true,
        approval_type: 1, // Automatic
      },
    };

    const response = await fetch(
      `https://api.zoom.us/v2/users/${hostEmail}/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingPayload),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create Zoom meeting: ${response.statusText}`);
    }

    const meeting = await response.json() as any;
    return {
      meetingId: meeting.id,
      joinUrl: meeting.join_url,
      password: meeting.password,
    };
  }

  /**
   * End Zoom meeting
   */
  async endMeeting(meetingId: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}/status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "end" }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to end Zoom meeting: ${response.statusText}`);
    }
  }
}

/**
 * Twilio WebRTC Integration (Fallback Provider)
 */
export class TwilioProvider {
  private accountSid: string;
  private authToken: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
    this.authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    this.apiKey = Deno.env.get("TWILIO_API_KEY") || "";
    this.apiSecret = Deno.env.get("TWILIO_API_SECRET") || "";

    if (!this.accountSid || !this.authToken) {
      throw new Error("Twilio credentials not configured");
    }
  }

  /**
   * Create Twilio Room for video consultation
   */
  async createRoom(uniqueName: string): Promise<{
    roomSid: string;
    roomName: string;
  }> {
    const auth = btoa(`${this.accountSid}:${this.authToken}`);

    const response = await fetch(
      `https://video.twilio.com/v1/Rooms`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          UniqueName: uniqueName,
          Type: "peer",
          RecordParticipantsOnConnect: "true",
        }).toString(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create Twilio room: ${response.statusText}`);
    }

    const room = await response.json() as any;
    return {
      roomSid: room.sid,
      roomName: room.unique_name,
    };
  }

  /**
   * Generate access token for Twilio room
   */
  generateAccessToken(
    roomName: string,
    participantName: string,
    expirationTime: number = 3600
  ): string {
    // Create JWT token for room access
    // In production, use proper JWT library
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.apiKey,
      sub: this.accountSid,
      exp: timestamp + expirationTime,
      grants: {
        video: {
          room: roomName,
        },
      },
      jti: `${this.apiKey}-${timestamp}`,
    };

    // Note: Simplified - use proper JWT signing in production
    return btoa(JSON.stringify(payload));
  }
}

/**
 * Telemedicine Manager - Provider abstraction with failover
 */
export class TelehealthManager {
  private supabase;
  private zoom: ZoomProvider;
  private twilio: TwilioProvider;
  private primaryProvider: TelehealthProvider = "zoom";

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    this.zoom = new ZoomProvider();
    this.twilio = new TwilioProvider();
  }

  /**
   * Create telehealth session
   */
  async createSession(
    appointmentId: string,
    hospitalId: string,
    hostId: string,
    scheduledStart: Date,
    durationMinutes: number = 30
  ): Promise<TelehealthSession> {
    let provider: TelehealthProvider = this.primaryProvider;
    let providerSessionId: string;
    let joinUrl: string;

    try {
      // Try primary provider (Zoom)
      if (provider === "zoom") {
        const meeting = await this.zoom.createMeeting(
          `Telehealth Consultation - Appointment ${appointmentId}`,
          scheduledStart,
          durationMinutes,
          "system@careharmony.med"
        );
        providerSessionId = meeting.meetingId;
        joinUrl = meeting.joinUrl;
      }
    } catch (error) {
      console.error("Zoom provider failed, falling back to Twilio:", error);
      provider = "twilio";

      try {
        // Fallback to Twilio
        const room = await this.twilio.createRoom(
          `appt-${appointmentId}`
        );
        providerSessionId = room.roomSid;
        joinUrl = `https://video.twilio.com/rooms/${room.roomName}`;
      } catch (twilio_error) {
        throw new Error(
          `Both Zoom and Twilio failed: Zoom: ${error}, Twilio: ${twilio_error}`
        );
      }
    }

    // Create session record
    const { data: session, error: sessionError } = await this.supabase
      .from("telehealth_sessions")
      .insert([
        {
          hospital_id: hospitalId,
          appointment_id: appointmentId,
          provider,
          provider_session_id: providerSessionId,
          scheduled_start_at: scheduledStart.toISOString(),
          host_id: hostId,
          status: "scheduled",
          encrypted_end_to_end: true,
        },
      ])
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Log audit event
    await this.supabase.from("audit_logs").insert([
      {
        user_id: hostId,
        action: "TELEHEALTH_SESSION_CREATED",
        table_name: "telehealth_sessions",
        record_id: session.id,
        description: `Telehealth session created via ${provider} for appointment ${appointmentId}`,
        created_at: new Date().toISOString(),
      },
    ]);

    return session;
  }

  /**
   * End telehealth session
   */
  async endSession(sessionId: string): Promise<void> {
    const { data: session } = await this.supabase
      .from("telehealth_sessions")
      .select("provider, provider_session_id, appointment_id, host_id")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    try {
      if (session.provider === "zoom") {
        await this.zoom.endMeeting(session.provider_session_id);
      }
      // Twilio rooms auto-expire
    } catch (error) {
      console.error("Error ending session:", error);
    }

    // Update session status
    await this.supabase
      .from("telehealth_sessions")
      .update({
        status: "completed",
        actual_end_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Log audit
    await this.supabase.from("audit_logs").insert([
      {
        user_id: session.host_id,
        action: "TELEHEALTH_SESSION_ENDED",
        table_name: "telehealth_sessions",
        record_id: sessionId,
        created_at: new Date().toISOString(),
      },
    ]);
  }
}

export default TelehealthManager;
