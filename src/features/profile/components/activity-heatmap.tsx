const MONTHS_ABBREV = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
const DAYS_ABBREV = ["Du", "Se", "Ch", "Pa", "Ju", "Sha", "Yak"];

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const diff = d.getDate() + mondayOffset;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type ActivityHeatmapProps = {
  activityByDay: Record<string, number>;
};

export function ActivityHeatmap({ activityByDay }: ActivityHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalActivities = Object.values(activityByDay).reduce((a, b) => a + b, 0);
  const thisYear = today.getFullYear();

  const weeks: { date: Date; dayIndex: number }[][] = [];
  const weekCount = 53;
  for (let w = weekCount - 1; w >= 0; w--) {
    const weekStart = getWeekStart(new Date(today));
    weekStart.setDate(weekStart.getDate() - w * 7);
    const week: { date: Date; dayIndex: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + d);
      week.push({ date: cellDate, dayIndex: d });
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Object.values(activityByDay));
  const getLevel = (count: number): number => {
    if (count <= 0) return 0;
    if (maxCount <= 1) return 1;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const monthLabels: { month: number; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, colIndex) => {
    const firstDay = week[0].date;
    const m = firstDay.getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      monthLabels.push({ month: m, col: colIndex });
    }
  });

  return (
    <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Mening faolligim</h3>
      <div className="w-full min-w-0 overflow-x-auto">
        <div
          className="grid w-full min-w-0 gap-px"
          style={{
            gridTemplateColumns: "auto repeat(53, minmax(0, 1fr))",
            gridTemplateRows: "auto repeat(7, minmax(0, 1fr))",
            aspectRatio: "54 / 8",
            maxHeight: "160px",
            width: "100%",
          }}
        >
          <div className="min-w-[1.5rem]" />
          {monthLabels.map(({ month, col }) => (
            <span
              key={`${col}-${month}`}
              className="flex items-end truncate pb-0.5 text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs"
              style={{ gridColumn: col + 2, gridRow: 1 }}
            >
              {MONTHS_ABBREV[month]}
            </span>
          ))}
          {DAYS_ABBREV.map((day, rowIndex) => (
            <span
              key={day}
              className="flex items-center pr-1 text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs"
              style={{ gridRow: rowIndex + 2, gridColumn: 1 }}
            >
              {day}
            </span>
          ))}
          {weeks.map((week, wi) =>
            week.map(({ date }, di) => {
              const key = toDateKey(date);
              const count = activityByDay[key] ?? 0;
              const level = getLevel(count);
              const isFuture = date > today;
              return (
                <div
                  key={`${wi}-${di}`}
                  className={`min-w-0 rounded-[2px] ${
                    isFuture
                      ? "bg-slate-100 dark:bg-slate-800"
                      : level === 0
                        ? "bg-slate-200 dark:bg-slate-700"
                        : level === 1
                          ? "bg-emerald-200 dark:bg-emerald-900/60"
                          : level === 2
                            ? "bg-emerald-400 dark:bg-emerald-700"
                            : level === 3
                              ? "bg-emerald-500 dark:bg-emerald-600"
                              : "bg-emerald-600 dark:bg-emerald-500"
                  }`}
                  style={{ gridColumn: wi + 2, gridRow: di + 2 }}
                  title={`${key}: ${count} ta faollik`}
                />
              );
            })
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        {thisYear}-yil uchun faolliklar: <strong>{totalActivities}</strong>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Kam</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-3 w-3 shrink-0 rounded-sm ${
                level === 0
                  ? "bg-slate-200 dark:bg-slate-700"
                  : level === 1
                    ? "bg-emerald-200 dark:bg-emerald-900/60"
                    : level === 2
                      ? "bg-emerald-400 dark:bg-emerald-700"
                      : level === 3
                        ? "bg-emerald-500 dark:bg-emerald-600"
                        : "bg-emerald-600 dark:bg-emerald-500"
              }`}
            />
          ))}
        </div>
        <span>Ko&apos;p</span>
      </div>
    </div>
  );
}
