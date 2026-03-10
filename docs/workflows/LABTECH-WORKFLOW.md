# Lab Technician Workflow

## Overview

Lab technicians process lab orders, collect samples, run tests, and enter results into CareSync.

## Daily Workflow

### 1. Review Pending Lab Orders

Navigate to **Laboratory** → **Pending Orders** to see all orders awaiting action, sorted by priority (STAT → urgent → routine).

### 2. Sample Collection

1. Locate the patient in the queue.
2. Confirm patient identity against the order.
3. Collect the sample and mark the order as **Sample Collected** with timestamp.

### 3. Process and Enter Results

1. Run the test on laboratory equipment.
2. Enter results in the **Results Entry** form.
3. Flag abnormal results with the appropriate reference range indicator.
4. For critical values, use the **Mark Critical** toggle — an urgent notification is automatically sent to the ordering doctor.

### 4. Complete the Order

Set order status to **Completed**. The system automatically notifies the doctor via the workflow event `LAB_RESULTS_READY`.

## Critical Result Protocol

When results indicate a life-threatening value:
1. Immediately mark the result as **Critical**.
2. Telephone the ordering physician if no acknowledgement within 10 minutes.
3. Document the notification in the system.

## Permissions

Lab technicians have the following access:
- `lab:read` — view all lab orders for the hospital
- `lab:write` — update lab order status and enter results
- `appointment:read` — view today's scheduled appointments
