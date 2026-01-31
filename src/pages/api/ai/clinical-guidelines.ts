import { NextApiRequest, NextApiResponse } from 'next';
import { clinicalAIService } from '@/services/ai/clinicalAIService';

// API Route: /api/ai/treatment-guidelines
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { condition, patient_profile, context } = req.body;

    if (!condition) {
      return res.status(400).json({ error: 'Condition is required' });
    }

    const result = await clinicalAIService.getTreatmentGuidelines({
      condition,
      patientProfile: patient_profile,
      context
    });

    if (result.success) {
      res.status(200).json({
        guidelines: result.data,
        fallback: result.fallback || false
      });
    } else {
      res.status(500).json({ error: result.error || 'Analysis failed' });
    }
  } catch (error) {
    console.error('Treatment guidelines API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}