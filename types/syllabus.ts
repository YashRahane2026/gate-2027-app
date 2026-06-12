export interface SyllabusSubItem {
  id: string;
  subject: string;
  itemName: string;
  itemType: string;
  notes?: string;
  isCompleted: boolean;
  parentId: string;
}

export interface SyllabusItemData {
  id: string;
  subject: string;
  itemName: string;
  itemType: string;
  notes?: string;
  isCompleted: boolean;
  parentId: string | null;
  subItems?: SyllabusSubItem[];
}

export function getSyllabusStats(items: SyllabusItemData[]) {
  let total = 0;
  let completed = 0;
  items.forEach((item) => {
    if (item.subItems && item.subItems.length > 0) {
      total += item.subItems.length;
      completed += item.subItems.filter((s) => s.isCompleted).length;
    } else {
      total += 1;
      if (item.isCompleted) completed += 1;
    }
  });
  return { total, completed, pct: total > 0 ? completed / total : 0 };
}
