"use client";

import { useMemo } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { SYLLABUS_SECTIONS } from "@/lib/syllabus-config";
import { SyllabusItemData, getSyllabusStats } from "@/types/syllabus";

interface WeightedGaugeProps {
  items: SyllabusItemData[];
  stream: "CSE" | "DA";
}

export function WeightedGauge({ items, stream }: WeightedGaugeProps) {
  const weightedCompletion = useMemo(() => {
    const allowedSections = SYLLABUS_SECTIONS.filter((s) => {
      if (s.name === "Core CS") return stream === "CSE";
      if (s.name === "Core DA") return stream === "DA";
      return true;
    });
    const allowedSubjects = allowedSections.flatMap((s) => s.subjects);
    const totalWeight = allowedSubjects.reduce((sum, s) => sum + s.weightage, 0);

    let total = 0;
    for (const subject of allowedSubjects) {
      const subjectItems = items.filter((i) => i.subject === subject.name);
      if (subjectItems.length === 0) continue;
      
      const stats = getSyllabusStats(subjectItems);
      total += subject.weightage * stats.pct;
    }
    return totalWeight > 0 ? Math.round((total / totalWeight) * 100) : 0;
  }, [items, stream]);

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
