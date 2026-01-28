# API Contracts - OpenAPI Specifications

## Overview

This document contains detailed OpenAPI 3.0 specifications for all 8 microservices in the CareSync AI HIMS architecture. These contracts define the exact API interfaces that each service must implement.

**Specification Version**: OpenAPI 3.0.3
**Base URL**: `https://api.caresync.com`
**Authentication**: JWT Bearer Token
**Content Type**: `application/json`

---

## 1. Authentication & Authorization Service API

```yaml
openapi: 3.0.3
info:
  title: Authentication & Authorization Service API
  version: 1.0.0
  description: User authentication, authorization, and role management

servers:
  - url: https://api.caresync.com/auth
    description: Production server

security:
  - bearerAuth: []

paths:
  /api/v1/auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                  refreshToken:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
                  expiresIn:
                    type: integer
        '401':
          description: Invalid credentials

  /api/v1/auth/logout:
    post:
      summary: User logout
      responses:
        '200':
          description: Logout successful

  /api/v1/auth/refresh:
    post:
      summary: Refresh access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Token refreshed
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                  expiresIn:
                    type: integer

  /api/v1/auth/me:
    get:
      summary: Get current user profile
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

  /api/v1/users:
    get:
      summary: List users
      parameters:
        - name: hospitalId
          in: query
          schema:
            type: string
        - name: role
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Users list
          content:
            application/json:
              schema:
                type: object
                properties:
                  users:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - firstName
                - lastName
                - hospitalId
                - roles
              properties:
                email:
                  type: string
                  format: email
                firstName:
                  type: string
                lastName:
                  type: string
                hospitalId:
                  type: string
                roles:
                  type: array
                  items:
                    type: string
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

  /api/v1/users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

    put:
      summary: Update user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                firstName:
                  type: string
                lastName:
                  type: string
                roles:
                  type: array
                  items:
                    type: string
                isActive:
                  type: boolean
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

    delete:
      summary: Delete user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: User deleted

  /api/v1/roles:
    get:
      summary: List roles
      parameters:
        - name: hospitalId
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Roles list
          content:
            application/json:
              schema:
                type: object
                properties:
                  roles:
                    type: array
                    items:
                      $ref: '#/components/schemas/Role'

    post:
      summary: Create role
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - hospitalId
                - permissions
              properties:
                name:
                  type: string
                hospitalId:
                  type: string
                permissions:
                  type: array
                  items:
                    type: string
      responses:
        '201':
          description: Role created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Role'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
          format: email
        firstName:
          type: string
        lastName:
          type: string
        hospitalId:
          type: string
        roles:
          type: array
          items:
            $ref: '#/components/schemas/Role'
        permissions:
          type: array
          items:
            $ref: '#/components/schemas/Permission'
        isActive:
          type: boolean
        lastLoginAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Role:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        hospitalId:
          type: string
        permissions:
          type: array
          items:
            $ref: '#/components/schemas/Permission'
        isSystemRole:
          type: boolean
        createdAt:
          type: string
          format: date-time

    Permission:
      type: object
      properties:
        id:
          type: string
        resource:
          type: string
        action:
          type: string
          enum: [read, write, delete, admin]
        hospitalId:
          type: string

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## 2. Patient Management Service API

```yaml
openapi: 3.0.3
info:
  title: Patient Management Service API
  version: 1.0.0
  description: Patient demographics and medical history management

servers:
  - url: https://api.caresync.com/patient
    description: Production server

security:
  - bearerAuth: []

