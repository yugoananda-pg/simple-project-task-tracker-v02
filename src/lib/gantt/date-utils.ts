import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type GanttDateRange = {
  start: Date;
  end: Date;
  /** True when one or both endpoints were missing and a single-day fallback was applied. */
  missingEndpoint: boolean;
  /** True when start was after end and the range was clamped. */
  wasInverted: boolean;
  /** True when input could not be parsed at all. */
  invalid: boolean;
  /**
   * When true, `end` is an exclusive boundary (bar stops at the start of that day).
   * Used so open Actual bars end exactly on the Today line instead of past it.
   */
  endExclusive?: boolean;
};

export type GanttTimelineScale = "week" | "month";

export type GanttTimelineColumn = {
  id: string;
  label: string;
  subLabel?: string;
  start: Date;
  end: Date;
};

const AU_DATE_FORMAT = "dd/MM/yyyy";

/** Parse a task date string (YYYY-MM-DD or ISO prefix) as a local calendar day. */
export function parseTaskDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;

  const datePart = value.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Construct as local calendar day — avoid UTC parseISO shift in negative offsets.
  const parsed = new Date(year, month - 1, day);
  if (
    !isValid(parsed) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return startOfDay(parsed);
}

/**
 * Normalise a start/end pair for Gantt rendering.
 * Missing endpoints collapse to the available date; inverted ranges are clamped.
 */
export function normaliseDateRange(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
): GanttDateRange | null {
  const start = parseTaskDate(startValue);
  const end = parseTaskDate(endValue);

  if (!start && !end) return null;

  if (start && !end) {
    return {
      start,
      end: start,
      missingEndpoint: true,
      wasInverted: false,
      invalid: false,
    };
  }

  if (!start && end) {
    return {
      start: end,
      end,
      missingEndpoint: true,
      wasInverted: false,
      invalid: false,
    };
  }

  if (start && end) {
    if (start.getTime() <= end.getTime()) {
      return {
        start,
        end,
        missingEndpoint: false,
        wasInverted: false,
        invalid: false,
      };
    }

    return {
      start: end,
      end: start,
      missingEndpoint: false,
      wasInverted: true,
      invalid: false,
    };
  }

  return {
    start: startOfDay(new Date()),
    end: startOfDay(new Date()),
    missingEndpoint: true,
    wasInverted: false,
    invalid: true,
  };
}

export function formatAuDate(value: Date | string | null | undefined): string {
  if (!value) return "—";

  const date = typeof value === "string" ? parseTaskDate(value) : value;
  if (!date) return "—";

  return format(date, AU_DATE_FORMAT);
}

export function formatAuDateRange(range: GanttDateRange | null): string {
  if (!range || range.invalid) return "No valid dates";
  return `${formatAuDate(range.start)} – ${formatAuDate(range.end)}`;
}

export function isTaskOverdue(input: {
  status: string;
  initialDueDate?: string | null;
  updatedDueDate?: string | null;
  /** @deprecated Prefer initialDueDate / updatedDueDate */
  plannedDueDate?: string | null;
}): boolean {
  if (input.status === "done") return false;
  const due = parseTaskDate(
    input.updatedDueDate ?? input.initialDueDate ?? input.plannedDueDate ?? null,
  );
  if (!due) return false;
  return due < startOfDay(new Date());
}

/**
 * Overall Gantt window: earliest→latest task dates, always including today,
 * with `paddingDays` margin before the minimum and after the maximum.
 */
export function computeTimelineBounds(
  dates: Array<Date | null | undefined>,
  paddingDays = 7,
): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  const valid = dates
    .filter((date): date is Date => date instanceof Date && isValid(date))
    .map((date) => startOfDay(date));

  const span = valid.length === 0 ? [today] : [...valid, today];
  const timelineMinDate = minDate(span);
  const timelineMaxDate = maxDate(span);

  return {
    start: addDays(timelineMinDate, -paddingDays),
    end: addDays(timelineMaxDate, paddingDays),
  };
}

export function chooseTimelineScale(start: Date, end: Date): GanttTimelineScale {
  const spanDays = differenceInCalendarDays(end, start) + 1;
  return spanDays > 84 ? "month" : "week";
}

