"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, RotateCcw, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ITEM_TYPES, ITEM_TYPE_COLORS, type ItemType } from "@/lib/syllabus-config";
import { useToast } from "@/components/ui/use-toast";
import { SyllabusItemData, getSyllabusStats } from "@/types/syllabus";

interface SyllabusAccordionProps {
  subjectName: string;
  weightage: number;
  items: SyllabusItemData[];
  onUpdate: () => void;
}

export function SyllabusAccordion({
  subjectName,
  weightage,
  items,
  onUpdate,
}: SyllabusAccordionProps) {
  const [open, setOpen] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);

  // Sub-item inline state
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubType, setNewSubType] = useState<ItemType>("Lecture");
  const [newSubNotes, setNewSubNotes] = useState("");
  const [addingSubItem, setAddingSubItem] = useState(false);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  const stats = getSyllabusStats(items);
  const completed = stats.completed;
  const completion = Math.round(stats.pct * 100);

  const handleAddChapter = async () => {
    if (!newChapterName.trim()) return;
    setAddingChapter(true);
    try {
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectName,
          itemName: newChapterName.trim(),
          itemType: "Lecture", // Default type for chapters, not shown as a badge unless needed
          parentId: null,
        }),
      });
      if (res.ok) {
        setNewChapterName("");
        setShowAddChapter(false);
        onUpdate();
        toast({ title: "Chapter added!" });
      }
    } catch {
      toast({ title: "Failed to add chapter", variant: "destructive" });
    } finally {
      setAddingChapter(false);
    }
  };

  const handleAddSubItem = async (parentId: string) => {
    if (!newSubName.trim()) return;
    setAddingSubItem(true);
    try {
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectName,
          itemName: newSubName.trim(),
          itemType: newSubType,
          notes: newSubNotes.trim() || undefined,
          parentId,
        }),
      });
      if (res.ok) {
        setNewSubName("");
        setNewSubType("Lecture");
        setNewSubNotes("");
        setActiveChapterId(null);
        onUpdate();
        toast({ title: "Item added to chapter!" });
      }
    } catch {
      toast({ title: "Failed to add item", variant: "destructive" });
    } finally {
      setAddingSubItem(false);
    }
  };

  const handleToggle = async (id: string, currentCompletedState: boolean) => {
    setLoadingId(id);
    try {
      await fetch("/api/syllabus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isCompleted: !currentCompletedState }),
      });
      onUpdate();
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id + "_del");
    try {
      await fetch(`/api/syllabus?id=${id}`, { method: "DELETE" });
      onUpdate();
    } finally {
      setLoadingId(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await fetch("/api/syllabus/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectName }),
      });
      onUpdate();
      toast({ title: "Ticks reset!", description: "Ready for revision." });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 hover:border-white/20">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        id={`syllabus-${subjectName.replace(/\s+/g, "-").toLowerCase()}`}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-white truncate">{subjectName}</span>
            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
              {weightage}% weight
            </span>
            {completion === 100 && stats.total > 0 && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                ✓ Done
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  completion === 100
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                    : "bg-gradient-to-r from-violet-500 to-indigo-500"
                )}
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 w-8 text-right font-medium">
              {completion}%
            </span>
            <span className="text-xs text-gray-600 flex-shrink-0">
              {completed}/{stats.total} tasks
            </span>
          </div>
        </div>
        <div className="ml-2 text-gray-500 flex-shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-white/[0.07] bg-white/[0.02]">
          <div className="p-4 space-y-4">
            {/* Chapters list */}
            {items.length === 0 && !showAddChapter && (
              <p className="text-sm text-gray-500 text-center py-4">
                No chapters yet. Add a chapter below!
              </p>
            )}

            {items.map((chapter) => {
              const hasSubItems = chapter.subItems && chapter.subItems.length > 0;

              return (
                <div
                  key={chapter.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-200 bg-white/5",
                    chapter.isCompleted ? "border-white/5 bg-white/[0.01]" : "border-white/10 hover:border-white/20"
                  )}
                >
                  {/* Chapter Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggle(chapter.id, chapter.isCompleted)}
                        disabled={loadingId === chapter.id}
                        className="flex-shrink-0 transition-transform hover:scale-110"
                      >
                        {chapter.isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-emerald-500/50 transition-colors" />
                        )}
                      </button>
                      <span
                        className={cn(
                          "text-sm font-semibold truncate transition-colors",
                          chapter.isCompleted ? "line-through text-gray-500" : "text-white"
                        )}
                      >
                        {chapter.itemName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Plus button next to chapter */}
                      <button
                        onClick={() => {
                          if (activeChapterId === chapter.id) {
                            setActiveChapterId(null);
                          } else {
                            setActiveChapterId(chapter.id);
                            setNewSubName("");
                            setNewSubNotes("");
                          }
                        }}
                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors"
                        title="Add lecture or test inside chapter"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {/* Delete chapter button */}
                      <button
                        onClick={() => handleDelete(chapter.id)}
                        disabled={loadingId === chapter.id + "_del"}
                        className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline sub-item addition form */}
                  {activeChapterId === chapter.id && (
                    <div className="mt-3 pl-8 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
                        type="text"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        placeholder="Item name (e.g. Lecture 1: Semaphores)"
                        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-all"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <select
                          value={newSubType}
                          onChange={(e) => setNewSubType(e.target.value as ItemType)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50 transition-all"
                        >
                          {ITEM_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newSubNotes}
                          onChange={(e) => setNewSubNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-all"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddSubItem(chapter.id)}
                          disabled={addingSubItem || !newSubName.trim()}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={() => setActiveChapterId(null)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-all"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-items list nested inside chapter */}
                  {hasSubItems && (
                    <div className="mt-3 pl-8 space-y-2 border-l border-white/5">
                      {chapter.subItems!.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-3 group/sub py-1 hover:bg-white/[0.02] rounded px-2 -mx-2 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <button
                              onClick={() => handleToggle(sub.id, sub.isCompleted)}
                              disabled={loadingId === sub.id}
                              className="flex-shrink-0 transition-transform hover:scale-110"
                            >
                              {sub.isCompleted ? (
                                <div className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-white/10 hover:border-emerald-500/50 transition-colors" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span
                                className={cn(
                                  "text-xs transition-colors",
                                  sub.isCompleted ? "line-through text-gray-500" : "text-gray-300"
                                )}
                              >
                                {sub.itemName}
                              </span>
                              {sub.notes && (
                                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{sub.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full border",
                                ITEM_TYPE_COLORS[sub.itemType as ItemType] ??
                                  "bg-gray-500/20 text-gray-300 border-gray-500/30"
                              )}
                            >
                              {sub.itemType}
                            </span>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              disabled={loadingId === sub.id + "_del"}
                              className="opacity-0 group-hover/sub:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Chapter form */}
            {showAddChapter && (
              <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2">
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddChapter()}
                  placeholder="Chapter name (e.g. Process Management)"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddChapter}
                    disabled={addingChapter || !newChapterName.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                  <button
                    onClick={() => setShowAddChapter(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              {!showAddChapter && (
                <button
                  onClick={() => setShowAddChapter(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Chapter
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-orange-400 bg-white/5 hover:bg-orange-500/10 transition-all"
                >
                  <RotateCcw className={cn("w-3 h-3", resetting && "animate-spin")} />
                  Reset Ticks
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
