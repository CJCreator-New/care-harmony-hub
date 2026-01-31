import { NextApiRequest, NextApiResponse } from 'next';
import { predictiveAnalyticsService } from '@/services/ai/predictiveAnalyticsService';

// API Route: /api/ai/predict-outcomes
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patient_id, clinical_data, time_frame } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const result = await predictiveAnalyticsService.predictPatientOutcomes({
      patientId: patient_id,
      clinicalData: clinical_data,
      timeFrame: time_frame
    });

    if (result.success) {
      res.status(200).json({
        prediction: result.data,
        fallback: result.fallback || false
      });
    } else {
      res.status(500).json({ error: result.error || 'Prediction failed' });
    }
  } catch (error) {
    console.error('Outcome prediction API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}