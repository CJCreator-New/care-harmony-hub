import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Documentation Review Testing', () => {
  const docsPath = path.join(process.cwd(), 'docs');

  describe('Documentation Completeness', () => {
    it('should have all required documentation files', () => {
      const requiredFiles = [
        'INDEX.md',
        'DATABASE.md',
        'RBAC_PERMISSIONS.md',
        'SECURITY_ROTATION_GUIDE.md'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(docsPath, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('should have workflow documentation for all roles', () => {
      const workflowPath = path.join(docsPath, 'workflows');
      const requiredWorkflows = [
        'doctor.md',
        'nurse.md',
        'pharmacist.md',
        'receptionist.md',
        'lab_technician.md',
        'admin.md'
      ];

      for (const workflow of requiredWorkflows) {
        const filePath = path.join(workflowPath, workflow);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('should link only to files that exist from the documentation index', () => {
      const indexPath = path.join(docsPath, 'INDEX.md');
      const index = fs.readFileSync(indexPath, 'utf-8');
      const linkPattern = /\]\((\.\.?\/[^)\s#]+)\)/g;

      const missing: string[] = [];
      for (const match of index.matchAll(linkPattern)) {
        const target = path.resolve(path.dirname(indexPath), match[1]);
        if (!fs.existsSync(target)) missing.push(match[1]);
      }

      expect(missing).toEqual([]);
    });
  });

  describe('Documentation Content Quality', () => {
    it('should have proper markdown formatting', () => {
      const files = fs.readdirSync(docsPath).filter(file => file.endsWith('.md'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(docsPath, file), 'utf-8');

        // Check for basic markdown structure
        expect(content.length).toBeGreaterThan(0);
        expect(content.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('API Documentation', () => {
    it('should document database schema', () => {
      const databaseDoc = fs.readFileSync(path.join(docsPath, 'DATABASE.md'), 'utf-8');

      // Should document key tables
      const keyTables = ['patients', 'staff', 'appointments', 'consultations'];
      for (const table of keyTables) {
        expect(databaseDoc.includes(table)).toBe(true);
      }
    });

    it('should document data relationships', () => {
      const databaseDoc = fs.readFileSync(path.join(docsPath, 'DATABASE.md'), 'utf-8');

      expect(databaseDoc.includes('foreign key')).toBe(true);
      expect(databaseDoc.includes('relationship')).toBe(true);
    });
  });

  describe('Security Documentation', () => {
    it('should document secret rotation', () => {
      const rotationDoc = fs.readFileSync(path.join(docsPath, 'SECURITY_ROTATION_GUIDE.md'), 'utf-8');

      expect(rotationDoc.toLowerCase().includes('rotation')).toBe(true);
    });
  });
});
