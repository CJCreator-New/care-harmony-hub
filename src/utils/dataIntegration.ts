export const dataIntegration = {
  mergeRecords(records: any[]) {
    return records.reduce((acc, record) => ({ ...acc, ...record }), {});
  },

  deduplicateData(data: any[], key: string) {
    return Array.from(new Map(data.map(item => [item[key], item])).values());
  },

  validateIntegrity(data: any) {
    return Object.values(data).every(value => value !== null && value !== undefined);
  }
};
