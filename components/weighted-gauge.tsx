"use client";

import { useMemo } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { ALL_SUBJECTS, TOTAL_WEIGHTAGE } from "@/lib/syllabus-config";
import { SyllabusItemData, getSyllabusStats } from "@/types/syllabus";

interface WeightedGaugeProps {
  items: SyllabusItemData[];
}

export function WeightedGauge({ items }: WeightedGaugeProps) {
  const weightedCompletion = useMemo(() => {
    let total = 0;
    for (const subject of ALL_SUBJECTS) {
      const subjectItems = items.filter((i) => i.subject === subject.name);
      if (subjectItems.length === 0) continue;
      
      const stats = getSyllabusStats(subjectItems);
      total += subject.weightage * stats.pct;
    }
    return Math.round((total / TOTAL_WEIGHTAGE) * 100);
  }, [items]);

  const data = [{ value: weightedCompletion, fill: "#8b5cf6" }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            data={data}
            startAngle={210}
            endAngle={-30}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            {/* Background arc */}
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              background={{ fill: "#1a1a2e" }}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{weightedCompletion}%</span>
          <span className="text-xs text-gray-400 mt-1">Weighted</span>
        </div>
      </div>
      <p className="text-sm text-gray-400 mt-2 text-center">
        Overall GATE Syllabus Completion
      </p>
    </div>
  );
}
