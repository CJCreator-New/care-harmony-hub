import { NextApiRequest, NextApiResponse } from 'next';
import { clinicalAIService } from '@/services/ai/clinicalAIService';

// API Route: /api/ai/drug-interactions
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { medications, patient_profile, context } = req.body;

    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({ error: 'Medications array is required' });
    }

    const result = await clinicalAIService.analyzeDrugInteractions({
      medications,
      patientProfile: patient_profile,
      context
    });

    if (result.success) {
      res.status(200).json({
        interactions: result.data,
        fallback: result.fallback || false
      });
    } else {
      res.status(500).json({ error: result.error || 'Analysis failed' });
    }
  } catch (error) {
    console.error('Drug interactions API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}