export function buildTimelineColumns(
  start: Date,
  end: Date,
  scale: GanttTimelineScale,
): GanttTimelineColumn[] {
  const columns: GanttTimelineColumn[] = [];

  if (scale === "week") {
    let cursor = startOfWeek(startOfDay(start), { weekStartsOn: 1 });
    const last = endOfWeek(startOfDay(end), { weekStartsOn: 1 });

    while (cursor.getTime() <= last.getTime()) {
      const columnStart = cursor;
      const columnEnd = startOfDay(endOfWeek(cursor, { weekStartsOn: 1 }));
      columns.push({
        id: format(columnStart, "yyyy-MM-dd"),
        label: format(columnStart, "d MMM"),
        subLabel: format(columnStart, "yyyy"),
        start: columnStart,
        end: columnEnd,
      });
      // Advance by calendar day — never addDays(endOfWeek) which keeps 23:59:59.
      cursor = addDays(columnEnd, 1);
    }

    return columns;
  }

  let cursor = startOfMonth(startOfDay(start));
  const last = startOfMonth(startOfDay(end));

  while (cursor.getTime() <= last.getTime()) {
    const columnStart = cursor;
    // Store end as start-of-day of the last calendar day (not 23:59:59).
    const columnEnd = startOfDay(endOfMonth(cursor));
    columns.push({
      id: format(columnStart, "yyyy-MM"),
      label: format(columnStart, "MMM"),
      subLabel: format(columnStart, "yyyy"),
      start: columnStart,
      end: columnEnd,
    });
    // addMonths keeps 00:00 — avoids the addDays(endOfMonth) 23:59:59 drift
    // that previously started Aug/Sep/Oct columns at 23:59:59.
    cursor = addMonths(cursor, 1);
  }

  return columns;
}

/**
 * Continuous timeline span in ms: [startOfDay(min), startOfDay(max) + 1 day).
 * The exclusive end gives the last calendar day a full day’s width.
 */
export function getTimelineSpanMs(
  minDateBound: Date,
  maxDateBound: Date,
): { minMs: number; maxExclusiveMs: number; spanMs: number } {
  const minMs = startOfDay(minDateBound).getTime();
  const maxExclusiveMs = addDays(startOfDay(maxDateBound), 1).getTime();
  const spanMs = Math.max(maxExclusiveMs - minMs, 1);
  return { minMs, maxExclusiveMs, spanMs };
}

/**
 * Percentage offset of a date within the timeline span.
 * `left = ((date − min) / (maxExclusive − min)) × 100`
 */
export function getTimelineOffsetPercent(
  date: Date,
  minDateBound: Date,
  maxDateBound: Date,
): number {
  const { minMs, spanMs } = getTimelineSpanMs(minDateBound, maxDateBound);
  const dateMs = startOfDay(date).getTime();
  const pct = ((dateMs - minMs) / spanMs) * 100;
  return Math.max(0, Math.min(pct, 100));
}

/**
 * Pixel offset of a date across unequally sized columns (e.g. months).
 * Places 8 Sep inside the September column at day 8 / daysInMonth — never on
 * the Sep/Oct boundary.
 */
export function getTimelineOffsetPx(
  date: Date,
  columns: GanttTimelineColumn[],
  columnWidths: number[],
): number {
  if (columns.length === 0 || columnWidths.length === 0) return 0;

  const day = startOfDay(date);
  let x = 0;

  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index]!;
    const width = columnWidths[index] ?? 0;
    const colStart = startOfDay(column.start);
    const colEnd = startOfDay(column.end);
    const daysInColumn = Math.max(
      differenceInCalendarDays(colEnd, colStart) + 1,
      1,
    );

    if (day < colStart) {
      return x;
    }

    if (day <= colEnd) {
      const dayIndex = differenceInCalendarDays(day, colStart);
      return x + (dayIndex / daysInColumn) * width;
    }

    x += width;
  }

  return x;
}

/**
 * Bar left/width in pixels using the same column geometry as the Today line.
 * Inclusive bars extend through the end calendar day; exclusive bars stop at
 * the start of `endDate` (open Actual → Today).
 */
export function getBarPositionPx(
  startDate: Date,
  endDate: Date,
  columns: GanttTimelineColumn[],
  columnWidths: number[],
  options?: { inclusiveEnd?: boolean; exactDayWidth?: boolean },
): {
  leftPx: number;
  widthPx: number;
  isSingleDay: boolean;
} {
  const inclusiveEnd = options?.inclusiveEnd ?? true;
  const exactDayWidth = options?.exactDayWidth ?? false;
  const timelineWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  let start = startOfDay(startDate);
  let end = startOfDay(endDate);
  if (end.getTime() < start.getTime()) {
    const swap = start;
    start = end;
    end = swap;
  }

  if (columns.length === 0) {
    return { leftPx: 0, widthPx: 0, isSingleDay: true };
  }

  const rangeStart = startOfDay(columns[0]!.start);
  const rangeEnd = startOfDay(columns[columns.length - 1]!.end);
  if (start.getTime() < rangeStart.getTime()) start = rangeStart;
  if (start.getTime() > rangeEnd.getTime()) start = rangeEnd;
  if (end.getTime() < rangeStart.getTime()) end = rangeStart;
  if (end.getTime() > rangeEnd.getTime()) end = rangeEnd;

  const isSingleDay = differenceInCalendarDays(end, start) === 0;
  const leftPx = getTimelineOffsetPx(start, columns, columnWidths);
  const rightPx = inclusiveEnd
    ? getTimelineOffsetPx(addDays(end, 1), columns, columnWidths)
    : getTimelineOffsetPx(end, columns, columnWidths);

  let widthPx = Math.max(rightPx - leftPx, 0);
  if (!exactDayWidth || !isSingleDay) {
    if (widthPx > 0) {
      widthPx = Math.max(widthPx, 8);
    } else if (!exactDayWidth) {
      widthPx = 8;
    }
  }

  widthPx = Math.min(widthPx, Math.max(timelineWidth - leftPx, 0));

  return { leftPx, widthPx, isSingleDay };
}

