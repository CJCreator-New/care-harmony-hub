import { NextApiRequest, NextApiResponse } from 'next';
import { clinicalAIService } from '@/services/ai/clinicalAIService';

// API Route: /api/ai/differential-diagnosis
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symptoms, patient_history, vital_signs, context } = req.body;

    if (!symptoms || !Array.isArray(symptoms)) {
      return res.status(400).json({ error: 'Symptoms array is required' });
    }

    const result = await clinicalAIService.analyzeDifferentialDiagnosis({
      symptoms,
      patientHistory: patient_history || '',
      vitalSigns: vital_signs,
      context
    });

    if (result.success) {
      res.status(200).json({
        diagnoses: result.data,
        fallback: result.fallback || false
      });
    } else {
      res.status(500).json({ error: result.error || 'Analysis failed' });
    }
  } catch (error) {
    console.error('Differential diagnosis API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}