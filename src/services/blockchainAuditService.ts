import { supabase } from '@/integrations/supabase/client';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  hash: string;
  previousHash: string;
}

export const blockchainAuditService = {
  async createAuditEntry(entry: Omit<AuditEntry, 'id' | 'hash' | 'previousHash'>): Promise<string> {
    const previousEntry = await this.getLatestEntry();
    const hash = await this.generateHash(entry, previousEntry?.hash || '0');

    const { data, error } = await supabase
      .from('audit_trail')
      .insert({
        ...entry,
        hash,
        previous_hash: previousEntry?.hash || '0'
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  },

  async generateHash(data: any, previousHash: string): Promise<string> {
    const content = JSON.stringify(data) + previousHash;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async getLatestEntry(): Promise<AuditEntry | null> {
    const { data } = await supabase
      .from('audit_trail')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return data;
  },

  async verifyIntegrity(entryId: string): Promise<boolean> {
    const { data: entry } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('id', entryId)
      .single();

    if (!entry) return false;

    const recalculatedHash = await this.generateHash(
      { userId: entry.user_id, action: entry.action, resourceType: entry.resource_type },
      entry.previous_hash
    );

    return recalculatedHash === entry.hash;
  },

  async getAuditTrail(resourceId: string): Promise<AuditEntry[]> {
    const { data } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false });

    return data || [];
  }
};