/**
 * Bar geometry relative to the computed timeline bounds (percentage form).
 * Prefer getBarPositionPx when rendering against day-proportional columns.
 */
export function getBarPosition(
  startDate: Date,
  endDate: Date,
  minDateBound: Date,
  maxDateBound: Date,
  options?: { inclusiveEnd?: boolean; exactDayWidth?: boolean },
): { leftPercent: number; widthPercent: number; isSingleDay: boolean } {
  const inclusiveEnd = options?.inclusiveEnd ?? true;
  const exactDayWidth = options?.exactDayWidth ?? false;
  const { minMs, maxExclusiveMs, spanMs } = getTimelineSpanMs(
    minDateBound,
    maxDateBound,
  );

  let start = startOfDay(startDate);
  let end = startOfDay(endDate);
  if (end.getTime() < start.getTime()) {
    const swap = start;
    start = end;
    end = swap;
  }

  const timelineStartMs = minMs;
  const timelineEndMs = maxExclusiveMs - 1;
  const clampedStartMs = Math.min(
    Math.max(start.getTime(), timelineStartMs),
    timelineEndMs,
  );
  const clampedEndMs = Math.min(
    Math.max(end.getTime(), timelineStartMs),
    timelineEndMs,
  );

  const isSingleDay =
    differenceInCalendarDays(new Date(clampedEndMs), new Date(clampedStartMs)) ===
    0;

  const leftPercent = ((clampedStartMs - minMs) / spanMs) * 100;
  const endEdgeMs = inclusiveEnd
    ? addDays(startOfDay(new Date(clampedEndMs)), 1).getTime()
    : startOfDay(new Date(clampedEndMs)).getTime();
  const widthMs = Math.max(endEdgeMs - clampedStartMs, 0);
  let widthPercent = (widthMs / spanMs) * 100;
  widthPercent = Math.min(widthPercent, 100 - leftPercent);

  if (!exactDayWidth || !isSingleDay) {
    if (widthPercent > 0) {
      widthPercent = Math.max(0.75, widthPercent);
    } else if (!exactDayWidth) {
      widthPercent = 0.75;
    }
  }

  return {
    leftPercent: Math.max(0, Math.min(leftPercent, 100)),
    widthPercent: Math.max(0, Math.min(widthPercent, 100)),
    isSingleDay,
  };
}

/**
 * Actual progress bar range:
 * - Only rendered when actualStartDate exists (task has actually started).
 * - Incomplete (todo/doing): actualStartDate → today (exclusive end on Today line).
 * - Done: actualStartDate → actualCompletionDate (or start if completion missing).
 * Incomplete ends are always clamped with min(end, today).
 */
export function getActualDateRange(
  task: {
    status: string;
    actualStartDate?: string | null;
    actualCompletionDate?: string | null;
    updatedDueDate?: string | null;
    initialDueDate?: string | null;
  },
  today: Date = startOfDay(new Date()),
): GanttDateRange | null {
  const start = parseTaskDate(task.actualStartDate);
  // Actual bar only shows once work has actually started.
  if (!start) return null;

  const todayStart = startOfDay(today);

  if (task.status === "done") {
    const completion = parseTaskDate(task.actualCompletionDate);
    const end = completion ?? start;
    const orderedEnd = end.getTime() < start.getTime() ? start : end;
    return {
      start,
      end: orderedEnd,
      missingEndpoint: !completion,
      wasInverted: end.getTime() < start.getTime(),
      invalid: false,
      endExclusive: false,
    };
  }

  // Incomplete: never extend past today.
  const clampedStart =
    start.getTime() > todayStart.getTime() ? todayStart : start;
  const clampedEnd =
    todayStart.getTime() < clampedStart.getTime()
      ? clampedStart
      : todayStart;

  return {
    start: clampedStart,
    end: clampedEnd,
    missingEndpoint: true,
    wasInverted: false,
    invalid: false,
    endExclusive: true,
  };
}

/** @deprecated Prefer getBarPosition — kept for call-site compatibility. */
export function barMetrics(
  range: GanttDateRange,
  timelineStart: Date,
  timelineEnd: Date,
): { leftPercent: number; widthPercent: number } {
  const { leftPercent, widthPercent } = getBarPosition(
    range.start,
    range.end,
    timelineStart,
    timelineEnd,
    { inclusiveEnd: !range.endExclusive },
  );
  return { leftPercent, widthPercent };
}
