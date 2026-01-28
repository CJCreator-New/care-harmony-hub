# Data Migration & Synchronization Plan

## Overview

This document outlines the comprehensive strategy for migrating data from the monolithic PostgreSQL database to service-specific databases in the microservices architecture. The plan ensures zero data loss, maintains data consistency, and provides rollback capabilities.

**Migration Strategy**: Database-per-Service Pattern
**Migration Type**: Online Migration (Zero Downtime)
**Timeline**: 2 weeks
**Risk Level**: Medium (with proper rollback plan)

---

## Current Database Architecture

### Monolithic Schema Analysis

#### Core Tables (50+ tables identified)
```
auth_tables/          # Authentication & users
├── profiles
├── user_roles
├── hospital_staff
├── permissions
└── sessions

patient_tables/       # Patient management
├── patients
├── patient_history
├── patient_allergies
├── patient_medications
└── emergency_contacts

clinical_tables/      # Clinical workflows
├── consultations
├── diagnoses
├── treatment_plans
├── clinical_notes
└── vital_signs

pharmacy_tables/      # Pharmacy operations
├── prescriptions
├── medications
├── drug_interactions
├── pharmacy_inventory
└── prescription_fills

laboratory_tables/    # Lab operations
├── lab_orders
├── lab_results
├── test_definitions
├── specimens
└── lab_inventory

appointment_tables/   # Scheduling
├── appointments
├── availability_slots
├── scheduling_rules
└── appointment_types

billing_tables/       # Financial operations
├── claims
├── payments
├── invoices
├── insurance_info
└── billing_codes

analytics_tables/     # Reporting & BI
├── analytics_data
├── reports
├── dashboards
└── metrics_cache

shared_tables/        # Reference data
├── hospitals
├── system_codes (ICD-10, CPT, LOINC)
├── medication_master
└── lab_test_master
```

#### Data Relationships
- **Strong Coupling**: Patients ↔ Consultations ↔ Prescriptions ↔ Billing
- **Foreign Keys**: Extensive cross-table relationships
- **Data Volume**: Estimated 10M+ records across all tables
- **Growth Rate**: 100K+ new records monthly

---

## Target Database Architecture

### Service-Specific Databases

#### 1. Authentication Database (`auth_db`)
**Owner**: Authentication Service
**Tables**: 8 tables
**Data Volume**: ~100K users
```sql
-- Core auth tables
CREATE TABLE users (...);
CREATE TABLE roles (...);
CREATE TABLE permissions (...);
CREATE TABLE user_roles (...);
CREATE TABLE hospital_staff (...);
CREATE TABLE sessions (...);
CREATE TABLE hospitals (...);
CREATE TABLE audit_log (...);
```

#### 2. Patient Database (`patient_db`)
**Owner**: Patient Service
**Tables**: 12 tables
**Data Volume**: ~1M patients
```sql
-- Patient management tables
CREATE TABLE patients (...);
CREATE TABLE patient_history (...);
CREATE TABLE allergies (...);
CREATE TABLE emergency_contacts (...);
CREATE TABLE insurance_info (...);
CREATE TABLE patient_audit (...);
-- Read-only access to shared tables
```

#### 3. Clinical Database (`clinical_db`)
**Owner**: Clinical Service
**Tables**: 15 tables
**Data Volume**: ~5M consultations
```sql
-- Clinical workflow tables
CREATE TABLE consultations (...);
CREATE TABLE diagnoses (...);
CREATE TABLE treatment_plans (...);
CREATE TABLE clinical_notes (...);
CREATE TABLE vital_signs (...);
CREATE TABLE clinical_audit (...);
```

#### 4. Pharmacy Database (`pharmacy_db`)
**Owner**: Pharmacy Service
**Tables**: 10 tables
**Data Volume**: ~2M prescriptions
```sql
-- Pharmacy operations tables
CREATE TABLE prescriptions (...);
CREATE TABLE medications (...);
CREATE TABLE drug_interactions (...);
CREATE TABLE inventory (...);
CREATE TABLE prescription_fills (...);
CREATE TABLE pharmacy_audit (...);
```

#### 5. Laboratory Database (`laboratory_db`)
**Owner**: Laboratory Service
**Tables**: 12 tables
**Data Volume**: ~3M lab orders
```sql
-- Lab operations tables
CREATE TABLE lab_orders (...);
CREATE TABLE lab_results (...);
CREATE TABLE test_definitions (...);
CREATE TABLE specimens (...);
CREATE TABLE lab_inventory (...);
CREATE TABLE lab_audit (...);
```