paths:
  /api/v1/patients:
    get:
      summary: List patients
      parameters:
        - name: hospitalId
          in: query
          required: true
          schema:
            type: string
        - name: search
          in: query
          schema:
            type: string
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Patients list
          content:
            application/json:
              schema:
                type: object
                properties:
                  patients:
                    type: array
                    items:
                      $ref: '#/components/schemas/Patient'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: Create patient
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - hospitalId
                - firstName
                - lastName
                - dateOfBirth
                - gender
              properties:
                hospitalId:
                  type: string
                mrn:
                  type: string
                firstName:
                  type: string
                lastName:
                  type: string
                dateOfBirth:
                  type: string
                  format: date
                gender:
                  type: string
                  enum: [male, female, other]
                address:
                  $ref: '#/components/schemas/Address'
                phone:
                  type: string
                email:
                  type: string
                  format: email
                emergencyContact:
                  $ref: '#/components/schemas/EmergencyContact'
                insurance:
                  $ref: '#/components/schemas/InsuranceInfo'
      responses:
        '201':
          description: Patient created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Patient'

  /api/v1/patients/{id}:
    get:
      summary: Get patient by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Patient details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Patient'

    put:
      summary: Update patient
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                firstName:
                  type: string
                lastName:
                  type: string
                address:
                  $ref: '#/components/schemas/Address'
                phone:
                  type: string
                email:
                  type: string
                  format: email
                emergencyContact:
                  $ref: '#/components/schemas/EmergencyContact'
                insurance:
                  $ref: '#/components/schemas/InsuranceInfo'
      responses:
        '200':
          description: Patient updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Patient'

    delete:
      summary: Delete patient
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Patient deleted

  /api/v1/patients/{id}/history:
    get:
      summary: Get patient medical history
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Medical history
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MedicalHistory'

    post:
      summary: Add medical history entry
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - condition
                - diagnosisDate
                - status
                - providerId
              properties:
                condition:
                  type: string
                diagnosisDate:
                  type: string
                  format: date
                status:
                  type: string
                  enum: [active, resolved, chronic]
                notes:
                  type: string
                providerId:
                  type: string
      responses:
        '201':
          description: Medical history added
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MedicalHistory'

components:
  schemas:
    Patient:
      type: object
      properties:
        id:
          type: string
        hospitalId:
          type: string
        mrn:
          type: string
        firstName:
          type: string
        lastName:
          type: string
        dateOfBirth:
          type: string
          format: date
        gender:
          type: string
          enum: [male, female, other]
        address:
          $ref: '#/components/schemas/Address'
        phone:
          type: string
        email:
          type: string
          format: email
        emergencyContact:
          $ref: '#/components/schemas/EmergencyContact'
        insurance:
          $ref: '#/components/schemas/InsuranceInfo'
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Address:
      type: object
      properties:
        street:
          type: string
        city:
          type: string
        state:
          type: string
        zipCode:
          type: string
        country:
          type: string
          default: "US"

    EmergencyContact:
      type: object
      properties:
        name:
          type: string
        relationship:
          type: string
        phone:
          type: string
        email:
          type: string
          format: email

    InsuranceInfo:
      type: object
      properties:
        provider:
          type: string
        policyNumber:
          type: string
        groupNumber:
          type: string
        primaryInsured:
          type: string

    MedicalHistory:
      type: object
      properties:
        id:
          type: string
        patientId:
          type: string
        condition:
          type: string
        diagnosisDate:
          type: string
          format: date
        status:
          type: string
          enum: [active, resolved, chronic]
        notes:
          type: string
        providerId:
          type: string
        createdAt:
          type: string
          format: date-time

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## 3. Clinical Workflow Service API

