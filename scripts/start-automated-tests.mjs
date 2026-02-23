import { spawn } from 'node:child_process';

const steps = [
  {
    name: 'Role RBAC regression (40 checks)',
    command: 'npx',
    args: [
      'vitest',
      'run',
      'src/test/nurse-rbac.test.ts',
      'src/test/pharmacist-rbac.test.ts',
      'src/test/labtech-rbac.test.ts',
      'src/test/components/auth/RoleProtectedRoute.test.tsx',
    ],
  },
  {
    name: 'Role e2e workflow suite (13 checks)',
    command: 'npx',
    args: [
      'playwright',
      'test',
      'tests/e2e/admin-operations.spec.ts',
      'tests/e2e/doctor-workflow.spec.ts',
      'tests/e2e/pharmacy.spec.ts',
      'tests/e2e/laboratory.spec.ts',
      '--project=chromium',
      '--workers=1',
      '--reporter=line',
    ],
  },
];

function runStep(step) {
  return new Promise((resolve) => {
    console.log(`\n=== ${step.name} ===`);
    const child = spawn(step.command, step.args, {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

let failed = false;
for (const step of steps) {
  const code = await runStep(step);
  if (code !== 0) {
    failed = true;
    console.error(`\nFAILED: ${step.name} (exit ${code})`);
    break;
  }
}

if (failed) {
  process.exit(1);
}

console.log('\nAll automated test stages passed.');
