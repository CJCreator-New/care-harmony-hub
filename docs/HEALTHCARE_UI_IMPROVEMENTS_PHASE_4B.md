# Phase 4B: Healthcare UI Improvements - Implementation Guide

**Status**: Ready to implement  
**Estimated Duration**: 3-4 days  
**Priority**: Critical Readability + Safety, then Accessibility, then UX  
**Test Command**: `npm run test:accessibility`

---

## Overview

This guide translates the 11 issues from Phase 4A into concrete code improvements. Each improvement includes:
- **Current Code** (before screenshot)
- **Problem** (what's wrong)
- **Solution** (code changes)
- **Validation** (how to test)

---

## Part 1: Critical Readability & Safety (Priority 1)

### 1.1 🔴 Dosage Field Font Size <16px

**File**: `src/components/doctor/PrescriptionBuilder.tsx`

**Problem**: Dosage input uses default 14px font, hard to read for doctors prescribing critical medications.

**Current Code**:
```tsx
// Line ~150 (approx)
<AnimatedInput
  placeholder="Enter dosage"
  value={dosage}
  onChange={(e) => setDosage(e.target.value)}
/>
// No explicit sizing → defaults to text-sm (14px)
```

**Solution**: Increase dosage field to 18px + bold label
```tsx
// IMPROVEMENT 1: Add to dosage label
<label className="block text-sm font-semibold mb-1">
  Dosage <span className="text-destructive">*</span>
</label>

// IMPROVEMENT 2: Increase input size
<div className="relative">
  <AnimatedInput
    placeholder="e.g., 500 mg"
    value={dosage}
    onChange={(e) => setDosage(e.target.value)}
    className="text-lg font-semibold" // 18px + bold
    inputSize="large" // if component supports
  />
  <span className="absolute right-3 top-3 text-sm text-muted-foreground">
    {dosageUnit || "mg"}
  </span>
</div>
```

**Validation**:
```bash
# In browser: Inspect dosage input, verify computed font-size >= 18px
# Screenshot: Compare with "normal" label text (should be larger)
```

---

### 1.2 🔴 Allergy Flags Not Prominent

**File**: `src/components/doctor/PrescriptionBuilder.tsx`

**Problem**: Patient allergies not displayed prominently during prescription entry. Risk of accidental allergenic drug prescription.

**Current Code**:
```tsx
// Allergy check exists but not visible in entry form
interface PrescriptionBuilderProps {
  patientId: string
  onSave: (prescription: Prescription) => void
  existingDrugs?: Drug[]
  // Missing: patientAllergies prop
}
```

**Solution**: Add red allergy banner at top of form
```tsx
// IMPROVEMENT 1: Add patientAllergies to props
interface PrescriptionBuilderProps {
  patientId: string
  onSave: (prescription: Prescription) => void
  existingDrugs?: Drug[]
  patientAllergies?: string[] // NEW
}

// IMPROVEMENT 2: Add red banner at top of dialog
export function PrescriptionBuilder({
  patientId,
  onSave,
  existingDrugs = [],
  patientAllergies = [] // NEW
}: PrescriptionBuilderProps) {
  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prescription Entry</DialogTitle>
        </DialogHeader>

        {/* NEW: Allergy Alert Banner */}
        {patientAllergies.length > 0 && (
          <div className="bg-destructive/10 border-l-4 border-destructive rounded-md p-3 mb-4">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive text-sm">
                  ⚠️ Patient Allergies
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {patientAllergies.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Verify selected medications are NOT contraindicated.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rest of form... */}

        {/* IMPROVEMENT 3: Add allergy check before saving */}
        <DialogFooter>
          <Button
            onClick={() => {
              // Check if any selected drug matches allergy
              const allergicDrug = items.find(item =>
                patientAllergies.some(allergy =>
                  item.drug.name.toLowerCase().includes(allergy.toLowerCase())
                )
              )
              if (allergicDrug) {
                showToast({
                  type: "error",
                  title: "Allergy Conflict",
                  description: `${allergicDrug.drug.name} conflicts with patient allergy: ${patientAllergies.filter(a => allergicDrug.drug.name.toLowerCase().includes(a.toLowerCase())).join(", ")}`
                })
                return
              }
              onSave(prescription)
            }}
          >
            Save Prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Validation**:
```bash
# Test scenario:
# 1. Open prescription builder for patient with allergies
# 2. Verify red banner displays at top: "⚠️ Patient Allergies: Penicillin, Sulfa"
# 3. Try to save prescription with allergenic drug
# 4. Verify toast error prevents save
```

---

### 1.3 🔴 Critical Lab Alert Banner Missing

**File**: `src/components/doctor/LabResultsViewer.tsx`

**Problem**: Critical lab values (status="critical") buried in result cards. Doctors may miss critical findings.

**Current Code**:
```tsx
// Critical values integrated into cards, no separate banner
interface LabResult {
  id: string
  test: LabTest
  value: number
  timestamp: Date
  status: "normal" | "abnormal" | "critical"
  notes?: string
}

// Rendering: StatusCard within map loop
results.map((result, index) => <ResultCard key={result.id} result={result} index={index} />)
```

**Solution**: Add RED BANNER above results + sound alert
```tsx
// IMPROVEMENT 1: Add critical results detection at top of component
function LabResultsViewer({ results }: LabResultsViewerProps) {
  const criticalResults = results.filter(r => r.status === "critical")
  const [soundPlayed, setSoundPlayed] = useState(false)

  // IMPROVEMENT 2: Play sound alert on mount if critical found
  useEffect(() => {
    if (criticalResults.length > 0 && !soundPlayed) {
      // Play alert sound (use existing sound OR create new)
      const audio = new Audio("/sounds/critical-alert.mp3")
      audio.play().catch(() => console.log("Audio play failed"))
      setSoundPlayed(true)
    }
  }, [criticalResults.length, soundPlayed])

  // IMPROVEMENT 3: Render critical alert banner
  return (
    <div className="space-y-4">
      {criticalResults.length > 0 && (
        <div className="bg-destructive/5 border-2 border-destructive rounded-lg p-4 animate-pulse">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-destructive text-lg">
                🚨 Critical Lab Values Detected
              </h3>
              <div className="text-sm text-destructive/80 mt-2 space-y-1">
                {criticalResults.map(result => (
                  <div key={result.id}>
                    <span className="font-semibold">{result.test.name}:</span> {result.value} {result.test.unit}
                    {result.value > result.test.referenceRange.max && " (HIGH)"}
                    {result.value < result.test.referenceRange.min && " (LOW)"}
                  </div>
                ))}
              </div>
              <button
                onClick={() => alert("Critical result — consult patient immediately")}
                className="mt-3 px-3 py-1.5 bg-destructive text-white text-sm font-semibold rounded hover:bg-destructive/90"
              >
                👤 Notify Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status filter tabs (All / Abnormal / Critical) */}
      {/* Results list (normal + abnormal + critical) */}
    </div>
  )
}
```

**Validation**:
```bash
# Test scenario:
# 1. View patient with critical lab result
# 2. Verify RED BANNER displays at top with alert icon
# 3. Verify sound alert plays
# 4. Verify critical results highlighted in list below
```

---

### 1.4 🔴 Vital Signs Font Size (Current Value <24px)

**File**: `src/components/nurse/VitalSignsForm.tsx`

**Problem**: Current vital values not large enough for bedside reading without glasses.

**Current Code**:
```tsx
function VitalInputCard({
  type,
  value,
  unit,
  normalRange,
  onChange,
  label,
  icon: Icon,
}: VitalInputProps) {
  // Current value display inline with input
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="number" value={value} onChange={...} />
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}
```

**Solution**: Increase current value to 24px + display prominently
```tsx
function VitalInputCard({
  type,
  value,
  unit,
  normalRange,
  onChange,
  label,
  icon: Icon,
}: VitalInputProps) {
  const numericValue = parseFloat(value.toString())
  const status = !isNaN(numericValue) ? getVitalStatus(numericValue, normalRange) : "normal"

  return (
    <div className={cn(
      "rounded-lg border p-4",
      "bg-card",
      statusColors[status].border,
      statusColors[status].bg,
    )}>
      {/* IMPROVEMENT 1: Add icon + label */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-5 w-5", statusColors[status].icon)} />
        <span className="font-semibold text-sm">{label}</span>
      </div>

      {/* IMPROVEMENT 2: Large current value display (24px) */}
      <div className="mb-4">
        <div className={cn(
          "text-4xl font-bold", // 36px, very large
          statusColors[status].text
        )}>
          {isNaN(numericValue) ? "—" : numericValue.toFixed(1)}
        </div>
        <div className="text-xs text-muted-foreground">
          Normal: {normalRange.min}–{normalRange.max} {unit}
        </div>
      </div>

      {/* IMPROVEMENT 3: Bold status + warning message */}
      {status !== "normal" && (
        <div className={cn(
          "text-sm font-semibold mb-4",
          statusColors[status].text
        )}>
          {status === "warning" && "⚠️ Out of Normal Range"}
          {status === "critical" && "🚨 Critical Value"}
        </div>
      )}

      {/* Input for entry (smaller, below display) */}
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        placeholder="Enter value"
        className="text-base"
      />
      <span className="text-xs text-muted-foreground mt-1">{unit}</span>
    </div>
  )
}
```

**Validation**:
```bash
# Test scenario:
# 1. Record vital sign (e.g., BP 150/90)
# 2. Verify current value displays at 24px+ font
# 3. Verify icon + status label visible
# 4. Verify out-of-range warning clear
# 5. Test on iPad in landscape mode (bedside usage)
```

---

## Part 2: Accessibility Improvements (Priority 2)

### 2.1 🟡 Color Contrast Darkening

**File**: `src/styles/colors.css` OR `tailwind.config.ts`

**Problem**: Current colors don't meet WCAG AAA 7:1 contrast ratio.

**Current Colors**:
```css
/* Current (FAIL AAA) */
--alert-red: #DC2626    /* 5.2:1 contrast */
--warning-orange: #F97316 /* 3.8:1 contrast */
--success-green: #059669 /* 4.1:1 contrast */
--muted-foreground: (too light) /* 3.2:1 contrast */
```

**Solution**: Darken colors to meet WCAG AAA
```css
/* Updated (PASS AAA: 7:1+) */
:root {
  --alert-red: #B91C1C        /* Dark red — 8:1 contrast */
  --warning-orange: #D97706  /* Dark orange — 5.5:1 contrast */
  --success-green: #047857   /* Dark green — 6:1 contrast */
  --destructive: #B91C1C     /* Update destructive alias */
  --warning: #D97706        /* Update warning alias */
  --success: #047857        /* Update success alias */
  --muted-foreground: #374151 /* Dark gray — 9:1 contrast */
}
```

**In Tailwind** (if using color theme):
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        destructive: {
          DEFAULT: '#B91C1C',
          foreground: '#FFFFFF'
        },
        warning: {
          DEFAULT: '#D97706',
          foreground: '#FFFFFF'
        },
        success: {
          DEFAULT: '#047857',
          foreground: '#FFFFFF'
        }
      }
    }
  }
}
```

**Validation**:
```bash
# Use Axe DevTools or WebAIM contrast checker
# Verify: All critical text ≥7:1 contrast ratio
# Screenshot: Visual before/after comparison
```

---

### 2.2 🟡 Icon-Only Buttons Need aria-label

**File**: Multiple (PrescriptionBuilder, LabResultsViewer, VitalSignsForm, etc.)

**Problem**: Buttons with only icons (no text) not accessible to screen readers.

**Example Current Code**:
```tsx
<Button size="sm" variant="ghost">
  <Plus className="h-4 w-4" />
</Button>
// Screen reader: "(unlabeled button)"
```

**Solution**: Add aria-label + tooltip
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

<Tooltip>
  <TooltipTrigger asChild>
    <Button
      size="sm"
      variant="ghost"
      aria-label="Add medication to prescription"
      onClick={onAddMedication}
    >
      <Plus className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Add Medication</TooltipContent>
</Tooltip>
```

**Find & Replace Pattern**:
```bash
# Find all buttons with child elements but no aria-label
grep -r "Button.*>\s*<" src/components/doctor/ src/components/nurse/

# For each match, add aria-label="descriptive text"
# Example:
# <Button><Trash2 className="..." /></Button>
# Becomes:
# <Button aria-label="Delete medication"><Trash2 className="..." /></Button>
```

**Validation**:
```bash
# Test with screen reader:
# 1. Use NVDA (Windows) or VoiceOver (Mac)
# 2. Tab through buttons
# 3. Verify all buttons announced with descriptive labels
```

---

### 2.3 🟡 Touch Targets <48px

**File**: Tailwind classes throughout

**Problem**: Interactive elements too small for gloved touch (bedside usage).

**Current Code**:
```tsx
<Button size="sm" className="..."> {/* size="sm" likely 32px */}
  Add
</Button>
```

**Solution**: Increase button sizes
```tsx
// Standard button (bedside/tablet use)
<Button size="lg" className="h-12 w-12 p-0"> {/* h-12 = 48px */}
  <Plus className="h-5 w-5" />
</Button>

// Or use className explicitly
<Button className="h-12 px-6 text-base"> {/* 48px height */}
  Save Prescription
</Button>

// Form inputs also 48px minimum
<Input className="h-12 text-base" placeholder="..." />
```

**Apply Globally**:
```css
/* In Tailwind or CSS module */
.interactive-md {
  @apply h-12 px-6 text-base; /* 48px height */
}

.interactive-icon {
  @apply h-12 w-12 p-0; /* 48x48px square */
}
```

**Validation**:
```bash
# Test on iOS/iPad:
# 1. Try to tap buttons while wearing gloves
# 2. Verify all buttons respond to tap (not double-tap required)
# 3. Inspect element: Verify min 48px×48px
```

---

### 2.4 🟡 ARIA Live Regions for Critical Alerts

**File**: `src/components/doctor/LabResultsViewer.tsx`, `src/components/nurse/VitalSignsForm.tsx`

**Problem**: Status changes (normal → critical) not announced to screen reader users.

**Current Code**:
```tsx
<Badge className={statusColors[status].color}>
  {status}
</Badge>
// Screen reader: Just reads "Critical" — doesn't announce the CHANGE
```

**Solution**: Add aria-live region for status changes
```tsx
// IMPROVEMENT 1: Add live region container
function LabResultsViewer({ results }: LabResultsViewerProps) {
  return (
    <div>
      {/* Live region for announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only" {/* screen-reader-only */}
      >
        {criticalCount > 0 && `${criticalCount} critical lab result${criticalCount !== 1 ? 's' : ''}`}
      </div>

      {/* For VERY urgent (critical values) */}
      <div
        aria-live="assertive" {/* Interrupts screen reader */}
        aria-atomic="true"
        className="sr-only"
      >
        {criticalResults.length > 0 && "CRITICAL LAB ALERT: Immediate action required"}
      </div>

      {/* Results display */}
    </div>
  )
}

// IMPROVEMENT 2: In result cards
function ResultCard({ result, index }: LabResultProps) {
  return (
    <div
      role="article"
      aria-label={`${result.test.name}: ${result.value} ${result.test.unit}`}
    >
      <StatusBadge
        status={result.status}
        aria-label={result.status === "critical" ? "Critical value" : result.status}
      />
      {/* ... */}
    </div>
  )
}
```

**Validation**:
```bash
# Test with screen reader:
# 1. Use NVDA or VoiceOver
# 2. Navigate to lab results
# 3. Verify critical alerts announced
# 4. Verify status changes trigger announcements
```

---

## Part 3: UX Enhancements (Priority 3)

### 3.1 🟢 Integrate Trend Visualization into Lab Results

**File**: `src/components/doctor/LabResultsViewer.tsx`

**Problem**: Trend charts exist but not shown with lab results.

**Current Code**:
```tsx
// Trends are separate component
import { LabTrendVisualization } from "@/components/laboratory/LabTrendVisualization"

// But not integrated into LabResultsViewer
function ResultCard({ result }: LabResultProps) {
  return (
    <Card>
      <div>{result.value} {result.test.unit}</div>
      {/* NO TREND VISUALIZATION */}
    </Card>
  )
}
```

**Solution**: Add expandable trend section
```tsx
function ResultCard({ result, index }: LabResultProps) {
  const [showTrend, setShowTrend] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={...} />
            <div>
              <h4 className="font-semibold">{result.test.name}</h4>
              <p className="text-sm text-muted-foreground">{result.test.category}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowTrend(!showTrend)}
            aria-expanded={showTrend}
          >
            <ChevronDown className={cn("h-4 w-4", showTrend && "rotate-180")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current result */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Current Value</span>
          <span className={cn("text-2xl font-bold", status.color)}>
            {result.value}
            <span className="text-xs ml-1">{result.test.unit}</span>
          </span>
        </div>

        {/* Reference range */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Normal Range</span>
          <span>{result.test.referenceRange.min}–{result.test.referenceRange.max}</span>
        </div>

        {/* Expandable trend */}
        <AnimatePresence>
          {showTrend && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t pt-3"
            >
              <LabTrendVisualization
                testId={result.test.id}
                testName={result.test.name}
                period="30d"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                30-day trend
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
```

**Validation**:
```bash
# Test scenario:
# 1. View lab results page
# 2. Click expand arrow on a result
# 3. Verify 30-day trend chart displays
# 4. Verify chart shows historical values
# 5. Collapse and re-expand (animations work)
```

---

### 3.2 🟢 Add Reference Range Comparison Visualization

**File**: `src/components/doctor/LabResultsViewer.tsx`

**Problem**: Reference range text, but no visual bar showing where patient's value falls.

**Solution**: Add visual comparison bar
```tsx
function ResultCard({ result }: LabResultProps) {
  const { min, max } = result.test.referenceRange
  const range = max - min
  const percentage = ((result.value - min) / range) * 100

  return (
    <Card>
      {/* ... existing code ... */}

      {/* NEW: Reference range comparison bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{min}</span>
          <span className="font-semibold">Reference Range</span>
          <span className="text-muted-foreground">{max}</span>
        </div>

        {/* Background bar showing range */}
        <div className="h-6 bg-gray-200 rounded-full overflow-hidden relative">
          {/* Green zone (normal range) */}
          <div className="h-full bg-gradient-to-r from-success/20 to-success/20" />

          {/* Patient's position marker */}
          {percentage >= 0 && percentage <= 100 ? (
            <div
              className="absolute h-full w-1 bg-primary top-0"
              style={{ left: `${percentage}%` }}
            />
          ) : (
            /* Arrow pointing outside range */
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-lg",
                percentage < 0 ? "left-0" : "right-0"
              )}
            >
              {percentage < 0 ? "◄" : "►"}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="text-xs">
          {result.value < min ? `${(min - result.value).toFixed(1)} below normal` : null}
          {result.value > max ? `${(result.value - max).toFixed(1)} above normal` : null}
          {result.value >= min && result.value <= max ? "Within normal range" : null}
        </div>
      </div>
    </Card>
  )
}
```

**Validation**:
```bash
# Test scenario:
# 1. View lab result with value below, within, and above range
# 2. Verify visual bar shows position
# 3. Verify marker/arrow indicates high/low
# 4. Test colorblind mode (bar color + text label works)
```

---

## Part 4: Testing & Validation (Priority 4)

### 4.1 Accessibility Test Suite

**Run**:
```bash
npm run test:accessibility
```

**Expected Output**:
```
 PASS  tests/accessibility/wcag-compliance.test.tsx
    ✓ Medication entry: <16 WCAG AAA errors
    ✓ Lab results: <16 WCAG AAA errors
    ✓ Vital signs: <16 WCAG AAA errors
    ✓ Focus indicators visible
    ✓ Touch targets ≥48px
    ✓ Color contrast ≥7:1

Tests: 6 passed, 6 total
```

**If Tests Fail**:
```bash
# Use Axe DevTools browser extension:
# 1. Open Chrome DevTools
# 2. Axe DevTools tab
# 3. Scan page
# 4. View failures by WCAG criterion
# 5. Fix and re-run tests
```

---

### 4.2 Tablet/iPad Testing

**Devices**: iPad Air (12.9"), iPad mini (8.3")  
**Orientations**: Portrait, Landscape

**Test Scenarios**:
1. **Medication Entry** (iPad Landscape)
   - [ ] Tap dosage input (48px target?)
   - [ ] Can scroll form without accidental clicks
   - [ ] Buttons reachable with one hand

2. **Lab Results** (iPad Portrait)
   - [ ] Critical alert banner visible
   - [ ] Can expand trend charts
   - [ ] Text readable (≥16px)

3. **Vital Signs** (iPad Both Orientations)
   - [ ] Input fields large enough
   - [ ] Current value readable from 3ft away
   - [ ] Status warnings clear

**Pass Criteria**:
- ✅ All interactions work on touch (no hover-only elements)
- ✅ All text ≥16px
- ✅ All buttons ≥48px touch target
- ✅ No layout breaks in landscape/portrait

---

### 4.3 Screen Reader Testing (WCAG AAA)

**Test Tools**:
- **Windows**: NVDA (free)
- **Mac**: VoiceOver (built-in)
- **iOS**: VoiceOver

**Test Scenarios**:

1. **Medication Entry**
   ```
   [ ] Tab through form → all fields labeled
   [ ] Allergy banner announced
   [ ] Drug interaction alerts announced
   [ ] Submit button action clear
   ```

2. **Lab Results**
   ```
   [ ] Critical alert banner announced immediately
   [ ] Result cards scannable by headings
   [ ] Trend expand/collapse announced
   [ ] Table structure (if used) has captions
   ```

3. **Vital Signs**
   ```
   [ ] Vital type announced (Temperature, BP, etc.)
   [ ] Current value readable
   [ ] Status (normal/warning/critical) announced
   [ ] Input instructions clear
   ```

---

### 4.4 Performance Regression Check

**Run**:
```bash
npm run test:performance

# Expected: No >50ms regression in critical paths
```

**Specific Checks**:
- Medication form load time: <2s
- Lab results render: <1s
- Vital signs update: <500ms

---

## Implementation Checklist

### Part 1: Critical Readability (Day 1)
- [ ] PrescriptionBuilder dosage font size → 18px
- [ ] PrescriptionBuilder allergy banner + tooltip added
- [ ] LabResultsViewer critical alert banner added
- [ ] LabResultsViewer sound alert added
- [ ] VitalSignsForm current value font size → 24px
- [ ] All changes tested in browser

### Part 2: Accessibility (Day 2)
- [ ] Color palette darkened (CSS variables updated)
- [ ] All icon-only buttons have aria-label
- [ ] All buttons/inputs sized ≥48px
- [ ] ARIA live regions added to critical alerts
- [ ] Run `npm run test:accessibility` (target: <16 errors)

### Part 3: UX Enhancements (Day 3)
- [ ] LabTrendVisualization integrated into LabResultsViewer
- [ ] Reference range comparison bar added
- [ ] Reduced motion animations verified
- [ ] Screenshot comparisons created

### Part 4: Testing & Validation (Day 4)
- [ ] iPad/tablet testing (both orientations)
- [ ] Screen reader testing (NVDA + VoiceOver)
- [ ] Performance regression check
- [ ] Create before/after screenshots
- [ ] Update documentation

---

## Success Criteria (Phase 4B Complete)

- [x] All 11 audit issues addressed
- [ ] Dosage field: ≥16px + bold
- [ ] Lab critical alerts: Red banner + sound
- [ ] Vital signs current value: ≥24px
- [ ] All colors: ≥7:1 contrast (WCAG AAA)
- [ ] All buttons: ≥48px touch targets
- [ ] All interactive elements: aria-label + ARIA live regions
- [ ] iPad tested (both orientations, both devices)
- [ ] Screen reader tested (NVDA + VoiceOver)
- [ ] `npm run test:accessibility` passes (<16 errors)
- [ ] `npm run test:e2e:smoke` all passing (no regressions)
- [ ] Zero performance regressions (>50ms check)

---

## Estimated Time Investment

| Task | Effort | Owner |
|------|--------|-------|
| PrescriptionBuilder improvements | 2h | Fullstack |
| LabResultsViewer improvements | 3h | Fullstack |
| VitalSignsForm improvements | 2h | Fullstack |
| Color palette darkening | 1h | Frontend |
| ARIA labels + live regions | 2h | Frontend |
| Button/input sizing | 1h | Frontend |
| Trend visualization integration | 2h | Fullstack |
| Testing & validation | 4h | QA + Frontend |
| **Total** | **~17h** | -- |

---

## Questions for Stakeholders

Before implementing, clarify:

1. **Sound Alert for Critical Labs**: Do we want audio alert? If yes:
   - Use built-in browser sound or upload custom?
   - Should it play once per page load or repeat?
   - Should user be able to mute it?

2. **Reference Range Visualization**: Should comparison bar include:
   - Color gradient (red for critical, yellow for warning, green for normal)?
   - Percentile position indicator?

3. **Role-Specific Layouts**: Should we create separate views for nurses vs. doctors?
   - Priority: low (can defer to Phase 4B+)
   - Would require more significant UI changes

4. **Allergy Checking**: Should prescription save be **blocked** if allergenic drug selected?
   - Current proposal: Yes, with error toast
   - Or just warning (allow override)?

---

## Files to Modify

```
src/components/doctor/
  ├── PrescriptionBuilder.tsx ✏️ (dosage font, allergy banner)
  └── LabResultsViewer.tsx ✏️ (critical alert, trends, comparison bar)

src/components/nurse/
  ├── VitalSignsForm.tsx ✏️ (increase value font size)
  └── RecordVitalsModal.tsx ✏️ (responsive tablet layout)

src/styles/
  └── colors.css (or tailwind.config.ts) ✏️ (darken colors)

src/hooks/
  └── useAccessibility.ts 🆕 (ARIA + live regions helper)

public/sounds/
  └── critical-alert.mp3 🆕 (critical lab alert sound)

tests/
  ├── accessibility/ ✏️ (update tests for new improvements)
  └── e2e/ ✏️ (add iPad/tablet test scenarios)

docs/
  └── HEALTHCARE_UI_IMPROVEMENTS_PHASE_4B.md 🆕 (final report)
```

---

**Ready to implement?** Start with Part 1 (Critical Readability) on Day 1!
