export type DayNight = "DAY" | "NIGHT";

export function getDefaultDayNightByTime(date = new Date()): DayNight {
  const hour = date.getHours();
  return hour >= 7 && hour < 20 ? "DAY" : "NIGHT";
}
