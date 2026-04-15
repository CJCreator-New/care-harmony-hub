import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateNextOccurrence,
  generateOccurrences,
  detectSchedulingConflicts,
  applyExceptions,
  calculateNoShowRate,
  RecurrenceType,
  RecurrenceConfig,
} from "@/lib/recurrence.utils";
import { addDays, addWeeks, addMonths } from "date-fns";

describe("Recurrence Utilities", () => {
  const baseDate = new Date("2026-04-15T10:00:00Z");

  describe("calculateNextOccurrence", () => {
    it("should calculate daily recurrence", () => {
      const config: RecurrenceConfig = {
        type: RecurrenceType.DAILY,
        rule: { interval: 1 },
        startDate: baseDate,
      };

      const next = calculateNextOccurrence(baseDate, config);
      expect(next).toEqual(addDays(baseDate, 1));
    });

    it("should calculate weekly recurrence", () => {
      const config: RecurrenceConfig = {
        type: RecurrenceType.WEEKLY,
        rule: { interval: 1 },
        startDate: baseDate,
      };

      const next = calculateNextOccurrence(baseDate, config);
      expect(next).toEqual(addWeeks(baseDate, 1));
    });

    it("should calculate bi-weekly recurrence", () => {
      const config: RecurrenceConfig = {
        type: RecurrenceType.BI_WEEKLY,
        rule: {},
        startDate: baseDate,
      };

      const next = calculateNextOccurrence(baseDate, config);
      expect(next).toEqual(addWeeks(baseDate, 2));
    });

    it("should calculate monthly recurrence", () => {
      const config: RecurrenceConfig = {
        type: RecurrenceType.MONTHLY,
        rule: { interval: 1 },
        startDate: baseDate,
      };

      const next = calculateNextOccurrence(baseDate, config);
      expect(next).toEqual(addMonths(baseDate, 1));
    });

    it("should respect end date", () => {
      const endDate = addDays(baseDate, 5);
      const config: RecurrenceConfig = {
        type: RecurrenceType.DAILY,
        rule: {},
        startDate: baseDate,
        endDate,
      };

      const current = addDays(baseDate, 4);
      const next = calculateNextOccurrence(current, config);
      expect(next).toBeNull();
    });

    it("should skip exceptions", () => {
      const exceptionDate = addDays(baseDate, 1);
      const config: RecurrenceConfig = {
        type: RecurrenceType.DAILY,
        rule: {},
        startDate: baseDate,
        exceptions: [exceptionDate],
      };

      const next = calculateNextOccurrence(baseDate, config);
      expect(next).toEqual(addDays(baseDate, 2));
    });
  });

  describe("generateOccurrences", () => {
    it("should generate daily occurrences", () => {
      const config: RecurrenceConfig = {
        type: RecurrenceType.DAILY,
        rule: { interval: 1 },
        startDate: baseDate,
      };

      const occurrences = generateOccurrences(baseDate, config, 5);
      expect(occurrences).toHaveLength(5);
      expect(occurrences[0]).toEqual(baseDate);
      expect(occurrences[1]).toEqual(addDays(baseDate, 1));
      expect(occurrences[4]).toEqual(addDays(baseDate, 4));
    });

    it("should respect max occurrences", () => {
      const config: RecurrenceConfig = {
        type: RecurrenceType.WEEKLY,
        rule: {},
        startDate: baseDate,
        maxOccurrences: 3,
      };

      const occurrences = generateOccurrences(baseDate, config, 10);
      expect(occurrences).toHaveLength(3);
    });

    it("should respect end date", () => {
      const endDate = addDays(baseDate, 15);
      const config: RecurrenceConfig = {
        type: RecurrenceType.WEEKLY,
        rule: {},
        startDate: baseDate,
        endDate,
      };

      const occurrences = generateOccurrences(baseDate, config, 10);
      expect(occurrences.length).toBeLessThanOrEqual(3);
    });

    it("should apply exceptions", () => {
      const exception = addDays(baseDate, 1);
      const config: RecurrenceConfig = {
        type: RecurrenceType.DAILY,
        rule: {},
        startDate: baseDate,
        exceptions: [exception],
      };

      const occurrences = generateOccurrences(baseDate, config, 3);
      expect(occurrences).toHaveLength(3);
      expect(occurrences.some(d => d.toDateString() === exception.toDateString())).toBe(false);
    });
  });

  describe("detectSchedulingConflicts", () => {
    const existingAppts = [
      { start: new Date("2026-04-15T10:00:00Z"), end: new Date("2026-04-15T10:30:00Z") },
      { start: new Date("2026-04-15T14:00:00Z"), end: new Date("2026-04-15T14:30:00Z") },
    ];

    it("should detect conflict during appointment", () => {
      const newDate = new Date("2026-04-15T10:15:00Z");
      const hasConflict = detectSchedulingConflicts(newDate, existingAppts);
      expect(hasConflict).toBe(true);
    });

    it("should detect no conflict before appointment", () => {
      const newDate = new Date("2026-04-15T09:30:00Z");
      const hasConflict = detectSchedulingConflicts(newDate, existingAppts);
      expect(hasConflict).toBe(false);
    });

    it("should detect no conflict after appointment", () => {
      const newDate = new Date("2026-04-15T11:00:00Z");
      const hasConflict = detectSchedulingConflicts(newDate, existingAppts);
      expect(hasConflict).toBe(false);
    });

    it("should detect no conflict on different day", () => {
      const newDate = new Date("2026-04-16T10:15:00Z");
      const hasConflict = detectSchedulingConflicts(newDate, existingAppts);
      expect(hasConflict).toBe(false);
    });
  });

  describe("applyExceptions", () => {
    it("should remove exception dates", () => {
      const dates = [
        baseDate,
        addDays(baseDate, 1),
        addDays(baseDate, 2),
      ];
      const exceptions = [addDays(baseDate, 1)];

      const result = applyExceptions(dates, exceptions);
      expect(result).toHaveLength(2);
      expect(result.some(d => d.toDateString() === addDays(baseDate, 1).toDateString())).toBe(false);
    });

    it("should handle multiple exceptions", () => {
      const dates = [
        baseDate,
        addDays(baseDate, 1),
        addDays(baseDate, 2),
        addDays(baseDate, 3),
      ];
      const exceptions = [addDays(baseDate, 1), addDays(baseDate, 3)];

      const result = applyExceptions(dates, exceptions);
      expect(result).toHaveLength(2);
    });
  });

  describe("calculateNoShowRate", () => {
    it("should calculate rate correctly", () => {
      const rate = calculateNoShowRate(10, 3);
      expect(rate).toBe(30);
    });

    it("should handle zero total", () => {
      const rate = calculateNoShowRate(0, 3);
      expect(rate).toBe(0);
    });

    it("should handle 100% no-show", () => {
      const rate = calculateNoShowRate(5, 5);
      expect(rate).toBe(100);
    });

    it("should handle 0% no-show", () => {
      const rate = calculateNoShowRate(5, 0);
      expect(rate).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle end-of-month dates for monthly recurrence", () => {
      const eomDate = new Date("2026-01-31T10:00:00Z");
      const config: RecurrenceConfig = {
        type: RecurrenceType.MONTHLY,
        rule: {},
        startDate: eomDate,
      };

      const next = calculateNextOccurrence(eomDate, config);
      // Should move to Feb 28 (no Feb 31)
      expect(next.getMonth()).toBe(1); // February
    });

    it("should handle DST transitions for weekly recurrence", () => {
      // US DST occurs on 2nd Sunday of March
      const beforeDST = new Date("2026-03-08T10:00:00Z");
      const config: RecurrenceConfig = {
        type: RecurrenceType.WEEKLY,
        rule: {},
        startDate: beforeDST,
      };

      const next = calculateNextOccurrence(beforeDST, config);
      expect(next.getHours()).toBe(10); // Should maintain time
    });

    it("should handle no-show rate with large numbers", () => {
      const rate = calculateNoShowRate(1000, 250);
      expect(rate).toBe(25);
    });
  });
});
