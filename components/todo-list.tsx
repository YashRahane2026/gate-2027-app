"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, ListTodo, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Todo } from "@/types/todo";

interface TodoListProps {
  todos: Todo[];
  onUpdate: () => void;
}

export function TodoList({ todos, onUpdate }: TodoListProps) {
  const [subjectText, setSubjectText] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);

  // Sub-item inline form state
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [subItemText, setSubItemText] = useState("");
  const [addingSubItem, setAddingSubItem] = useState(false);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAddSubject = async () => {
    if (!subjectText.trim()) return;
    setAddingSubject(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: subjectText.trim(), parentId: null }),
      });
      if (res.ok) {
        setSubjectText("");
        onUpdate();
        toast({ title: "Subject added!" });
      }
    } catch {
      toast({ title: "Failed to add subject", variant: "destructive" });
    } finally {
      setAddingSubject(false);
    }
  };

  const handleAddSubItem = async (parentId: string) => {
    if (!subItemText.trim()) return;
    setAddingSubItem(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: subItemText.trim(), parentId }),
      });
      if (res.ok) {
        setSubItemText("");
        setActiveSubjectId(null);
        onUpdate();
        toast({ title: "Task added to subject!" });
      }
    } catch {
      toast({ title: "Failed to add task", variant: "destructive" });
    } finally {
      setAddingSubItem(false);
    }
  };

  const handleToggle = async (id: string, currentCompletedState: boolean) => {
    setLoadingId(id);
    try {
      await fetch("/api/todos", {
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
      await fetch(`/api/todos?id=${id}`, { method: "DELETE" });
      onUpdate();
    } finally {
      setLoadingId(null);
    }
  };

  // Progress metrics
  let totalTasks = 0;
  let completedTasks = 0;
  todos.forEach((todo) => {
    if (todo.subItems && todo.subItems.length > 0) {
      totalTasks += todo.subItems.length;
      completedTasks += todo.subItems.filter((s) => s.isCompleted).length;
    } else {
      totalTasks += 1;
      if (todo.isCompleted) completedTasks += 1;
    }
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Today&apos;s Todo</h2>
        </div>
        <div className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">
          {completedTasks}/{totalTasks} tasks done
        </div>
      </div>

      {/* Add Subject form */}
      <div className="mb-5 flex gap-2">
        <input
          type="text"
          value={subjectText}
          onChange={(e) => setSubjectText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
          placeholder="Add Subject (e.g. Operating Systems)"
          id="todo-subject-input"
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
        />
        <button
          onClick={handleAddSubject}
          disabled={addingSubject || !subjectText.trim()}
          id="todo-subject-add"
          className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-all flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="mb-5">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Todo list items */}
      <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1 flex-1">
        {todos.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
            No todos yet. Add a subject to start!
          </div>
        )}

        {todos.map((todo) => {
          const hasChildren = todo.subItems && todo.subItems.length > 0;

          return (
            <div
              key={todo.id}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200 group bg-white/5",
                todo.isCompleted ? "border-white/5 bg-white/[0.01]" : "border-white/10 hover:border-white/20"
              )}
            >
              {/* Subject Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(todo.id, todo.isCompleted)}
                    disabled={loadingId === todo.id}
                    className="flex-shrink-0 transition-transform duration-200 hover:scale-110"
                  >
                    {todo.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-500 hover:text-emerald-400" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-sm font-semibold truncate transition-all",
                      todo.isCompleted ? "line-through text-gray-500" : "text-white"
                    )}
                  >
                    {todo.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Plus Button next to subject */}
                  <button
                    onClick={() => {
                      if (activeSubjectId === todo.id) {
                        setActiveSubjectId(null);
                      } else {
                        setActiveSubjectId(todo.id);
                        setSubItemText("");
                      }
                    }}
                    title="Add lectures or details inside subject"
                    className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Delete Subject Button */}
                  <button
                    onClick={() => handleDelete(todo.id)}
                    disabled={loadingId === todo.id + "_del"}
                    className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline Sub-item addition field */}
              {activeSubjectId === todo.id && (
                <div className="mt-3 pl-8 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="text"
                    value={subItemText}
                    onChange={(e) => setSubItemText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubItem(todo.id)}
                    placeholder="Add lecture or details..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-emerald-500/50 transition-all"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddSubItem(todo.id)}
                    disabled={addingSubItem || !subItemText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-all"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setActiveSubjectId(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Nested Sub-items List */}
              {hasChildren && (
                <div className="mt-3 pl-8 space-y-2 border-l border-white/5">
                  {todo.subItems!.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-3 group/sub py-1 hover:bg-white/[0.02] rounded px-2 -mx-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggle(sub.id, sub.isCompleted)}
                          disabled={loadingId === sub.id}
                          className="flex-shrink-0 transition-transform duration-200 hover:scale-110"
                        >
                          {sub.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400/80" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-600 hover:text-emerald-400" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "text-xs transition-colors",
                            sub.isCompleted ? "line-through text-gray-500" : "text-gray-300"
                          )}
                        >
                          {sub.text}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        disabled={loadingId === sub.id + "_del"}
                        className="opacity-0 group-hover/sub:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
