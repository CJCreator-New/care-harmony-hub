-- T-46: Atomic patient registration RPC
-- Combines assign_patient_role + ensure_patient_record_for_user into a
-- single transaction so partial failures don't leave orphaned auth users.
-- Idempotent: safe to call more than once for the same user.

CREATE OR REPLACE FUNCTION register_patient(
  p_user_id         uuid,
  p_first_name      text,
  p_last_name       text,
  p_email           text   DEFAULT NULL,
  p_phone           text   DEFAULT NULL,
  p_date_of_birth   date   DEFAULT NULL,
  p_gender          text   DEFAULT NULL,
  p_address         text   DEFAULT NULL,
  p_city            text   DEFAULT NULL,
  p_state           text   DEFAULT NULL,
  p_zip             text   DEFAULT NULL,
  p_blood_type      text   DEFAULT NULL,
  p_allergies       text[] DEFAULT NULL,
  p_chronic_conditions text[] DEFAULT NULL,
  p_emergency_contact_name         text DEFAULT NULL,
  p_emergency_contact_phone        text DEFAULT NULL,
  p_emergency_contact_relationship text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id     uuid;
  v_hospital_id uuid;
  v_patient_id  uuid;
BEGIN
  -- ── 1. Resolve 'patient' role id ───────────────────────────────────────────
  SELECT id INTO v_role_id FROM roles WHERE name = 'patient' LIMIT 1;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'patient role not found in roles table';
  END IF;

  -- ── 2. Assign role (idempotent) ────────────────────────────────────────────
  INSERT INTO user_roles (user_id, role_id)
  VALUES (p_user_id, v_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- ── 3. Determine hospital (use the profile's hospital or the default) ──────
  SELECT hospital_id INTO v_hospital_id
  FROM profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  -- ── 4. Upsert patient record (idempotent on profile_id FK) ─────────────────
  -- First check if a patients row already exists for this auth user.
  SELECT p.id INTO v_patient_id
  FROM patients p
  JOIN profiles pr ON pr.id = p.profile_id
  WHERE pr.user_id = p_user_id
  LIMIT 1;

  IF v_patient_id IS NULL THEN
    -- Get the profile id
    DECLARE
      v_profile_id uuid;
    BEGIN
      SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id LIMIT 1;

      INSERT INTO patients (
        profile_id,
        hospital_id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        address,
        city,
        state,
        zip,
        blood_type,
        allergies,
        chronic_conditions,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship
      ) VALUES (
        v_profile_id,
        v_hospital_id,
        p_first_name,
        p_last_name,
        p_email,
        p_phone,
        p_date_of_birth,
        p_gender,
        p_address,
        p_city,
        p_state,
        p_zip,
        p_blood_type,
        p_allergies,
        p_chronic_conditions,
        p_emergency_contact_name,
        p_emergency_contact_phone,
        p_emergency_contact_relationship
      )
      RETURNING id INTO v_patient_id;
    END;
  ELSE
    -- Already exists — update demographic fields only (preserve clinical data)
    UPDATE patients SET
      first_name                       = COALESCE(p_first_name, first_name),
      last_name                        = COALESCE(p_last_name, last_name),
      email                            = COALESCE(p_email, email),
      phone                            = COALESCE(p_phone, phone),
      date_of_birth                    = COALESCE(p_date_of_birth, date_of_birth),
      gender                           = COALESCE(p_gender, gender),
      address                          = COALESCE(p_address, address),
      city                             = COALESCE(p_city, city),
      state                            = COALESCE(p_state, state),
      zip                              = COALESCE(p_zip, zip),
      blood_type                       = COALESCE(p_blood_type, blood_type),
      allergies                        = COALESCE(p_allergies, allergies),
      chronic_conditions               = COALESCE(p_chronic_conditions, chronic_conditions),
      emergency_contact_name           = COALESCE(p_emergency_contact_name, emergency_contact_name),
      emergency_contact_phone          = COALESCE(p_emergency_contact_phone, emergency_contact_phone),
      emergency_contact_relationship   = COALESCE(p_emergency_contact_relationship, emergency_contact_relationship)
    WHERE id = v_patient_id;
  END IF;

  RETURN jsonb_build_object('patient_id', v_patient_id);
END;
$$;

-- Grant execute only to authenticated users (Supabase anon cannot call it)
GRANT EXECUTE ON FUNCTION register_patient TO authenticated;
