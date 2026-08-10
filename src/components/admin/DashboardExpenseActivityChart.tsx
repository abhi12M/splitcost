"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";

type ActivityType = "expenses" | "groups";
type TimeRange = "daily" | "weekly" | "monthly";

type ActivityEvents = {
  expenses: string[];
  groups: string[];
};

type ChartPoint = {
  key: string;
  label: string;
  tooltipLabel: string;
  count: number;
};

const rangeConfig: Record<TimeRange, { periods: number; label: string }> = {
  daily: { periods: 30, label: "Last 30 days" },
  weekly: { periods: 12, label: "Last 12 weeks" },
  monthly: { periods: 12, label: "Last 12 months" },
};

function startOfPeriod(date: Date, range: TimeRange) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);

  if (range === "weekly") {
    const daysSinceMonday = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - daysSinceMonday);
  } else if (range === "monthly") {
    result.setUTCDate(1);
  }

  return result;
}

function addPeriods(date: Date, amount: number, range: TimeRange) {
  const result = new Date(date);
  if (range === "daily") result.setUTCDate(result.getUTCDate() + amount);
  if (range === "weekly") result.setUTCDate(result.getUTCDate() + amount * 7);
  if (range === "monthly") result.setUTCMonth(result.getUTCMonth() + amount);
  return result;
}

function formatPeriod(date: Date, range: TimeRange) {
  if (range === "daily") {
    return {
      label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date),
      tooltipLabel: new Intl.DateTimeFormat("en", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
    };
  }

  if (range === "weekly") {
    const end = addPeriods(date, 6, "daily");
    return {
      label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date),
      tooltipLabel: `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(end)}`,
    };
  }

  return {
    label: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date),
    tooltipLabel: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(date),
  };
}

function buildChartData(events: string[], range: TimeRange): ChartPoint[] {
  const { periods } = rangeConfig[range];
  const currentPeriod = startOfPeriod(new Date(), range);
  const firstPeriod = addPeriods(currentPeriod, -(periods - 1), range);
  const counts = new Map<string, number>();

  for (const value of events) {
    const eventDate = new Date(value);
    if (Number.isNaN(eventDate.getTime())) continue;
    const key = startOfPeriod(eventDate, range).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: periods }, (_, index) => {
    const date = addPeriods(firstPeriod, index, range);
    const key = date.toISOString();
    return { key, ...formatPeriod(date, range), count: counts.get(key) ?? 0 };
  });
}

export function DashboardExpenseActivityChart({ events }: { events: ActivityEvents }) {
  const [activityType, setActivityType] = useState<ActivityType>("groups");
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const data = useMemo(() => buildChartData(events[activityType], timeRange), [activityType, events, timeRange]);
  const singularLabel = activityType === "expenses" ? "expense" : "group";

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Activity type">
          {(["expenses", "groups"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={activityType === type ? "default" : "outline"}
              onClick={() => setActivityType(type)}
              aria-pressed={activityType === type}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Time interval">
          {(["daily", "weekly", "monthly"] as const).map((range) => (
            <Button
              key={range}
              type="button"
              size="sm"
              variant={timeRange === range ? "secondary" : "ghost"}
              onClick={() => setTimeRange(range)}
              aria-pressed={timeRange === range}
              className="capitalize"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{rangeConfig[timeRange].label}</p>
      <div className="h-72 w-full" role="img" aria-label={`${activityType} created ${timeRange}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <XAxis
              dataKey="label"
              interval={timeRange === "daily" ? 4 : 0}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: "6px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--background))",
              }}
              formatter={(value: number) => [`${value} ${singularLabel}${value === 1 ? "" : "s"}`, "Created"]}
              labelFormatter={(_, payload) => payload[0]?.payload.tooltipLabel ?? ""}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
