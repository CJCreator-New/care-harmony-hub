/**
 * Form-state rules for the consultation workflow (audit CLIN-06).
 *
 * The workflow page copies the server record into its local form. Autosave
 * refetches the record after every save, so copying on every change reset
 * the step, the selected ICD-10 codes and whatever the doctor was typing.
 */

/**
 * True when the local form should be (re)built from the server record.
 * Only the first load of a consultation, or opening another consultation, qualifies.
 */
export function shouldHydrateConsultationForm(
  hydratedConsultationId: string | null,
  consultationId: string | null | undefined
): boolean {
  if (!consultationId) return false;
  return consultationId !== hydratedConsultationId;
}
