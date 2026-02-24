#!/usr/bin/env node

/**
 * Link Checker & Dependency Validator
 * Scans codebase for broken links, missing imports, and dependency issues
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const REPORT_DIR = join(ROOT_DIR, 'test-reports');

const issues = {
  broken_imports: [],
  missing_files: [],
  broken_links: [],
  unused_dependencies: [],
  missing_dependencies: [],
  circular_dependencies: []
};

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md'];
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git', 'test-results', 'playwright-report'];

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = file.substring(file.lastIndexOf('.'));
      if (EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function checkImports(filePath, content) {
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
  
  let match;
  
  // Check ES6 imports
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    validateImportPath(filePath, importPath);
  }
  
  // Check CommonJS requires
  while ((match = requireRegex.exec(content)) !== null) {
    const requirePath = match[1];
    validateImportPath(filePath, requirePath);
  }
}

function validateImportPath(sourceFile, importPath) {
  // Skip node modules and external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return;
  }

  const sourceDir = dirname(sourceFile);
  let resolvedPath = join(sourceDir, importPath);

  // Try different extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.d.ts'];
  let found = false;

  for (const ext of extensions) {
    const testPath = resolvedPath + ext;
    if (existsSync(testPath)) {
      found = true;
      break;
    }
  }

  // Check if it's a directory with index file
  if (!found && existsSync(resolvedPath)) {
    const stat = statSync(resolvedPath);
    if (stat.isDirectory()) {
      for (const ext of extensions) {
        const indexPath = join(resolvedPath, `index${ext}`);
        if (existsSync(indexPath)) {
          found = true;
          break;
        }
      }
    }
  }

  if (!found) {
    issues.broken_imports.push({
      file: relative(ROOT_DIR, sourceFile),
      import: importPath,
      resolved: relative(ROOT_DIR, resolvedPath)
    });
  }
}

function checkMarkdownLinks(filePath, content) {
  // Check markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkUrl = match[2];

    // Skip external URLs
    if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
      continue;
    }

    // Skip anchors
    if (linkUrl.startsWith('#')) {
      continue;
    }

    const sourceDir = dirname(filePath);
    const resolvedPath = join(sourceDir, linkUrl);

    if (!existsSync(resolvedPath)) {
      issues.broken_links.push({
        file: relative(ROOT_DIR, filePath),
        link: linkUrl,
        text: linkText
      });
    }
  }
}

function checkDependencies() {
  const packageJsonPath = join(ROOT_DIR, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    console.error('package.json not found!');
    return;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  // Get all source files
  const srcFiles = getAllFiles(join(ROOT_DIR, 'src'));
  const testFiles = getAllFiles(join(ROOT_DIR, 'tests'));
  const allFiles = [...srcFiles, ...testFiles];

  const usedPackages = new Set();

  // Scan for package usage
  allFiles.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const pkg = match[1].split('/')[0];
      if (pkg.startsWith('@')) {
        usedPackages.add(match[1].split('/').slice(0, 2).join('/'));
      } else {
        usedPackages.add(pkg);
      }
    }

    while ((match = requireRegex.exec(content)) !== null) {
      const pkg = match[1].split('/')[0];
      if (pkg.startsWith('@')) {
        usedPackages.add(match[1].split('/').slice(0, 2).join('/'));
      } else {
        usedPackages.add(pkg);
      }
    }
  });

  // Check for unused dependencies
  Object.keys(allDeps).forEach(dep => {
    if (!usedPackages.has(dep)) {
      // Skip common build tools and configs
      const skipList = [
        'typescript', 'vite', 'eslint', 'prettier', 'postcss',
        'tailwindcss', 'autoprefixer', '@types/', 'vitest', 'playwright'
      ];
      
      if (!skipList.some(skip => dep.includes(skip))) {
        issues.unused_dependencies.push(dep);
      }
    }
  });
}

function generateReport() {
  const timestamp = new Date().toISOString();
  const reportPath = join(REPORT_DIR, `link-check-${timestamp.replace(/[:.]/g, '-')}.json`);

  const report = {
    timestamp,
    summary: {
      broken_imports: issues.broken_imports.length,
      missing_files: issues.missing_files.length,
      broken_links: issues.broken_links.length,
      unused_dependencies: issues.unused_dependencies.length,
      total_issues: issues.broken_imports.length + issues.missing_files.length + 
                    issues.broken_links.length + issues.unused_dependencies.length
    },
    issues
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate HTML report
  const htmlPath = join(REPORT_DIR, `link-check-${timestamp.replace(/[:.]/g, '-')}.html`);
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Link & Dependency Check Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #2563eb; }
    h2 { color: #1e40af; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 36px; font-weight: bold; }
    .stat-label { font-size: 14px; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .no-issues { background: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; text-align: center; }
    .code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Link & Dependency Check Report</h1>
    
    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Broken Imports</div>
        <div class="stat-value">${report.summary.broken_imports}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Broken Links</div>
        <div class="stat-value">${report.summary.broken_links}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unused Dependencies</div>
        <div class="stat-value">${report.summary.unused_dependencies}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Issues</div>
        <div class="stat-value">${report.summary.total_issues}</div>
      </div>
    </div>

    <h2>❌ Broken Imports</h2>
    ${issues.broken_imports.length === 0 ? '<div class="no-issues">✅ No broken imports detected!</div>' : `
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Import Path</th>
            <th>Resolved Path</th>
          </tr>
        </thead>
        <tbody>
          ${issues.broken_imports.map(item => `
            <tr>
              <td><span class="code">${item.file}</span></td>
              <td><span class="code">${item.import}</span></td>
              <td><span class="code">${item.resolved}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <h2>🔗 Broken Links</h2>
    ${issues.broken_links.length === 0 ? '<div class="no-issues">✅ No broken links detected!</div>' : `
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Link Text</th>
            <th>Link URL</th>
          </tr>
        </thead>
        <tbody>
          ${issues.broken_links.map(item => `
            <tr>
              <td><span class="code">${item.file}</span></td>
              <td>${item.text}</td>
              <td><span class="code">${item.link}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <h2>📦 Unused Dependencies</h2>
    ${issues.unused_dependencies.length === 0 ? '<div class="no-issues">✅ All dependencies are in use!</div>' : `
      <table>
        <thead>
          <tr>
            <th>Package Name</th>
          </tr>
        </thead>
        <tbody>
          ${issues.unused_dependencies.map(dep => `
            <tr>
              <td><span class="code">${dep}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <p style="text-align: center; color: #6b7280; margin-top: 30px;">
      Generated: ${new Date().toLocaleString()}
    </p>
  </div>
</body>
</html>
  `;

  writeFileSync(htmlPath, html);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Reports Generated:');
  console.log(`${'='.repeat(60)}`);
  console.log(`JSON: ${reportPath}`);
  console.log(`HTML: ${htmlPath}`);
  console.log(`${'='.repeat(60)}\n`);

  return report;
}

async function main() {
  console.log('🔍 Starting Link & Dependency Check...\n');

  console.log('📁 Scanning source files...');
  const srcFiles = getAllFiles(join(ROOT_DIR, 'src'));
  console.log(`Found ${srcFiles.length} source files\n`);

  console.log('🔎 Checking imports...');
  srcFiles.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    checkImports(file, content);
  });
  console.log(`✓ Import check complete\n`);

  console.log('📝 Scanning documentation...');
  const docFiles = getAllFiles(join(ROOT_DIR, 'docs'));
  console.log(`Found ${docFiles.length} documentation files\n`);

  console.log('🔗 Checking markdown links...');
  docFiles.forEach(file => {
    if (file.endsWith('.md')) {
      const content = readFileSync(file, 'utf-8');
      checkMarkdownLinks(file, content);
    }
  });
  console.log(`✓ Link check complete\n`);

  console.log('📦 Analyzing dependencies...');
  checkDependencies();
  console.log(`✓ Dependency analysis complete\n`);

  const report = generateReport();

  console.log('📈 Summary:');
  console.log(`${'='.repeat(60)}`);
  console.log(`Broken Imports: ${report.summary.broken_imports}`);
  console.log(`Broken Links: ${report.summary.broken_links}`);
  console.log(`Unused Dependencies: ${report.summary.unused_dependencies}`);
  console.log(`Total Issues: ${report.summary.total_issues}`);
  console.log(`${'='.repeat(60)}\n`);

  if (report.summary.total_issues > 0) {
    console.warn('⚠️  Issues detected - Review required');
    process.exit(1);
  } else {
    console.log('✅ No issues detected!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
