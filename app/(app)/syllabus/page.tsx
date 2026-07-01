"use client";

import { useEffect, useState, useCallback } from "react";
import { WeightedGauge } from "@/components/weighted-gauge";
import { SyllabusAccordion } from "@/components/syllabus-accordion";
import { SYLLABUS_SECTIONS } from "@/lib/syllabus-config";
import { SyllabusItemData, getSyllabusStats } from "@/types/syllabus";
import { cn } from "@/lib/utils";

export default function SyllabusPage() {
  const [items, setItems] = useState<SyllabusItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<"CSE" | "DA">("CSE");

  useEffect(() => {
    const saved = localStorage.getItem("gate-study-stream");
    if (saved === "CSE" || saved === "DA") {
      setStream(saved);
    }
  }, []);

  const handleStreamChange = (newStream: "CSE" | "DA") => {
    setStream(newStream);
    localStorage.setItem("gate-study-stream", newStream);
  };

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

  const filteredSections = SYLLABUS_SECTIONS.filter((section) => {
    if (section.name === "Core CS") return stream === "CSE";
    if (section.name === "Core DA") return stream === "DA";
    return true;
  });

  const allowedSubjects = filteredSections.flatMap((s) => s.subjects.map((sub) => sub.name));
  const streamItems = items.filter((item) => allowedSubjects.includes(item.subject));

  const stats = getSyllabusStats(streamItems);
  const totalItems = stats.total;
  const completedItems = stats.completed;

  return (
    <div className="space-y-8">
      {/* Header & Stream Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Syllabus Tracker</h1>
          <p className="text-gray-400 text-sm font-sans">
            Track your GATE 2027 syllabus completion — {completedItems}/{totalItems} items done
          </p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-center">
          <button
            onClick={() => handleStreamChange("CSE")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200",
              stream === "CSE"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/10"
                : "text-gray-400 hover:text-white"
            )}
          >
            CSE Syllabus
          </button>
          <button
            onClick={() => handleStreamChange("DA")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200",
              stream === "DA"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/10"
                : "text-gray-400 hover:text-white"
            )}
          >
            DA Syllabus
          </button>
        </div>
      </div>

      {/* Gauge + overview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <WeightedGauge items={streamItems} stream={stream} />
          <div className="flex-1 space-y-3 w-full">
            {filteredSections.map((section) => {
              const sectionSubjects = section.subjects.map((s) => s.name);
              const sectionItems = streamItems.filter((i) => sectionSubjects.includes(i.subject));
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
      {filteredSections.map((section) => (
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
                items={streamItems.filter((i) => i.subject === subject.name)}
                onUpdate={fetchItems}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
