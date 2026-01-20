export interface TranscriptionResult {
  text: string;
  confidence: number;
  entities: { type: string; value: string }[];
}

export const voiceNLPService = {
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    return {
      text: 'Patient presents with chest pain and shortness of breath',
      confidence: 0.92,
      entities: [
        { type: 'symptom', value: 'chest pain' },
        { type: 'symptom', value: 'shortness of breath' }
      ]
    };
  },

  async generateClinicalNote(transcript: string): Promise<string> {
    const sections = {
      chiefComplaint: 'Chest pain',
      hpi: 'Patient reports acute onset chest pain with radiation to left arm',
      assessment: 'Possible acute coronary syndrome',
      plan: 'EKG, cardiac enzymes, cardiology consult'
    };

    return `
Chief Complaint: ${sections.chiefComplaint}

History of Present Illness:
${sections.hpi}

Assessment:
${sections.assessment}

Plan:
${sections.plan}
    `.trim();
  },

  async extractMedicalEntities(text: string): Promise<any[]> {
    const entities = [];
    const symptoms = ['pain', 'fever', 'cough', 'nausea'];
    const medications = ['aspirin', 'metformin', 'lisinopril'];

    symptoms.forEach(symptom => {
      if (text.toLowerCase().includes(symptom)) {
        entities.push({ type: 'symptom', value: symptom });
      }
    });

    medications.forEach(med => {
      if (text.toLowerCase().includes(med)) {
        entities.push({ type: 'medication', value: med });
      }
    });

    return entities;
  },

  async processNaturalQuery(query: string): Promise<string> {
    const responses: Record<string, string> = {
      'appointment': 'Your next appointment is on Monday at 10 AM',
      'medication': 'You are currently taking Metformin 500mg twice daily',
      'results': 'Your lab results are ready. All values are within normal range'
    };

    for (const [key, response] of Object.entries(responses)) {
      if (query.toLowerCase().includes(key)) {
        return response;
      }
    }

    return 'I can help you with appointments, medications, and lab results. What would you like to know?';
  }
};
