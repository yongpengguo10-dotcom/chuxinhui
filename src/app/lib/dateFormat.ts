export function formatDisplayDateTime(value?: string) {
  if (!value) return "未设置";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (!match) return value.replace("T", "/");
  const [, , month, day, hour, minute] = match;
  return hour && minute ? `${month}-${day}/${hour}:${minute}` : `${month}-${day}`;
}

export function formatWeekDateTime(value?: string) {
  if (!value) return "未设置";
  const normalized = value.includes("T") ? value : value.includes(" ") ? value.replace(" ", "T") : `${value}T00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return formatDisplayDateTime(value);

  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
  const timeMatch = value.match(/[T\s](\d{2}):(\d{2})/);
  const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : "";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateStart.getTime() - todayStart.getTime()) / 86400000);
  const currentWeekRemaining = 6 - now.getDay();

  if (diffDays >= 0 && diffDays <= currentWeekRemaining) return `${week}${time ? ` ${time}` : ""}`;
  if (diffDays > currentWeekRemaining && diffDays <= currentWeekRemaining + 7) return `下${week}${time ? ` ${time}` : ""}`;
  return formatDisplayDateTime(value);
}