#### 6. Appointment Database (`appointment_db`)
**Owner**: Appointment Service
**Tables**: 8 tables
**Data Volume**: ~500K appointments
```sql
-- Scheduling tables
CREATE TABLE appointments (...);
CREATE TABLE availability_slots (...);
CREATE TABLE scheduling_rules (...);
CREATE TABLE appointment_types (...);
CREATE TABLE appointment_audit (...);
```

#### 7. Billing Database (`billing_db`)
**Owner**: Billing Service
**Tables**: 10 tables
**Data Volume**: ~1M claims
```sql
-- Financial operations tables
CREATE TABLE claims (...);
CREATE TABLE payments (...);
CREATE TABLE invoices (...);
CREATE TABLE billing_codes (...);
CREATE TABLE billing_audit (...);
```

#### 8. Analytics Database (`analytics_db`)
**Owner**: Analytics Service
**Database**: PostgreSQL + ClickHouse
**Tables**: 20+ tables
**Data Volume**: ~100M aggregated records
```sql
-- Analytics and reporting tables
CREATE TABLE analytics_data (...);
CREATE TABLE reports (...);
CREATE TABLE dashboards (...);
CREATE TABLE metrics_cache (...);
CREATE TABLE analytics_audit (...);
```

### Shared Reference Database (`shared_db`)
**Access**: Read-only for all services
**Tables**: 10 tables
**Update Frequency**: Weekly batch updates
```sql
-- Reference data
CREATE TABLE hospitals (...);
CREATE TABLE system_codes (...);
CREATE TABLE medication_master (...);
CREATE TABLE lab_test_master (...);
CREATE TABLE reference_audit (...);
```

---

## Migration Strategy

### Phase 1: Preparation (Week 1)

#### 1.1 Database Infrastructure Setup
```bash
# Create service-specific databases
createdb auth_db
createdb patient_db
createdb clinical_db
createdb pharmacy_db
createdb laboratory_db
createdb appointment_db
createdb billing_db
createdb analytics_db
createdb shared_db

# Set up database users and permissions
createuser auth_service_user;
createuser patient_service_user;
# ... create users for each service

# Grant appropriate permissions
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_service_user;
# ... grant permissions for each service
```

#### 1.2 Schema Creation
```sql
-- Create schemas for each service database
-- Run migration scripts in order:
-- 01_create_auth_schema.sql
-- 02_create_patient_schema.sql
-- 03_create_clinical_schema.sql
-- 04_create_pharmacy_schema.sql
-- 05_create_laboratory_schema.sql
-- 06_create_appointment_schema.sql
-- 07_create_billing_schema.sql
-- 08_create_analytics_schema.sql
-- 09_create_shared_schema.sql
```

#### 1.3 Data Validation Scripts
```sql
-- Create data integrity validation queries
-- Count records in source tables
SELECT 'patients' as table_name, COUNT(*) as record_count FROM patients
UNION ALL
SELECT 'consultations', COUNT(*) FROM consultations
UNION ALL
-- ... validation for all tables

-- Check referential integrity
SELECT 'orphaned_consultations' as issue,
       COUNT(*) as count
FROM consultations c
LEFT JOIN patients p ON c.patient_id = p.id
WHERE p.id IS NULL;
```

### Phase 2: Data Migration (Week 2)

#### 2.1 Migration Tools Setup
```python
# migration_tool.py - Custom migration orchestrator
import psycopg2
import logging
from concurrent.futures import ThreadPoolExecutor

class DataMigrationTool:
    def __init__(self, source_db_url, target_dbs_config):
        self.source_conn = psycopg2.connect(source_db_url)
        self.target_conns = {
            service: psycopg2.connect(url)
            for service, url in target_dbs_config.items()
        }
        self.logger = logging.getLogger(__name__)

    def migrate_table(self, table_name, target_db, batch_size=1000):
        """Migrate table data with progress tracking"""
        # Implementation details...

    def validate_migration(self, table_name, source_count, target_count):
        """Validate data integrity post-migration"""
        # Implementation details...
```

