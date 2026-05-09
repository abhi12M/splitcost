"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "@/lib/avatar-utils";
import { SmartTooltip } from "@/components/ui/smartTooltip";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

interface ExpenseChartProps {
  data: { name: string; value: number }[];
  currency: string;
  totalExpenses: number;
}

export default function ExpenseChart({
  data,
  currency,
  totalExpenses,
}: ExpenseChartProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-2">
      <div className="h-[200px] w-full lg:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              animationDuration={750}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value, currency)}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full lg:w-1/2 px-[10px] sm:px-0">
        {data.map((item, i) => (
          <div
            key={item.name}
            className="flex justify-between items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors my-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <SmartTooltip text={item.name} />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatCurrency(item.value, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {totalExpenses > 0
                  ? ((item.value / totalExpenses) * 100).toFixed(1)
                  : "0.0"}
                %
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
