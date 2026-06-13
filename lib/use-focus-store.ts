import { create } from "zustand";

interface FocusState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null; // Timestamp in ms
  accumulatedSeconds: number;
  currentSubject: string;
  selectedSubject: string;
  customSubject: string;
  todayMinutes: number;
  
  start: (subject: string, selectedSub: string, customSub: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setTodayMinutes: (minutes: number) => void;
  load: () => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  startTime: null,
  accumulatedSeconds: 0,
  currentSubject: "",
  selectedSubject: "",
  customSubject: "",
  todayMinutes: 0,

  start: (subject, selectedSub, customSub) => {
    const now = Date.now();
    const state = {
      isRunning: true,
      isPaused: false,
      startTime: now,
      accumulatedSeconds: 0,
      currentSubject: subject,
      selectedSubject: selectedSub,
      customSubject: customSub,
    };
    set(state);
    if (typeof window !== "undefined") {
      localStorage.setItem("gate_focus_timer_state", JSON.stringify(state));
    }
  },

  pause: () => {
    const { isRunning, isPaused, startTime, accumulatedSeconds } = get();
    if (!isRunning || isPaused || !startTime) return;
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    const newAccumulated = accumulatedSeconds + elapsed;
    const state = {
      isPaused: true,
      startTime: null,
      accumulatedSeconds: newAccumulated,
    };
    set(state);
    if (typeof window !== "undefined") {
      const saved = JSON.parse(localStorage.getItem("gate_focus_timer_state") || "{}");
      localStorage.setItem(
        "gate_focus_timer_state",
        JSON.stringify({ ...saved, ...state })
      );
    }
  },

  resume: () => {
    const { isRunning, isPaused } = get();
    if (!isRunning || !isPaused) return;
    const now = Date.now();
    const state = {
      isPaused: false,
      startTime: now,
    };
    set(state);
    if (typeof window !== "undefined") {
      const saved = JSON.parse(localStorage.getItem("gate_focus_timer_state") || "{}");
      localStorage.setItem(
        "gate_focus_timer_state",
        JSON.stringify({ ...saved, ...state })
      );
    }
  },

  stop: () => {
    const state = {
      isRunning: false,
      isPaused: false,
      startTime: null,
      accumulatedSeconds: 0,
      currentSubject: "",
      selectedSubject: "",
      customSubject: "",
    };
    set(state);
    if (typeof window !== "undefined") {
      localStorage.removeItem("gate_focus_timer_state");
    }
  },

  setTodayMinutes: (minutes) => {
    set({ todayMinutes: minutes });
  },

  load: () => {
    if (typeof window === "undefined") return;
    try {
      const dataStr = localStorage.getItem("gate_focus_timer_state");
      if (dataStr) {
        const data = JSON.parse(dataStr);
        set({
          isRunning: data.isRunning ?? false,
          isPaused: data.isPaused ?? false,
          startTime: data.startTime ?? null,
          accumulatedSeconds: data.accumulatedSeconds ?? 0,
          currentSubject: data.currentSubject ?? "",
          selectedSubject: data.selectedSubject ?? "",
          customSubject: data.customSubject ?? "",
        });
      }
    } catch (e) {
      console.error("Error loading focus timer state", e);
    }
  },
}));