#### 2.2 Migration Execution Order
```python
# Execute migrations in dependency order
migration_order = [
    # 1. Foundation data (no dependencies)
    ('hospitals', 'shared_db'),
    ('system_codes', 'shared_db'),
    ('medication_master', 'shared_db'),

    # 2. Authentication (foundation service)
    ('users', 'auth_db'),
    ('roles', 'auth_db'),
    ('permissions', 'auth_db'),

    # 3. Patient data (depends on auth)
    ('patients', 'patient_db'),
    ('patient_history', 'patient_db'),
    ('allergies', 'patient_db'),

    # 4. Clinical data (depends on patients)
    ('consultations', 'clinical_db'),
    ('diagnoses', 'clinical_db'),
    ('treatment_plans', 'clinical_db'),

    # 5. Pharmacy data (depends on clinical)
    ('prescriptions', 'pharmacy_db'),
    ('medications', 'pharmacy_db'),

    # 6. Lab data (depends on clinical)
    ('lab_orders', 'laboratory_db'),
    ('lab_results', 'laboratory_db'),

    # 7. Appointments (depends on patients)
    ('appointments', 'appointment_db'),
    ('availability_slots', 'appointment_db'),

    # 8. Billing (depends on clinical/pharmacy)
    ('claims', 'billing_db'),
    ('payments', 'billing_db'),
    ('invoices', 'billing_db'),

    # 9. Analytics (read-only aggregation)
    ('analytics_data', 'analytics_db'),
]
```

#### 2.3 Incremental Migration Script
```sql
-- Incremental migration with change tracking
-- Add migration tracking table
CREATE TABLE migration_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    source_db VARCHAR(255) NOT NULL,
    target_db VARCHAR(255) NOT NULL,
    last_migrated_id BIGINT,
    migrated_count BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Migration procedure for each table
CREATE OR REPLACE PROCEDURE migrate_table_data(
    p_table_name TEXT,
    p_source_db TEXT,
    p_target_db TEXT,
    p_batch_size INTEGER DEFAULT 1000
) AS $$
DECLARE
    v_last_id BIGINT := 0;
    v_migrated_count BIGINT := 0;
    v_batch_count INTEGER;
BEGIN
    -- Get last migrated ID
    SELECT COALESCE(last_migrated_id, 0)
    INTO v_last_id
    FROM migration_log
    WHERE table_name = p_table_name
      AND source_db = p_source_db
      AND target_db = p_target_db
      AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1;

    -- Migrate data in batches
    LOOP
        -- Execute dynamic migration query
        EXECUTE format('
            INSERT INTO %I.%I
            SELECT * FROM dblink(''host=source_db port=5432 user=migration_user password=migration_pass dbname=monolith'',
                ''SELECT * FROM %I WHERE id > %L ORDER BY id LIMIT %L'')
            AS t(id BIGINT, ...other columns...)
            ON CONFLICT (id) DO UPDATE SET ...',
            p_target_db, p_table_name, p_table_name, v_last_id, p_batch_size
        );

        GET DIAGNOSTICS v_batch_count = ROW_COUNT;
        v_migrated_count := v_migrated_count + v_batch_count;

        -- Update migration log
        UPDATE migration_log
        SET migrated_count = v_migrated_count,
            last_migrated_id = v_last_id + v_batch_count
        WHERE table_name = p_table_name;

        -- Exit when no more rows
        EXIT WHEN v_batch_count < p_batch_size;
    END LOOP;

    -- Mark migration complete
    UPDATE migration_log
    SET status = 'completed',
        completed_at = NOW()
    WHERE table_name = p_table_name;

    COMMIT;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: Synchronization Setup

#### 3.1 Change Data Capture (CDC)
```sql
-- Set up logical replication for ongoing sync
-- Create publication on source database
CREATE PUBLICATION care_sync_publication
FOR TABLE patients, consultations, prescriptions,
         lab_orders, appointments, claims;

-- Create subscription on each target database
CREATE SUBSCRIPTION patient_sync
CONNECTION 'host=source_db port=5432 user=replication_user dbname=monolith'
PUBLICATION care_sync_publication
WITH (copy_data = false);  -- Don't copy existing data
```

#### 3.2 Event-Driven Synchronization
```typescript
// synchronization-service.ts
import { Kafka } from 'kafkajs';

class SynchronizationService {
  private kafka: Kafka;
  private consumer: Consumer;

