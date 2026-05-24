import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  includeTime?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const QUICK_OPTIONS = ["今天", "明天", "本周", "下周"];

export function DateTimePicker({
  value,
  onChange,
  placeholder = "年 / 月 / 日",
  includeTime = false,
  minDate,
  maxDate,
  className = "",
}: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedDate = parsePickerDate(value);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
  const [time, setTime] = useState(() => parsePickerTime(value));
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    setTime(parsePickerTime(value));
    const next = parsePickerDate(value);
    if (next) setViewDate(next);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const displayValue = selectedDate ? formatSlashDate(selectedDate) : "";
  const min = parsePickerDate(minDate ?? "");
  const max = parsePickerDate(maxDate ?? "");

  const commitDate = (date: Date, nextTime = time) => {
    if (isDateDisabled(date, min, max)) return;
    const datePart = formatInputDate(date);
    onChange(includeTime ? `${datePart}T${nextTime || "18:00"}` : datePart);
    setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const quickSelect = (label: string) => {
    const today = startOfDay(new Date());
    if (label === "今天") commitDate(today);
    if (label === "明天") commitDate(addDays(today, 1));
    if (label === "本周") commitDate(startOfWeek(today));
    if (label === "下周") commitDate(addDays(startOfWeek(today), 7));
  };

  const commitCustomDate = (text: string) => {
    const parsed = parseCustomDate(text);
    if (!parsed) return;
    if (isDateDisabled(parsed, min, max)) return;
    setViewDate(parsed);
    commitDate(parsed);
  };

  return (
    <div ref={rootRef} className={`date-time-picker ${className}`}>
      <button className={`date-time-trigger ${open ? "is-open" : ""}`} type="button" onClick={() => setOpen(next => !next)}>
        <span className="date-time-icon"><CalendarDays size={18} /></span>
        <span className={displayValue ? "" : "is-placeholder"}>{displayValue || placeholder}</span>
      </button>
      {open && (
        <div className="date-time-popover">
          <aside className="date-time-quick">
            <b>快捷选择</b>
            {QUICK_OPTIONS.map(label => (
              <button key={label} type="button" onClick={() => quickSelect(label)}>{label}</button>
            ))}
            <label className="date-time-custom">
              <span>自定义输入</span>
              <input
                value={customText}
                inputMode="numeric"
                placeholder="如 20260506"
                onChange={event => {
                  const next = event.target.value;
                  setCustomText(next);
                  if (parseCustomDate(next)) commitCustomDate(next);
                }}
                onKeyDown={event => {
                  if (event.key === "Enter") commitCustomDate(customText);
                }}
                onBlur={() => commitCustomDate(customText)}
              />
            </label>
          </aside>
          <section className="date-time-calendar">
            <div className="date-time-month">
              <button type="button" onClick={() => shiftMonth(-1)}><ChevronLeft size={20} /></button>
              <strong>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</strong>
              <button type="button" onClick={() => shiftMonth(1)}><ChevronRight size={20} /></button>
            </div>
            <div className="date-time-weekdays">
              {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
            </div>
            <div className="date-time-days">
              {days.map(day => {
                const selected = selectedDate && sameDay(day.date, selectedDate);
                const today = sameDay(day.date, new Date());
                const disabled = isDateDisabled(day.date, min, max);
                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={disabled}
                    className={`${day.inMonth ? "" : "is-muted"} ${selected ? "is-selected" : ""} ${today ? "is-today" : ""} ${disabled ? "is-disabled" : ""}`}
                    onClick={() => commitDate(day.date)}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
            {includeTime && (
              <label className="date-time-clock">
                <span>时间</span>
                <input
                  type="time"
                  value={time}
                  onChange={event => {
                    setTime(event.target.value);
                    if (selectedDate) onChange(`${formatInputDate(selectedDate)}T${event.target.value}`);
                  }}
                />
              </label>
            )}
            <div className="date-time-footer">
              <button type="button" onClick={() => onChange("")}>清除</button>
              <button type="button" onClick={() => commitDate(new Date())}>今天</button>
            </div>
          </section>
          <style>{dateTimePickerCss}</style>
        </div>
      )}
    </div>
  );
}

function isDateDisabled(date: Date, min: Date | null, max: Date | null) {
  const day = startOfDay(date).getTime();
  if (min && day < startOfDay(min).getTime()) return true;
  if (max && day > startOfDay(max).getTime()) return true;
  return false;
}

function parsePickerDate(value: string) {
  if (!value) return null;
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function parseCustomDate(text: string) {
  const trimmed = text.trim();
  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  const separated = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  const match = compact ?? separated;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function parsePickerTime(value: string) {
  if (!value.includes("T")) return "18:00";
  return value.split("T")[1]?.slice(0, 5) || "18:00";
}

function buildCalendarDays(viewDate: Date) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      key: formatInputDate(date),
      inMonth: date.getMonth() === viewDate.getMonth(),
    };
  });
}

function formatInputDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatSlashDate(date: Date) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -date.getDay());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

const dateTimePickerCss = `
.date-time-picker { position: relative; width: 100%; }
.date-time-trigger { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 12px; padding: 0 13px; border: 1px solid #d9dee7; border-radius: 8px; background: #fff; color: #111827; font: inherit; font-size: 14px; font-weight: 850; text-align: left; cursor: pointer; }
.date-time-trigger.is-open { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
.date-time-icon { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 7px; background: #f3f4f6; color: #050505; }
.date-time-trigger .is-placeholder { color: #8a909d; }
.date-time-popover { position: absolute; top: calc(100% + 8px); left: 0; z-index: 300; display: grid; grid-template-columns: 128px 1fr; width: min(520px, calc(100vw - 48px)); border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 20px 60px rgba(15,23,42,.18); overflow: hidden; }
.date-time-quick { display: flex; flex-direction: column; gap: 2px; padding: 20px 14px; border-right: 1px solid #eef0f4; }
.date-time-quick b { margin-bottom: 8px; color: #6b7280; font-size: 13px; font-weight: 850; }
.date-time-quick button { height: 32px; padding: 0 4px; border: 0; border-left: 3px solid transparent; background: transparent; color: #111827; font-size: 14px; font-weight: 800; text-align: left; cursor: pointer; }
.date-time-quick button:hover { border-left-color: #1f6feb; color: #1f6feb; }
.date-time-custom { display: grid; gap: 7px; margin-top: 10px; padding-top: 12px; border-top: 1px solid #eef0f4; }
.date-time-custom span { color: #6b7280; font-size: 12px; font-weight: 850; }
.date-time-custom input { width: 100%; height: 32px; border: 1px solid #d9dee7; border-radius: 8px; padding: 0 9px; color: #111827; font-size: 13px; font-weight: 850; outline: none; }
.date-time-custom input:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
.date-time-calendar { padding: 18px 18px 14px; min-width: 0; }
.date-time-month { display: grid; grid-template-columns: 34px 1fr 34px; align-items: center; margin-bottom: 14px; }
.date-time-month strong { text-align: center; color: #111827; font-size: 16px; font-weight: 950; }
.date-time-month button { width: 34px; height: 34px; display: grid; place-items: center; border: 0; border-radius: 8px; background: transparent; color: #111827; cursor: pointer; }
.date-time-month button:hover { background: #f3f4f6; }
.date-time-weekdays,.date-time-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.date-time-weekdays span { height: 28px; display: grid; place-items: center; color: #4b5563; font-size: 13px; font-weight: 900; }
.date-time-days button { height: 34px; border: 0; border-radius: 999px; background: transparent; color: #111827; font-size: 14px; font-weight: 850; cursor: pointer; }
.date-time-days button:hover { background: #eef6ff; }
.date-time-days button.is-muted { color: #a1a7b3; }
.date-time-days button.is-disabled { color: #d1d5db; cursor: not-allowed; text-decoration: line-through; }
.date-time-days button.is-disabled:hover { background: transparent; }
.date-time-days button.is-today { box-shadow: inset 0 0 0 1px #9ca3af; }
.date-time-days button.is-selected { background: #1f6feb; color: #fff; box-shadow: none; }
.date-time-clock { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eef0f4; color: #4b5563; font-size: 13px; font-weight: 900; }
.date-time-clock input { height: 34px; border: 1px solid #d9dee7; border-radius: 8px; padding: 0 10px; font: inherit; font-size: 13px; font-weight: 850; }
.date-time-footer { display: flex; justify-content: space-between; margin-top: 12px; }
.date-time-footer button { border: 0; background: transparent; color: #1f6feb; font-size: 14px; font-weight: 900; cursor: pointer; }
`;
