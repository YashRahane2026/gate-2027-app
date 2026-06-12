export interface SubItem {
  id: string;
  text: string;
  targetDetail?: string;
  isCompleted: boolean;
  parentId: string;
}

export interface Todo {
  id: string;
  text: string;
  targetDetail?: string;
  isCompleted: boolean;
  parentId: string | null;
  subItems?: SubItem[];
}
