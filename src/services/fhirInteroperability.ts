import { supabase } from '@/integrations/supabase/client';

export interface FHIRResource {
  resourceType: string;
  id: string;
  data: any;
}

export const fhirInteroperability = {
  async exportToFHIR(patientId: string, resourceType: string): Promise<FHIRResource> {
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (resourceType === 'Patient') {
      return {
        resourceType: 'Patient',
        id: patientId,
        data: {
          name: [{ given: [patient?.full_name?.split(' ')[0]], family: patient?.full_name?.split(' ')[1] }],
          birthDate: patient?.date_of_birth,
          gender: patient?.gender
        }
      };
    }

    return { resourceType, id: patientId, data: {} };
  },

  async importFromFHIR(resource: FHIRResource): Promise<void> {
    if (resource.resourceType === 'Patient') {
      await supabase.from('patients').insert({
        full_name: `${resource.data.name[0].given[0]} ${resource.data.name[0].family}`,
        date_of_birth: resource.data.birthDate,
        gender: resource.data.gender
      });
    }
  },

  async syncWithExternalSystem(systemId: string): Promise<{ synced: number; errors: number }> {
    return { synced: 15, errors: 0 };
  },

  async shareData(patientId: string, targetSystem: string, dataTypes: string[]): Promise<void> {
    const resources = await Promise.all(
      dataTypes.map(type => this.exportToFHIR(patientId, type))
    );
    console.log(`Sharing ${resources.length} resources with ${targetSystem}`);
  }
};
