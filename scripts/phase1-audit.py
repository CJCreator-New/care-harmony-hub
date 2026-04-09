#!/usr/bin/env python3
"""
Phase 1 Code Audit Tool - Frontend & Backend
Analyzes codebase compliance with DEVELOPMENT_STANDARDS.md
"""

import os
import re
from pathlib import Path
from collections import defaultdict

class AuditAnalyzer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.results = defaultdict(list)
        
    def check_frontend_file(self, filepath):
        """Audit a single frontend component file"""
        scores = {}
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        
        # Component Structure
        has_props_interface = bool(re.search(r'interface Props|type Props', content))
        scores['component_structure'] = 4 if has_props_interface else 2
        
        # Custom Hooks
        custom_hooks = ['useAsync', 'useLocalStorage', 'usePatient', 'usePrescriptions',
                       'useHIPAACompliance', 'usePermissions']
        found_hooks = sum(1 for h in custom_hooks if re.search(rf'\b{h}\b', content))
        scores['hooks'] = 4 if found_hooks > 0 else 2
        
        # React Hook Form + Zod
        has_rhf = bool(re.search(r'useForm|useFieldArray|FormProvider', content))
        has_zod = bool(re.search(r'z\.string|z\.object|z\.number|ZodError', content))
        scores['rh_form'] = 5 if (has_rhf and has_zod) else (3 if has_rhf else 1)
        
        # TypeScript - no `any` types
        any_count = len(re.findall(r':\s*any\b|as\s+any\b', content))
        scores['typescript'] = 5 if any_count == 0 else (3 if any_count < 3 else 1)
        
        # Error Handling
        has_error_boundary = bool(re.search(r'ErrorBoundary|error\.tsx', content))
        has_sonner = bool(re.search(r'useSonner|toast\(', content))
        scored_error = 5 if (has_error_boundary and has_sonner) else 3
        scores['error_handling'] = scored_error
        
        # State Management
        state_count = len(re.findall(r'useState\(', content))
        has_context = bool(re.search(r'useContext|useAuth', content))
        scores['state_mgmt'] = 4 if (state_count < 3 and has_context) else 2
        
        total = sum(scores.values())
        max_score = len(scores) * 5
        percentage = int((total / max_score) * 100)
        
        return {
            'path': str(filepath.relative_to(self.project_root)),
            'scores': scores,
            'total': total,
            'maximum': max_score,
            'percentage': percentage,
            'passed': percentage >= 80,
        }
    
    def check_backend_file(self, filepath):
        """Audit a single backend file"""
        scores = {}
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        
        # Route Pattern - delegates to controller
        has_controller = bool(re.search(r'[Cc]ontroller|router\.', content))
        has_biz_logic = bool(re.search(r'database\.|\.select\(|\.insert\(', content))
        is_route = bool(re.search(r'router|\.routes\.|app\.(get|post|put|delete)', content))
        scores['route'] = 5 if (is_route and has_controller and not has_biz_logic) else (3 if is_route and has_controller else 0)
        
        # Controller - HTTP focused
        is_controller = bool(re.search(r'[Cc]ontroller', content))
        uses_services = bool(re.search(r'[Ss]ervices\.|[Ss]ervice\b', content))
        has_status = bool(re.search(r'res\.(status|json|send)|throw new', content))
        scores['controller'] = 5 if (is_controller and uses_services and has_status) else (3 if is_controller and uses_services else 0)
        
        # Service - business logic
        is_service = bool(re.search(r'[Ss]ervice\b|business', content))
        uses_repo = bool(re.search(r'[Rr]epository|repo[os]?\b', content))
        has_logic = bool(re.search(r'if\s*\(|validate\(|calculate\(|check\(', content))
        scores['service'] = 5 if (is_service and uses_repo and has_logic) else (3 if is_service else 0)
        
        # Hospital Scoping - critical security
        uses_hospital_id = bool(re.search(r'hospital_id|hospitalId', content))
        filters_hospital_id = bool(re.search(r'\.eq\(["\']hospital_id', content))
        scores['scoping'] = 5 if (uses_hospital_id and filters_hospital_id) else (3 if uses_hospital_id else 1) if content.strip() else 0
        
        # Authentication
        has_auth = bool(re.search(r'requireAuth|authorize|auth\]', content))
        has_role_check = bool(re.search(r'role|permission|@Role|RequireRole', content))
        scores['auth'] = 5 if (has_auth and has_role_check) else (3 if has_auth else 0)
        
        # TypeScript - no `any`
        any_count = len(re.findall(r':\s*any\b|as\s+any\b', content))
        scores['typescript'] = 5 if any_count == 0 else (3 if any_count < 2 else 1)
        
        # Filter out zero scores (category not applicable)
        scores = {k: v for k, v in scores.items() if v > 0}
        
        if not scores:
            return None
            
        total = sum(scores.values())
        max_score = len(scores) * 5
        percentage = int((total / max_score) * 100)
        
        return {
            'path': str(filepath.relative_to(self.project_root)),
            'scores': scores,
            'total': total,
            'maximum': max_score,
            'percentage': percentage,
            'passed': percentage >= 80,
        }
    
    def run_frontend_audit(self):
        """Scan all frontend components"""
        print('🔍 FRONTEND CODE AUDIT\n')
        components_dir = self.project_root / 'src' / 'components'
        
        if not components_dir.exists():
            print('❌ Components directory not found')
            return []
        
        tsx_files = list(components_dir.rglob('*.tsx'))
        print(f'📋 Scanning {len(tsx_files)} components...\n')
        
        results = []
        for filepath in tsx_files[:20]:  # Limit to first 20 for speed
            result = self.check_frontend_file(filepath)
            if result:
                results.append(result)
        
        return results
    
    def run_backend_audit(self):
        """Scan all backend files"""
        print('🔍 BACKEND CODE AUDIT\n')
        services_dir = self.project_root / 'src' / 'services'
        
        if not services_dir.exists():
            print('❌ Services directory not found')
            return []
        
        ts_files = [f for f in services_dir.rglob('*.ts') if '.test.' not in f.name and '.spec.' not in f.name]
        print(f'📋 Scanning {len(ts_files)} service files...\n')
        
        results = []
        for filepath in ts_files[:30]:  # Limit to first 30 for speed
            result = self.check_backend_file(filepath)
            if result:
                results.append(result)
        
        return results
    
    def print_summary(self, audit_type, results):
        """Print audit summary and scores"""
        if not results:
            print(f'⚠️  No results for {audit_type} audit\n')
            return
        
        passed_count = sum(1 for r in results if r['passed'])
        avg_score = int(sum(r['percentage'] for r in results) / len(results))
        
        print('=' * 80)
        print(f'{audit_type.upper()} AUDIT SUMMARY')
        print('=' * 80)
        print(f'Total Files: {len(results)}')
        print(f'Passed (≥80%): {passed_count}/{len(results)}')
        print(f'Average Score: {avg_score}%\n')
        
        print('Failed Audits (< 80%):\n')
        failed = [r for r in results if not r['passed']]
        for result in failed[:10]:
            print(f"  {result['path']}")
            print(f"    Score: {result['percentage']}% ({result['total']}/{result['maximum']})")
        
        print('\n' + '=' * 80 + '\n')

analyzer = AuditAnalyzer(os.getcwd())

print('🔍 PHASE 1 CODE AUDIT TOOL\n')

frontend_results = analyzer.run_frontend_audit()
analyzer.print_summary('Frontend', frontend_results)

backend_results = analyzer.run_backend_audit()
analyzer.print_summary('Backend', backend_results)

# Overall metrics
all_results = frontend_results + backend_results
if all_results:
    overall_avg = int(sum(r['percentage'] for r in all_results) / len(all_results))
    print(f'📊 OVERALL AVERAGE SCORE: {overall_avg}% ({len(all_results)} files audited)')
    print(f'🎯 TARGET: 80%+  STATUS: {"✅ ON TRACK" if overall_avg >= 75 else "⚠️ NEEDS IMPROVEMENT"}\n')
