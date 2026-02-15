"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { lesson: "1-dars", score: 65 },
  { lesson: "2-dars", score: 72 },
  { lesson: "3-dars", score: 78 },
  { lesson: "4-dars", score: 85 },
];

export function StudentProgressChart() {
  return (
    <div className="h-64 min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="lesson" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="#059669" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
