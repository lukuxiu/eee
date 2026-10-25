import { describe, it, expect } from 'vitest';
import {
  createDefaultStudyRecord,
  processRecall,
  revokeAndCorrect,
  calculateIntervalDays,
  isWordDue,
  isWordOverdue,
  MS_PER_DAY,
  MS_PER_HOUR,
} from './spacedRepetition';

describe('Spaced Repetition SM-2 & Recall Engine', () => {
  const baseTime = 1700000000000;

  it('correctly schedules first study with "know"', () => {
    const record = createDefaultStudyRecord('e1-test', 'test', 'e1');
    const updated = processRecall(record, { rating: 'know', mode: 'new', now: baseTime });

    expect(updated.consecutiveCorrect).toBe(1);
    expect(updated.reviewCount).toBe(1);
    expect(updated.errorCount).toBe(0);
    expect(updated.intervalDays).toBe(1.0);
    expect(updated.nextReviewTime).toBe(baseTime + 1.0 * MS_PER_DAY);
    expect(updated.history.length).toBe(1);
    expect(updated.history[0].rating).toBe('know');
  });

  it('progressively extends intervals on consecutive "know" recalls', () => {
    let record = createDefaultStudyRecord('e1-test', 'test', 'e1');
    // 1st recall
    record = processRecall(record, { rating: 'know', mode: 'new', now: baseTime });
    expect(record.intervalDays).toBe(1.0);

    // 2nd recall
    record = processRecall(record, { rating: 'know', mode: 'due', now: baseTime + 1 * MS_PER_DAY });
    expect(record.consecutiveCorrect).toBe(2);
    expect(record.intervalDays).toBe(3.0);

    // 3rd recall
    record = processRecall(record, { rating: 'know', mode: 'due', now: baseTime + 4 * MS_PER_DAY });
    expect(record.consecutiveCorrect).toBe(3);
    expect(record.intervalDays).toBeGreaterThanOrEqual(7.0);

    // 4th recall
    record = processRecall(record, { rating: 'know', mode: 'due', now: baseTime + 11 * MS_PER_DAY });
    expect(record.consecutiveCorrect).toBe(4);
    expect(record.intervalDays).toBeGreaterThanOrEqual(15.0);
  });

  it('resets consecutive correct and schedules 15min re-test on "dont_know"', () => {
    let record = createDefaultStudyRecord('e1-test', 'test', 'e1');
    record = processRecall(record, { rating: 'know', mode: 'new', now: baseTime });
    expect(record.consecutiveCorrect).toBe(1);

    // User forgets on next review
    record = processRecall(record, { rating: 'dont_know', mode: 'due', now: baseTime + 1 * MS_PER_DAY });
    expect(record.consecutiveCorrect).toBe(0);
    expect(record.errorCount).toBe(1);
    expect(record.intervalDays).toBeCloseTo(15 / (24 * 60), 4);
    expect(record.masteryLevel).toBe(1);
  });

  it('executes "记错了" rollback accurately and prevents duplicate penalty', () => {
    let record = createDefaultStudyRecord('e1-test', 'test', 'e1');
    // User studies word and initially presses "认识"
    record = processRecall(record, { rating: 'know', mode: 'new', now: baseTime });
    expect(record.consecutiveCorrect).toBe(1);
    expect(record.errorCount).toBe(0);
    expect(record.intervalDays).toBe(1.0);

    // User realizes they guessed or remembered wrong and clicks "记错了"
    const corrTime = baseTime + 2000;
    const { updatedRecord, success } = revokeAndCorrect(record, corrTime);

    expect(success).toBe(true);
    expect(updatedRecord.consecutiveCorrect).toBe(0); // Success revoked
    expect(updatedRecord.errorCount).toBe(1); // Error recorded
    expect(updatedRecord.intervalDays).toBeCloseTo(15 / (24 * 60), 4); // Short interval re-test
    expect(updatedRecord.masteryLevel).toBe(1);
    expect(updatedRecord.history.length).toBe(1);
    expect(updatedRecord.history[0].wasCorrected).toBe(true);
    expect(updatedRecord.history[0].originalRating).toBe('know');
    expect(updatedRecord.history[0].rating).toBe('dont_know');

    // Duplicate click protection: Clicking "记错了" again immediately must be rejected!
    const secondTry = revokeAndCorrect(updatedRecord, corrTime + 100);
    expect(secondTry.success).toBe(false);
    expect(secondTry.updatedRecord.errorCount).toBe(1); // Did not double-increment!
  });

  it('correctly identifies due and overdue words', () => {
    let record = createDefaultStudyRecord('e1-test', 'test', 'e1');
    record = processRecall(record, { rating: 'know', mode: 'new', now: baseTime });
    // nextReviewTime is baseTime + 1 day
    expect(isWordDue(record, baseTime + 12 * MS_PER_HOUR)).toBe(false);
    expect(isWordDue(record, baseTime + 25 * MS_PER_HOUR)).toBe(true);
    expect(isWordOverdue(record, baseTime + 25 * MS_PER_HOUR)).toBe(false); // only 1h overdue
    expect(isWordOverdue(record, baseTime + 37 * MS_PER_HOUR)).toBe(true); // 13h overdue > 12h
  });

  it('handles multi-definition sense mastery independently', () => {
    let record = createDefaultStudyRecord('e1-poly', 'poly', 'e1');
    // Sense 1: user knows
    record = processRecall(record, { rating: 'know', mode: 'new', senseId: 'poly-s1', now: baseTime });
    // Sense 2: user does not know
    record = processRecall(record, { rating: 'dont_know', mode: 'new', senseId: 'poly-s2', now: baseTime });

    expect(record.senseMasteries['poly-s1'].consecutiveCorrect).toBe(1);
    expect(record.senseMasteries['poly-s1'].errorCount).toBe(0);
    expect(record.senseMasteries['poly-s2'].consecutiveCorrect).toBe(0);
    expect(record.senseMasteries['poly-s2'].errorCount).toBe(1);
  });
});
