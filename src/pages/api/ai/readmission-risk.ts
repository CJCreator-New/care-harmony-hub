import { NextApiRequest, NextApiResponse } from 'next';
import { predictiveAnalyticsService } from '@/services/ai/predictiveAnalyticsService';

// API Route: /api/ai/readmission-risk
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patient_id, admission_data } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const result = await predictiveAnalyticsService.assessReadmissionRisk({
      patientId: patient_id,
      admissionData: admission_data
    });

    if (result.success) {
      res.status(200).json({
        risk_assessment: result.data,
        fallback: result.fallback || false
      });
    } else {
      res.status(500).json({ error: result.error || 'Risk assessment failed' });
    }
  } catch (error) {
    console.error('Readmission risk API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}