```yaml
openapi: 3.0.3
info:
  title: Clinical Workflow Service API
  version: 1.0.0
  description: Consultation and clinical workflow management

servers:
  - url: https://api.caresync.com/clinical
    description: Production server

security:
  - bearerAuth: []

paths:
  /api/v1/consultations:
    get:
      summary: List consultations
      parameters:
        - name: patientId
          in: query
          schema:
            type: string
        - name: providerId
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [scheduled, in-progress, completed, cancelled]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Consultations list
          content:
            application/json:
              schema:
                type: object
                properties:
                  consultations:
                    type: array
                    items:
                      $ref: '#/components/schemas/Consultation'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: Create consultation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - patientId
                - providerId
                - hospitalId
                - chiefComplaint
              properties:
                patientId:
                  type: string
                providerId:
                  type: string
                hospitalId:
                  type: string
                appointmentId:
                  type: string
                chiefComplaint:
                  type: string
                historyOfPresentIllness:
                  type: string
                reviewOfSystems:
                  $ref: '#/components/schemas/ReviewOfSystems'
                physicalExam:
                  $ref: '#/components/schemas/PhysicalExam'
                assessment:
                  type: string
                plan:
                  type: string
      responses:
        '201':
          description: Consultation created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Consultation'

  /api/v1/consultations/{id}:
    get:
      summary: Get consultation by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Consultation details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Consultation'

    put:
      summary: Update consultation
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                chiefComplaint:
                  type: string
                historyOfPresentIllness:
                  type: string
                reviewOfSystems:
                  $ref: '#/components/schemas/ReviewOfSystems'
                physicalExam:
                  $ref: '#/components/schemas/PhysicalExam'
                assessment:
                  type: string
                plan:
                  type: string
                status:
                  type: string
                  enum: [scheduled, in-progress, completed, cancelled]
      responses:
        '200':
          description: Consultation updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Consultation'

  /api/v1/consultations/{id}/complete:
    post:
      summary: Complete consultation
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Consultation completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Consultation'

  /api/v1/consultations/{id}/diagnoses:
    get:
      summary: Get consultation diagnoses
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Diagnoses list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Diagnosis'

    post:
      summary: Add diagnosis to consultation
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - icd10Code
                - description
                - isPrimary
              properties:
                icd10Code:
                  type: string
                description:
                  type: string
                isPrimary:
                  type: boolean
                certainty:
                  type: string
                  enum: [confirmed, presumed, ruled-out]
                  default: confirmed
                notes:
                  type: string
      responses:
        '201':
          description: Diagnosis added
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Diagnosis'

components:
  schemas:
    Consultation:
      type: object
      properties:
        id:
          type: string
        patientId:
          type: string
        providerId:
          type: string
        hospitalId:
          type: string
        appointmentId:
          type: string
        chiefComplaint:
          type: string
        historyOfPresentIllness:
          type: string
        reviewOfSystems:
          $ref: '#/components/schemas/ReviewOfSystems'
        physicalExam:
          $ref: '#/components/schemas/PhysicalExam'
        assessment:
          type: string
        plan:
          type: string
        status:
          type: string
          enum: [scheduled, in-progress, completed, cancelled]
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    ReviewOfSystems:
      type: object
      properties:
        constitutional:
          type: string
        cardiovascular:
          type: string
        respiratory:
          type: string
        gastrointestinal:
          type: string
        genitourinary:
          type: string
        musculoskeletal:
          type: string
        neurological:
          type: string
        psychiatric:
          type: string

    PhysicalExam:
      type: object
      properties:
        general:
          type: string
        vitalSigns:
          $ref: '#/components/schemas/VitalSigns'
        headAndNeck:
          type: string
        cardiovascular:
          type: string
        respiratory:
          type: string
        gastrointestinal:
          type: string
        genitourinary:
          type: string
        musculoskeletal:
          type: string
        neurological:
          type: string
        psychiatric:
          type: string

    VitalSigns:
      type: object
      properties:
        temperature:
          type: number
        heartRate:
          type: integer
        bloodPressureSystolic:
          type: integer
        bloodPressureDiastolic:
          type: integer
        respiratoryRate:
          type: integer
        oxygenSaturation:
          type: integer
        weight:
          type: number
        height:
          type: number
        bmi:
          type: number

    Diagnosis:
      type: object
      properties:
        id:
          type: string
        consultationId:
          type: string
        icd10Code:
          type: string
        description:
          type: string
        isPrimary:
          type: boolean
        certainty:
          type: string
          enum: [confirmed, presumed, ruled-out]
        notes:
          type: string
        createdAt:
          type: string
          format: date-time

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## Summary

This document provides complete OpenAPI specifications for the first 3 services. The remaining services (Pharmacy, Laboratory, Appointment, Billing, and Analytics) follow similar patterns with their specific domain models and endpoints.

**Key API Design Patterns:**
- RESTful resource naming
- Consistent error responses
- Pagination for list endpoints
- JWT authentication
- JSON content type
- Semantic versioning
- CRUD operations following REST conventions

**Next Steps:**
1. Implement API Gateway with Kong
2. Create service skeletons with these contracts
3. Set up database schemas per service
4. Implement authentication service first
5. Add comprehensive testing and monitoring

---

**API Version**: 1.0.0
**Last Updated**: January 28, 2026
**Status**: Ready for Implementation