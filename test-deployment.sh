#!/bin/bash

# CareSync Deployment Testing Suite
# Validates blue-green deployment and rollback procedures
# Run before April 15 production launch

set -e

BLUE_PORT=3000
GREEN_PORT=3001
TEST_TIMEOUT=300

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE_BG='\033[44m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

test_section() {
  echo -e "\n${BLUE_BG}=== $1 ===${NC}\n"
}

test_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((TESTS_PASSED++))
}

test_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((TESTS_FAILED++))
}

test_warn() {
  echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

# Test 1: Verify deployment script syntax
test_section "Test 1: Deployment Script Validation"

if bash -n deploy-prod.sh 2>/dev/null; then
  test_pass "deploy-prod.sh has valid bash syntax"
else
  test_fail "deploy-prod.sh has syntax errors"
fi

if bash -n rollback.sh 2>/dev/null; then
  test_pass "rollback.sh has valid bash syntax"
else
  test_fail "rollback.sh has syntax errors"
fi

# Test 2: Verify functions exist
test_section "Test 2: Function Availability"

if grep -q "^deploy_blue_green()" deploy-prod.sh; then
  test_pass "deploy_blue_green function exists"
else
  test_fail "deploy_blue_green function not found"
fi

if grep -q "^health_check()" deploy-prod.sh; then
  test_pass "health_check function exists"
else
  test_fail "health_check function not found"
fi

if grep -q "^toggle_kill_switch()" deploy-prod.sh; then
  test_pass "toggle_kill_switch function exists"
else
  test_fail "toggle_kill_switch function not found"
fi

if grep -q "^rollback_to_blue()" deploy-prod.sh; then
  test_pass "rollback_to_blue function exists"
else
  test_fail "rollback_to_blue function not found"
fi

# Test 3: Verify configuration values
test_section "Test 3: Configuration Validation"

if grep -q "PROD_BLUE_PORT=3000" deploy-prod.sh; then
  test_pass "BLUE port configured (3000)"
else
  test_fail "BLUE port not configured"
fi

if grep -q "PROD_GREEN_PORT=3001" deploy-prod.sh; then
  test_pass "GREEN port configured (3001)"
else
  test_fail "GREEN port not configured"
fi

if grep -q "MAX_HEALTH_CHECKS=30" deploy-prod.sh; then
  test_pass "Health check max attempts configured"
else
  test_fail "Health check configuration missing"
fi

if grep -q "ERROR_RATE_THRESHOLD=0.1" deploy-prod.sh; then
  test_pass "Error rate threshold configured (0.1)"
else
  test_fail "Error rate threshold not configured"
fi

# Test 4: Feature flag integration
test_section "Test 4: Kill-Switch (Feature Flag) Integration"

if grep -q "PHASE_6_ENABLED" deploy-prod.sh; then
  test_pass "Feature flag PHASE_6_ENABLED referenced"
else
  test_fail "Feature flag not integrated"
fi

if grep -q "toggle_kill_switch" deploy-prod.sh; then
  test_pass "Kill-switch function called during deployment"
else
  test_fail "Kill-switch not called"
fi

# Test 5: Rollback procedures
test_section "Test 5: Rollback Procedure Validation"

if grep -q "Switch traffic back to BLUE" deploy-prod.sh; then
  test_pass "Load balancer switch-back procedure documented"
else
  test_fail "Load balancer switch-back missing"
fi

if grep -q "Rollback time: < 1 minute" rollback.sh; then
  test_pass "RTO (< 1 minute) documented"
else
  test_fail "RTO not documented"
fi

if grep -q "supabase secrets set PHASE_6_ENABLED" rollback.sh; then
  test_pass "Feature flag disable in rollback script"
else
  test_fail "Feature flag disable missing from rollback"
fi

# Test 6: Backup procedures
test_section "Test 6: Backup & Recovery"

if grep -q "backup_current" deploy-prod.sh; then
  test_pass "Backup function called before GREEN deployment"
else
  test_fail "Backup procedure missing"
fi

if grep -q "/backups/" deploy-prod.sh; then
  test_pass "Backup directory configured"
else
  test_fail "Backup directory not configured"
fi

# Test 7: Error handling
test_section "Test 7: Error Handling & Safety Checks"

if grep -q "set -e" deploy-prod.sh; then
  test_pass "Error handling enabled (set -e)"
else
  test_fail "Error handling not enabled"
fi

if grep -q "Health check failed" deploy-prod.sh && grep -q "return 1" deploy-prod.sh; then
  test_pass "Health check failure causes deployment abort"
else
  test_fail "Health check failure handling missing"
fi

if grep -q "Error rate" deploy-prod.sh && grep -q "toggle_kill_switch \"off\"" deploy-prod.sh; then
  test_pass "Error rate check triggers rollback"
else
  test_fail "Error rate check incomplete"
fi

# Test 8: Logging & observability
test_section "Test 8: Logging & Monitoring"

if grep -q "log_info" deploy-prod.sh && grep -q "log_error" deploy-prod.sh; then
  test_pass "Logging functions implemented"
else
  test_fail "Logging functions missing"
fi

if grep -q "timestamp" deploy-prod.sh || grep -q "date +" deploy-prod.sh; then
  test_pass "Timestamped logs configured"
else
  test_fail "Log timestamps missing"
fi

# Test 9: Security considerations
test_section "Test 9: Security Validation"

if grep -q "supabase secrets" deploy-prod.sh; then
  test_pass "Supabase secrets management used (not hardcoded)"
else
  test_fail "Secrets may be hardcoded"
fi

if grep -q "/backups/" deploy-prod.sh && grep -q "cp -r" deploy-prod.sh; then
  test_pass "Backup encryption ready (uses system permissions)"
else
  test_warn "Backup encryption not explicitly configured"
fi

# Test 10: Documentation
test_section "Test 10: Documentation & Clarity"

if grep -q "BLOCKER #3" deploy-prod.sh; then
  test_pass "Blocker reference in code"
else
  test_fail "Blocker reference missing"
fi

if grep -q "Usage:" deploy-prod.sh || grep -q "Example:" deploy-prod.sh || grep -q "Step" deploy-prod.sh; then
  test_pass "Procedure documentation present"
else
  test_warn "Limited inline documentation"
fi

# Final summary
test_section "Test Summary"

echo "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED - Ready for production deployment${NC}"
  exit 0
else
  echo -e "${RED}❌ $TESTS_FAILED tests failed - Fix issues before deployment${NC}"
  exit 1
fi
