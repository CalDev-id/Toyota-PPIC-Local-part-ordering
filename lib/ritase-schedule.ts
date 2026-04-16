export type RitaseDayNight = "DAY" | "NIGHT";
export type RitaseType = "Junbiki" | "Pallet" | "Extra";

export type RitaseScheduleItem = {
  ritase: number;
  type: RitaseType;
  time: string;
  label: string;
};

export const RITASE_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1);

export const RITASE_SCHEDULES: Record<RitaseDayNight, RitaseScheduleItem[]> = {
  DAY: [
    buildScheduleItem(1, "Junbiki", "07:30 - 08:00"),
    buildScheduleItem(2, "Pallet", "08:20 - 08:40"),
    buildScheduleItem(3, "Junbiki", "09:40 - 10:10"),
    buildScheduleItem(4, "Junbiki", "11:30 - 13:10"),
    buildScheduleItem(5, "Junbiki", "14:15 - 14:30"),
    buildScheduleItem(6, "Junbiki", "16:50 - 17:10"),
    buildScheduleItem(7, "Extra", ""),
  ],
  NIGHT: [
    buildScheduleItem(8, "Junbiki", "20:15 - 20:30"),
    buildScheduleItem(9, "Pallet", "20:30 - 20:50"),
    buildScheduleItem(10, "Junbiki", "22:10 - 22:20"),
    buildScheduleItem(11, "Junbiki", "00:30 - 00:40"),
    buildScheduleItem(12, "Junbiki", "02:15 - 02:30"),
    buildScheduleItem(13, "Junbiki", "04:30 - 04:40"),
    buildScheduleItem(14, "Extra", ""),
  ],
};

export function normalizeRitaseDayNight(value: string | null | undefined): RitaseDayNight | null {
  const normalized = value?.trim().toUpperCase();
  return normalized === "DAY" || normalized === "NIGHT" ? normalized : null;
}

export function getRitaseSchedule(dayNight: string | null | undefined) {
  const normalized = normalizeRitaseDayNight(dayNight);
  return normalized ? RITASE_SCHEDULES[normalized] : [];
}

export function getNextRitaseCard(dayNight: string | null | undefined, orderCount: number): RitaseScheduleItem | null {
  const schedule = getRitaseSchedule(dayNight);
  if (schedule.length === 0) {
    return null;
  }

  const scheduleItem = schedule[orderCount];
  if (scheduleItem) {
    return scheduleItem;
  }

  const lastRitase = schedule[schedule.length - 1]?.ritase ?? 0;
  const fallbackRitase = Math.max(lastRitase + (orderCount - schedule.length + 1), orderCount + 1);
  return buildScheduleItem(fallbackRitase, "Extra", "");
}

function buildScheduleItem(ritase: number, type: RitaseType, time: string): RitaseScheduleItem {
  const label = time ? `Rit ${ritase} ${type} ${time}` : `Rit ${ritase} ${type}`;
  return {
    ritase,
    type,
    time,
    label,
  };
}
