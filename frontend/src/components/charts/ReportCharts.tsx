import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Props {
  type: "bar" | "pie";
  data: { name: string; value: number; color?: string }[];
  title: string;
  height?: number;
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export function ReportCharts({ type, data, title, height = 300 }: Props) {
  const chartData = data.map((d) => ({ name: d.name, value: d.value, color: d.color }));

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {type === "bar" ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 24%)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(215 20% 65%)" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(215 20% 65%)" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(220 20% 12%)", border: "1px solid hsl(217 19% 24%)", borderRadius: "8px" }}
              labelStyle={{ color: "hsl(210 40% 98%)" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(220 20% 12%)", border: "1px solid hsl(217 19% 24%)", borderRadius: "8px" }}
            />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
