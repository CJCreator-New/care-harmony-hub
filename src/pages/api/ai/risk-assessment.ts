import { NextApiRequest, NextApiResponse } from 'next';
import { clinicalAIService } from '@/services/ai/clinicalAIService';

// API Route: /api/ai/risk-assessment
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patient_data, assessment_types, context } = req.body;

    if (!patient_data) {
      return res.status(400).json({ error: 'Patient data is required' });
    }

    const result = await clinicalAIService.assessPatientRisks({
      patientData: patient_data,
      assessmentTypes: assessment_types || ['general'],
      context
    });

    if (result.success) {
      res.status(200).json({
        assessments: result.data,
        fallback: result.fallback || false
      });
    } else {
      res.status(500).json({ error: result.error || 'Analysis failed' });
    }
  } catch (error) {
    console.error('Risk assessment API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}