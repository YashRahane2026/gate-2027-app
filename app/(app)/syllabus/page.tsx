"use client";

import { useEffect, useState, useCallback } from "react";
import { WeightedGauge } from "@/components/weighted-gauge";
import { SyllabusAccordion } from "@/components/syllabus-accordion";
import { SYLLABUS_SECTIONS } from "@/lib/syllabus-config";
import { SyllabusItemData, getSyllabusStats } from "@/types/syllabus";

export default function SyllabusPage() {
  const [items, setItems] = useState<SyllabusItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/syllabus");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-white/10 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const stats = getSyllabusStats(items);
  const totalItems = stats.total;
  const completedItems = stats.completed;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Syllabus Tracker</h1>
        <p className="text-gray-400 text-sm">
          Track your GATE 2027 syllabus completion — {completedItems}/{totalItems} items done
        </p>
      </div>

      {/* Gauge + overview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <WeightedGauge items={items} />
          <div className="flex-1 space-y-3">
            {SYLLABUS_SECTIONS.map((section) => {
              const sectionSubjects = section.subjects.map((s) => s.name);
              const sectionItems = items.filter((i) => sectionSubjects.includes(i.subject));
              const sectionStats = getSyllabusStats(sectionItems);
              const pct = Math.round(sectionStats.pct * 100);
              return (
                <div key={section.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{section.name}</span>
                    <span className="text-xs text-gray-500">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subjects by section */}
      {SYLLABUS_SECTIONS.map((section) => (
        <div key={section.name}>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500 inline-block" />
            {section.name}
          </h2>
          <div className="space-y-2">
            {section.subjects.map((subject) => (
              <SyllabusAccordion
                key={subject.name}
                subjectName={subject.name}
                weightage={subject.weightage}
                items={items.filter((i) => i.subject === subject.name)}
                onUpdate={fetchItems}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