  async syncPatientData(patientId: string) {
    // Fetch latest patient data from source
    const patientData = await this.fetchFromSource('patients', patientId);

    // Update all relevant service databases
    await Promise.all([
      this.updatePatientDB(patientData),
      this.updateClinicalDB({ patientId, demographics: patientData }),
      this.updatePharmacyDB({ patientId, allergies: patientData.allergies }),
      this.updateBillingDB({ patientId, insurance: patientData.insurance })
    ]);

    // Publish sync completion event
    await this.kafka.producer.send({
      topic: 'data.sync.completed',
      messages: [{ value: JSON.stringify({ patientId, timestamp: Date.now() }) }]
    });
  }
}
```

#### 3.3 Conflict Resolution Strategy
```typescript
interface ConflictResolutionRule {
  table: string;
  strategy: 'latest_wins' | 'manual_resolution' | 'service_priority';
  priorityService?: string;
}

const conflictRules: ConflictResolutionRule[] = [
  { table: 'patients', strategy: 'latest_wins' },
  { table: 'consultations', strategy: 'service_priority', priorityService: 'clinical' },
  { table: 'prescriptions', strategy: 'manual_resolution' }
];

class ConflictResolver {
  async resolve(table: string, recordId: string, conflicts: any[]) {
    const rule = conflictRules.find(r => r.table === table);

    switch (rule.strategy) {
      case 'latest_wins':
        return conflicts.sort((a, b) => b.updatedAt - a.updatedAt)[0];

      case 'service_priority':
        return conflicts.find(c => c.sourceService === rule.priorityService) ||
               conflicts[0];

      case 'manual_resolution':
        // Queue for manual review
        await this.queueForManualReview(table, recordId, conflicts);
        break;
    }
  }
}
```

---

## Rollback Strategy

### Emergency Rollback Plan
```bash
# rollback.sh - Emergency rollback script
#!/bin/bash

echo "Starting emergency rollback..."

# Stop all microservices
docker-compose -f docker-compose.microservices.yml down

# Restore monolithic database from backup
pg_restore -h localhost -U postgres -d monolithic_db monolithic_backup.sql

# Restart monolithic application
docker-compose -f docker-compose.monolith.yml up -d

# Verify application health
curl -f https://app.caresync.com/health || exit 1

echo "Rollback completed successfully"
```

### Gradual Rollback Options
1. **Service-by-Service Rollback**: Roll back individual services while keeping others running
2. **Feature Flags**: Use feature flags to disable microservices features
3. **Traffic Shifting**: Gradually shift traffic back to monolithic endpoints

### Data Recovery Procedures
```sql
-- Data recovery from service databases
CREATE OR REPLACE FUNCTION recover_from_services()
RETURNS void AS $$
BEGIN
    -- Recover patient data
    INSERT INTO monolithic.patients
    SELECT * FROM patient_db.patients
    ON CONFLICT (id) DO UPDATE SET ...;

    -- Recover clinical data
    INSERT INTO monolithic.consultations
    SELECT * FROM clinical_db.consultations
    ON CONFLICT (id) DO UPDATE SET ...;

    -- Continue for all services...
END;
$$ LANGUAGE plpgsql;
```

---

## Testing & Validation

### Pre-Migration Testing
```sql
-- Data integrity checks
SELECT
    'patients' as table_name,
    COUNT(*) as source_count
FROM monolithic.patients

UNION ALL

SELECT
    'patients' as table_name,
    COUNT(*) as target_count
FROM patient_db.patients;
```

### Post-Migration Validation
```typescript
// validation-suite.ts
class MigrationValidator {
  async validateAllTables() {
    const tables = [
      'patients', 'consultations', 'prescriptions',
      'lab_orders', 'appointments', 'claims'
    ];

    for (const table of tables) {
      await this.validateTableCounts(table);
      await this.validateReferentialIntegrity(table);
      await this.validateDataConsistency(table);
    }
  }

  async validateTableCounts(tableName: string) {
    const sourceCount = await this.getCount('monolithic', tableName);
    const targetCount = await this.getCount('target_db', tableName);

    if (sourceCount !== targetCount) {
      throw new Error(`Count mismatch for ${tableName}: ${sourceCount} vs ${targetCount}`);
    }
  }
}
```

### Performance Testing
```bash
# Load testing script
ab -n 10000 -c 100 https://api.caresync.com/api/v1/patients

# Monitor database performance
watch -n 5 'psql -c "SELECT * FROM pg_stat_activity;"'

