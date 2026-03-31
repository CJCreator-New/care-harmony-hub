import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/pages/consultations/ConsultationWorkflowPage.tsx');
let code = fs.readFileSync(filePath, 'utf8');

const targetStr =         // Store summary separately, don't append to clinical notes
        await updateConsultation.mutateAsync({
          id,
          status: "completed",
          completed_at: new Date().toISOString(),
          pharmacy_notified: formData.prescriptions?.length > 0 ? true : formData.pharmacy_notified,
          lab_notified: formData.lab_orders?.length > 0 ? true : formData.lab_notified,
        });;

const replacementStr = targetStr + 

        // Also update the queue to completed so metrics start to work!
        try {
          if (consultation.patient_id) {
            await supabase
              .from('patient_queue')
              .update({ status: 'completed', service_end_time: new Date().toISOString() })
              .eq('patient_id', consultation.patient_id)
              .in('status', ['in_service', 'called', 'waiting']);
          }
        } catch (queueErr) {
          console.error("Failed to complete queue entry:", queueErr);
        };

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, code);
  console.log("Successfully injected patient_queue completion update into ConsultationWorkflowPage.tsx");
} else {
  console.log("Target string not found in ConsultationWorkflowPage.tsx");
}
