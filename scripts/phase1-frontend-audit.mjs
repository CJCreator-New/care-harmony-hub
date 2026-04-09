#!/usr/bin/env node
/**
 * Phase 1 Frontend Code Audit Tool
 * Scans components against FRONTEND_DEVELOPMENT.md standards
 * 
 * Usage: node scripts/phase1-frontend-audit.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Audit Rules mapped to FRONTEND_DEVELOPMENT.md
const AUDIT_RULES = {
  COMPONENT_STRUCTURE: {
    name: 'Component Structure (Presentational/Container)',
    description: 'Components should follow presentational/container pattern',
    check: (content) => {
      const presentationalPatterns = [
        'React.FC',
        'interface Props',
        'const.*=.*(\\{.*\\})',
      ];
      const containerPatterns = [
        'useContext',
        'useQuery|useMutation|useAuth',
        'Outlet|Route',
      ];
      return {
        hasProperTyping: /interface Props|type Props/.test(content),
        score: /interface Props|type Props/.test(content) ? 4 : 2,
      };
    },
  },
  
  HOOKS_USAGE: {
    name: 'Custom Hooks Implementation',
    description: 'Reusable logic extracted to hooks (useAsync, useLocalStorage, etc.)',
    check: (content) => {
      const customHooks = [
        'useAsync',
        'useLocalStorage',
        'usePrevious',
        'useDebounce',
        'usePatient',
        'usePrescriptions',
        'useHIPAACompliance',
        'usePermissions',
      ];
      const foundHooks = customHooks.filter((h) =>
        new RegExp(`\\b${h}\\b`).test(content)
      );
      return {
        usesCustomHooks: foundHooks.length > 0,
        hooksFound: foundHooks,
        score: foundHooks.length > 0 ? 4 : 2,
      };
    },
  },
  
  REACT_HOOK_FORM: {
    name: 'Form Validation (React Hook Form + Zod)',
    description: 'All forms should use React Hook Form with Zod schemas',
    check: (content) => {
      const hasRHF = /useForm|useFieldArray|FormProvider/.test(content);
      const hasZod = /z\\.string|z\\.object|z\\.number|ZodError|parseAsync/.test(
        content
      );
      const score = hasRHF && hasZod ? 5 : hasRHF ? 3 : 1;
      return {
        hasReactHookForm: hasRHF,
        hasZod: hasZod,
        score,
      };
    },
  },
  
  TYPESCRIPT_STRICT: {
    name: 'TypeScript Strict Mode',
    description: 'No `any` types or implicit `any` usage',
    check: (content) => {
      const anyCount = (content.match(/:\\s*any\\b|as\\s+any\\b/g) || [])
        .length;
      const score = anyCount === 0 ? 5 : anyCount < 3 ? 3 : 1;
      return {
        anyTypeCount: anyCount,
        hasImplicitAny: /:\\s*any|as\\s+any/.test(content),
        score,
      };
    },
  },
  
  ERROR_HANDLING: {
    name: 'Error Handling & PHI Safety',
    description: 'Error boundaries, Sonner toasts, no PHI in logs',
    check: (content) => {
      const hasErrorBoundary = /ErrorBoundary|error\.tsx/.test(content);
      const hasSonnerToast = /useSonner|toast\(/i.test(content);
      const hasConsoleLog = /console\.error|console\.log/.test(content);
      
      // Check for potential PHI patterns in logs
      const hasLoggedPHI = /console\.(log|error|warn).*\b(patient|medical|ssn|dob|phone)\b/i.test(
        content
      );
      
      const score =
        hasErrorBoundary && hasSonnerToast && !hasLoggedPHI ? 5 : 3;
      return {
        hasErrorBoundary,
        hasSonnerToast,
        hasConsoleLog,
        potentialPHILeak: hasLoggedPHI,
        score,
      };
    },
  },
  
  STATE_MANAGEMENT: {
    name: 'State Management Hierarchy',
    description: 'Global Context > Server State (TanStack) > Local State',
    check: (content) => {
      const hasContext = /useContext|useAuth|useHospital/.test(content);
      const hasTanstack = /useQuery|useMutation|useQueryClient/.test(content);
      const hasLocalState = /useState/.test(content);
      
      // Check for excessive useState (should use TanStack Query for server state)
      const localStateCount = (
        content.match(/useState\\(/g) || []
      ).length;
      
      const score =
        localStateCount < 3 && (hasContext || hasTanstack) ? 4 : 2;
      return {
        hasContext,
        hasTanstack,
        hasLocalState,
        localStateCount,
        score,
      };
    },
  },
};

async function getFilesInDir(dir, ext = '.tsx') {
  try {
    const files = await fs.readdir(dir, { recursive: true });
    return files
      .filter((f) => f.endsWith(ext))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

async function auditFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const results = {};
    
    for (const [key, rule] of Object.entries(AUDIT_RULES)) {
      const checkResult = rule.check(content);
      results[key] = {
        name: rule.name,
        ...checkResult,
      };
    }
    
    const totalScore = Object.values(results).reduce((sum, r) => sum + r.score, 0);
    const maxScore = Object.keys(results).length * 5;
    const scorePercentage = Math.round((totalScore / maxScore) * 100);
    
    return {
      file: filePath,
      results,
      totalScore,
      maxScore,
      scorePercentage,
      passed: scorePercentage >= 80,
    };
  } catch (error) {
    console.error(`Error auditing ${filePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Phase 1 Frontend Code Audit Tool\\n');
  
  const srcDir = path.join(__dirname, '../src');
  const componentsDir = path.join(srcDir, 'components');
  
  console.log(`Scanning: ${componentsDir}\\n`);
  
  const files = await getFilesInDir(componentsDir, '.tsx');
  
  if (files.length === 0) {
    console.log('❌ No .tsx files found');
    process.exit(1);
  }
  
  console.log(`📋 Files to audit: ${files.length}\\n`);
  
  const results = [];
  for (const file of files) {
    const result = await auditFile(file);
    if (result) {
      results.push(result);
    }
  }
  
  // Summary Report
  console.log('\\n' + '='.repeat(80));
  console.log('AUDIT SUMMARY\\n');
  
  const passedCount = results.filter((r) => r.passed).length;
  const avgScore = Math.round(
    results.reduce((sum, r) => sum + r.scorePercentage, 0) / results.length
  );
  
  console.log(`Total Files: ${results.length}`);
  console.log(`Passed: ${passedCount}/${results.length}`);
  console.log(`Average Score: ${avgScore}%\\n`);
  
  console.log('By Category:\\n');
  
  // Aggregate scores by rule
  const ruleScores = {};
  for (const rule of Object.keys(AUDIT_RULES)) {
    const scores = results
      .flatMap((r) => r.results[rule]?.score || 0)
      .filter((s) => typeof s === 'number');
    const avgRuleScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
        : 0;
    ruleScores[rule] = avgRuleScore;
    
    const checkmark = avgRuleScore >= 80 ? '✅' : avgRuleScore >= 60 ? '⚠️' : '❌';
    console.log(
      `${checkmark} ${AUDIT_RULES[rule].name}: ${avgRuleScore}% (avg: ${avgRuleScore}/5)`
    );
  }
  
  console.log('\\n' + '='.repeat(80));
  console.log('\\nFAILED AUDITS (< 80%):');
  
  const failedFiles = results.filter((r) => !r.passed);
  if (failedFiles.length > 0) {
    for (const file of failedFiles) {
      console.log(`\\n📄 ${file.file}`);
      console.log(`   Score: ${file.scorePercentage}% (${file.totalScore}/${file.maxScore})`);
      
      for (const [key, result] of Object.entries(file.results)) {
        if (result.score < 4) {
          console.log(`   ⚠️ ${result.name}: ${result.score}/5`);
        }
      }
    }
  } else {
    console.log('✅ All files passed audit!');
  }
  
  console.log('\\n' + '='.repeat(80));
}

main().catch(console.error);
