#!/usr/bin/env node

/**
 * Security Fix Automation Script
 * Fixes XSS and Log Injection vulnerabilities
 * 
 * Usage: node security-fix.js
 */

const fs = require('fs');
const path = require('path');

// Files with XSS vulnerabilities
const xssFiles = [
  'src/components/monitoring/LoggingDashboard.tsx',
  'src/components/admin/UATDashboard.tsx',
  'src/components/ui/chart.tsx',
  'src/pages/DocumentsPage.tsx',
  'src/pages/patient/EnhancedPortalPage.tsx',
  'src/utils/reportExport.ts',
  'src/hooks/useAuditLogger.ts',
  'src/hooks/useVoiceTranscription.ts'
];

// Patterns to find and fix
const fixes = {
  xss: {
    // Find: dangerouslySetInnerHTML={{ __html: userContent }}
    // Replace: dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }}
    patterns: [
      {
        find: /dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+)\s*\}\}/g,
        replace: (match, content) => {
          if (content.includes('sanitizeHtml')) return match;
          return `dangerouslySetInnerHTML={{ __html: sanitizeHtml(${content.trim()}) }}`;
        }
      },
      {
        // Find: {userContent}
        // Replace: {sanitizeHtml(userContent)}
        find: /\{([a-zA-Z_$][a-zA-Z0-9_$]*\.(message|content|description|text|body))\}/g,
        replace: (match, content) => {
          if (content.includes('sanitizeHtml')) return match;
          return `{sanitizeHtml(${content})}`;
        }
      }
    ],
    import: "import { sanitizeHtml } from '@/utils/sanitize';"
  },
  
  logInjection: {
    // Find: console.error('Error:', error)
    // Replace: console.error('Error:', sanitizeForLog(String(error)))
    patterns: [
      {
        find: /console\.(error|log|warn|info)\(([^)]+)\)/g,
        replace: (match, level, args) => {
          // Skip if already sanitized
          if (args.includes('sanitizeForLog') || args.includes('sanitizeLogMessage')) {
            return match;
          }
          
          // Check if contains variables (not just string literals)
          if (/[a-zA-Z_$][a-zA-Z0-9_$]*/.test(args) && !args.match(/^['"`]/)) {
            // Wrap each variable in sanitizeForLog
            const sanitized = args.replace(
              /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g,
              (m) => {
                // Don't wrap string literals or numbers
                if (m.match(/^['"`\d]/)) return m;
                // Don't wrap common safe values
                if (['true', 'false', 'null', 'undefined'].includes(m)) return m;
                return `sanitizeForLog(String(${m}))`;
              }
            );
            return `console.${level}(${sanitized})`;
          }
          
          return match;
        }
      }
    ],
    import: "import { sanitizeForLog } from '@/utils/sanitize';"
  }
};

function addImportIfMissing(content, importStatement) {
  if (content.includes(importStatement)) {
    return content;
  }
  
  // Find the last import statement
  const importRegex = /^import\s+.+from\s+['"].+['"];?\s*$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
  }
  
  // If no imports found, add at the beginning
  return importStatement + '\n\n' + content;
}

function fixFile(filePath, fixType) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  const config = fixes[fixType];
  
  // Apply all patterns
  for (const pattern of config.patterns) {
    const newContent = content.replace(pattern.find, pattern.replace);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  // Add import if modifications were made
  if (modified) {
    content = addImportIfMissing(content, config.import);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
    return false;
  }
}

function scanDirectory(dir, pattern, fixType) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, dist, build
        if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
          scan(fullPath);
        }
      } else if (stat.isFile() && item.match(pattern)) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

// Main execution
console.log('🔒 Security Fix Automation Script\n');
console.log('='.repeat(50));

// Fix XSS vulnerabilities
console.log('\n📝 Fixing XSS Vulnerabilities...\n');
let xssFixed = 0;
for (const file of xssFiles) {
  if (fixFile(file, 'xss')) {
    xssFixed++;
  }
}

// Fix log injection in all TypeScript files
console.log('\n📝 Fixing Log Injection Vulnerabilities...\n');
const srcDir = path.join(process.cwd(), 'src');
const tsFiles = scanDirectory(srcDir, /\.(ts|tsx)$/, 'logInjection');

let logFixed = 0;
for (const file of tsFiles) {
  const relativePath = path.relative(process.cwd(), file);
  if (fixFile(relativePath, 'logInjection')) {
    logFixed++;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');
console.log(`✅ XSS fixes applied: ${xssFixed}/${xssFiles.length} files`);
console.log(`✅ Log injection fixes applied: ${logFixed}/${tsFiles.length} files`);
console.log(`\n🎉 Security fixes completed!`);
console.log('\n⚠️  Please review changes and run tests before committing.\n');

module.exports = { fixFile, scanDirectory };