# Check replication lag
psql -c "SELECT * FROM pg_stat_replication;"
```

---

## Monitoring & Alerting

### Migration Monitoring Dashboard
```typescript
// monitoring-dashboard.ts
interface MigrationMetrics {
  tablesMigrated: number;
  totalRecordsMigrated: number;
  migrationProgress: number;
  estimatedTimeRemaining: number;
  errorCount: number;
  performanceMetrics: {
    migrationRate: number; // records/second
    memoryUsage: number;
    cpuUsage: number;
  };
}

class MigrationMonitor {
  async getMigrationStatus(): Promise<MigrationMetrics> {
    // Query migration metrics from database
    const metrics = await this.db.query(`
      SELECT
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as tables_completed,
        SUM(migrated_count) as total_records,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
      FROM migration_log
    `);

    return {
      tablesMigrated: metrics.tables_completed,
      totalRecordsMigrated: metrics.total_records,
      migrationProgress: (metrics.tables_completed / totalTables) * 100,
      // ... calculate other metrics
    };
  }
}
```

### Alert Configuration
```yaml
# alerting-rules.yml
groups:
  - name: migration_alerts
    rules:
      - alert: MigrationLag
        expr: migration_lag_seconds > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Migration lag exceeds 5 minutes"

      - alert: MigrationErrors
        expr: migration_errors_total > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High migration error rate detected"

      - alert: DataInconsistency
        expr: data_inconsistency_detected > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Data inconsistency detected"
```

---

## Risk Mitigation

### Risk Assessment Matrix

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| Data Loss | Low | Critical | Multiple backups, validation checks |
| Migration Performance | Medium | High | Batch processing, parallel migration |
| Extended Downtime | Low | Critical | Online migration, gradual rollout |
| Data Inconsistency | Medium | High | Comprehensive validation, conflict resolution |
| Service Dependencies | High | Medium | Dependency mapping, staged rollout |

### Contingency Plans

#### Plan A: Complete Rollback
- Duration: 2 hours
- Impact: Full system downtime
- Trigger: Critical data corruption detected

#### Plan B: Service-by-Service Rollback
- Duration: 4-6 hours per service
- Impact: Partial functionality loss
- Trigger: Service-specific issues

#### Plan C: Hybrid Operation
- Duration: Ongoing
- Impact: Minimal user impact
- Trigger: Non-critical issues

---

## Success Criteria

### Technical Success Metrics
- **Data Accuracy**: 100% record count match across all tables
- **Referential Integrity**: Zero orphaned records
- **Performance**: <10% degradation in query performance
- **Availability**: 99.9% uptime during migration
- **Rollback Time**: <4 hours for complete rollback

### Business Success Metrics
- **Migration Duration**: Complete within 2-week timeline
- **Cost**: Within 10% of budgeted migration costs
- **User Impact**: Zero user-facing issues during migration
- **Team Productivity**: 90% team productivity maintained

### Validation Checklist
- [ ] All tables migrated successfully
- [ ] Data integrity validated
- [ ] Performance benchmarks met
- [ ] Rollback procedures tested
- [ ] Monitoring and alerting configured
- [ ] Documentation completed
- [ ] Team training completed

---

## Implementation Timeline

### Week 1: Preparation & Setup
- **Day 1-2**: Infrastructure setup and schema creation
- **Day 3-4**: Migration tools development and testing
- **Day 5**: Data validation scripts and dry-run migration

### Week 2: Execution & Validation
- **Day 1-3**: Incremental data migration with monitoring
- **Day 4**: Synchronization setup and testing
- **Day 5**: Final validation and go-live preparation

### Post-Migration (Ongoing)
- **Week 3**: Monitoring and optimization
- **Week 4**: Performance tuning and documentation

---

## Conclusion

This data migration plan provides a comprehensive, low-risk strategy for transitioning from a monolithic database to a microservices database architecture. The plan emphasizes:

- **Zero Data Loss**: Through comprehensive backups and validation
- **Minimal Downtime**: Online migration with gradual rollout
- **Robust Rollback**: Multiple rollback strategies for different scenarios
- **Continuous Validation**: Automated checks throughout the migration process
- **Comprehensive Monitoring**: Real-time tracking and alerting

The migration will establish a solid foundation for the microservices architecture while maintaining data integrity and system availability.

---

**Document Version**: 1.0
**Last Updated**: January 28, 2026
**Review Status**: Ready for Implementation
**Approval Required**: Infrastructure Team, Data Team, Security Team