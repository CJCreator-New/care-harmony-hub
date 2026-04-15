# Database Documentation

## Database Schema

### Patients Table
- patient_id (primary key)
- first_name
- last_name
- date_of_birth
- gender
- contact_information
- medical_record_number
- hospital_id (foreign key)

### Prescriptions Table
- prescription_id (primary key)
- patient_id (foreign key)
- doctor_id (foreign key)
- medication_id (foreign key)
- dosage
- frequency
- duration
- created_at
- status

### Lab Orders Table
- order_id (primary key)
- patient_id (foreign key)
- test_type
- ordered_by (foreign key)
- specimen_type
- status
- collected_at

### Pharmacy Inventory Table
- inventory_id (primary key)
- medication_id (foreign key)
- quantity_available
- expiration_date
- location

### Staff Table
- staff_id (primary key)
- first_name
- last_name
- email
- role (doctor, nurse, pharmacist, lab_technician, admin)
- license_number
- department
- hospital_id (foreign key)
- is_active

## Data Relationships

Foreign key relationships:
- Patients -> Hospital
- Prescriptions -> Patient
- Prescriptions -> Doctor (via staff)
- Prescriptions -> Medication
- Lab Orders -> Patient
- Lab Orders -> Doctor (via staff)
- Lab Orders -> Nurse (via staff)
- Pharmacy Inventory -> Medication
- Staff -> Hospital

## Indexing Strategy

Indexes created on:
- patient_id (frequently searched)
- doctor_id (workflow filtering)
- hospital_id (data scoping)
- status columns (filtering)
- created_at (sorting)
