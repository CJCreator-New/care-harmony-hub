#!/usr/bin/env node
/**
 * Phase 1 Backend Code Audit Tool
 * Scans routes, controllers, services, repositories against BACKEND_DEVELOPMENT.md standards
 * 
 * Usage: node scripts/phase1-backend-audit.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend Audit Rules mapped to BACKEND_DEVELOPMENT.md
const BACKEND_RULES = {
  ROUTE_PATTERN: {
    name: 'Route Layer (Thin Handlers → Controllers)',
    description: 'Routes should delegate to controllers, not contain business logic',
    check: (content) => {
      const isRouteFile = /router\\.|\\.routes\\.|Router|app\\.(get|post|put|delete)/.test(
        content
      );
      if (!isRouteFile) return { score: 0, skipped: true };
      
      // Route files should be thin (< 100 lines) and delegate to controller
      const usesController = /controller\\.|Controller|services\\./i.test(content);
      const hasBusinessLogic = /if\\(|database\\.|query\\(|filter\\(|find\\(/i.test(
        content
      );
      
      const score = usesController && !hasBusinessLogic ? 5 : usesController ? 3 : 1;
      return { usesController, hasBusinessLogic, score };
    },
  },
  
  CONTROLLER_PATTERN: {
    name: 'Controller Layer (HTTP-Focused)',
    description: 'Controllers parse requests and delegate to services',
    check: (content) => {
      const isControllerFile = /controller|Controller|\\.controller\\./.test(content);
      if (!isControllerFile) return { score: 0, skipped: true };
      
      // Controllers should use services, not access DB directly
      const usesServices = /services\\.|Service|\\.(handle|process|create|update|delete)/.test(
        content
      );
      const hasStatusCodes = /res\\.status|res\\.json|res\\.send|throw new/.test(
        content
      );
      const directDBAccess = /db\\.|query\\(|\.select\\(|supabase\\.from/.test(content);
      
      const score =
        usesServices && hasStatusCodes && !directDBAccess ? 5 : usesServices ? 3 : 1;
      return { usesServices, hasStatusCodes, directDBAccess, score };
    },
  },
  
  SERVICE_LAYER: {
    name: 'Service Layer (Business Logic Isolated)',
    description: 'Services contain business logic and are independently testable',
    check: (content) => {
      const isServiceFile = /service|Service|\\.(service|business)\\./.test(content);
      if (!isServiceFile) return { score: 0, skipped: true };
      
      // Services should use repositories, not direct DB access
      const usesRepositories = /repository|Repository|\\.(find|create|update)\\(/.test(
        content
      );
      const hasBusinessLogic = /if\\(|validate\\(|calculate\\(|check\\(/i.test(content);
      const directDBAccess = /\\.select\\(|\\.insert\\(|\\.update\\(|supabase\\.from/.test(
        content
      );
      
      const score =
        hasBusinessLogic && usesRepositories && !directDBAccess ? 5 : 3;
      return { usesRepositories, hasBusinessLogic, directDBAccess, score };
    },
  },
  
  REPOSITORY_PATTERN: {
    name: 'Repository Pattern (Data Access)',
    description: 'Repositories use parameterized queries, no raw SQL',
    check: (content) => {
      const isRepoFile = /repository|Repository|\\.(repository|repo)\\./.test(content);
      if (!isRepoFile) return { score: 0, skipped: true };
      
      // Repositories should use parameterized queries and BaseRepository
      const extendsBaseRepository = /extends BaseRepository/.test(content);
      const usesParameterizedQueries = /\\.eq\\(|filter\\(|where\\(/i.test(content);
      const hasRawSQL = /raw\\(|query\\(|\\`SELECT|\\`INSERT|\\`UPDATE|\\`DELETE|sql\\`/.test(
        content
      );
      
      const score =
        extendsBaseRepository && usesParameterizedQueries && !hasRawSQL ? 5 : 3;
      return {
        extendsBaseRepository,
        usesParameterizedQueries,
        hasRawSQL,
        score,
      };
    },
  },
  
  HOSPITAL_SCOPING: {
    name: 'Hospital Scoping (Data Isolation)',
    description: 'All queries include hospital_id filter for multi-tenancy',
    check: (content) => {
      const usesHospitalId = /hospital_id|hospitalId|req\\.user\\.hospital_id/i.test(
        content
      );
      const filtersHospitalId = /where.*hospital_id|eq.*hospital_id|\\.filter\\(|hospital_id\\s*([=:]|filter)/.test(
        content
      );
      
      const score = usesHospitalId && filtersHospitalId ? 5 : usesHospitalId ? 3 : 1;
      return { usesHospitalId, filtersHospitalId, score };
    },
  },
  
  AUTHENTICATION: {
    name: 'Authentication & Authorization',
    description: 'All routes protected with requireAuth and role checks',
    check: (content) => {
      const hasAuth = /requireAuth|authorize|\\[auth\\]|middleware.*auth/i.test(
        content
      );
      const hasRoleCheck = /role|permission|RequireRole|@Role|checkPermission/i.test(
        content
      );
      const validate2FA = /verify2FA|two.*factor|totp|backup.*code/i.test(content);
      
      const score =
        hasAuth && hasRoleCheck ? 5 : hasAuth ? 3 : 1;
      return { hasAuth, hasRoleCheck, validate2FA, score };
    },
  },
  
  ERROR_HANDLING: {
    name: 'Error Handling (No Stack Trace Leaks)',
    description: 'Custom error classes, no PHI in error messages',
    check: (content) => {
      // Check for custom error class usage
      const usesCustomErrors = /ValidationError|AuthenticationError|NotFoundError|throw new/.test(
        content
      );
      
      // Check for error message safety (no direct error.message to client)
      const leaksErrorMessage = /error\\.message|res\\.status.*error\\.message|throw error/i.test(
        content
      );
      
      // Check for PHI in error logging
      const hasPotentialPHILeak = /console\\.error.*\\b(patient|medical|ssn|dob)\\b/i.test(
        content
      );
      
      const score =
        usesCustomErrors && !leaksErrorMessage && !hasPotentialPHILeak ? 5 : 3;
      return {
        usesCustomErrors,
        leaksErrorMessage,
        hasPotentialPHILeak,
        score,
      };
    },
  },
  
  TYPESCRIPT_STRICT: {
    name: 'TypeScript Strictness',
    description: 'No `any` types, proper typing for functions',
    check: (content) => {
      const anyCount = (content.match(/:\\s*any\\b|as\\s+any\\b/g) || [])
        .length;
      const hasProperTyping = /interface|type|:\\s*[A-Z]|=>.*\\{/.test(content);
      
      const score = anyCount === 0 && hasProperTyping ? 5 : anyCount < 2 ? 3 : 1;
      return { anyCount, hasProperTyping, score };
    },
  },
};

async function getFilesInDir(dir, ext = '.ts') {
  try {
    const files = await fs.readdir(dir, { recursive: true });
    return files
      .filter(
        (f) =>
          f.endsWith(ext) &&
          !f.includes('node_modules') &&
          !f.includes('dist') &&
          !f.includes('.test.') &&
          !f.includes('.spec.')
      )
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

async function auditFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const results = {};
    
    for (const [key, rule] of Object.entries(BACKEND_RULES)) {
      const checkResult = rule.check(content);
      if (!checkResult.skipped) {
        results[key] = {
          name: rule.name,
          ...checkResult,
        };
      }
    }
    
    const validResults = Object.values(results).filter((r) => r.score !== undefined);
    if (validResults.length === 0) return null; // File doesn't match any rule
    
    const totalScore = validResults.reduce((sum, r) => sum + r.score, 0);
    const maxScore = validResults.length * 5;
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
  console.log('🔍 Phase 1 Backend Code Audit Tool\\n');
  
  const srcDir = path.join(__dirname, '../src');
  const servicesDir = path.join(srcDir, 'services');
  
  console.log(`Scanning: ${servicesDir}\\n`);
  
  const files = await getFilesInDir(servicesDir, '.ts');
  
  if (files.length === 0) {
    console.log('❌ No .ts files found in services/');
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
  
  if (results.length === 0) {
    console.log('⚠️ No files matched backend audit patterns');
    process.exit(0);
  }
  
  // Summary Report
  console.log('\\n' + '='.repeat(80));
  console.log('BACKEND AUDIT SUMMARY\\n');
  
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
  for (const rule of Object.keys(BACKEND_RULES)) {
    const scores = results
      .flatMap((r) => r.results[rule]?.score || 0)
      .filter((s) => typeof s === 'number');
    const avgRuleScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
        : 0;
    ruleScores[rule] = avgRuleScore;
    
    if (avgRuleScore > 0) {
      const checkmark = avgRuleScore >= 80 ? '✅' : avgRuleScore >= 60 ? '⚠️' : '❌';
      console.log(`${checkmark} ${BACKEND_RULES[rule].name}: ${avgRuleScore}%`);
    }
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
