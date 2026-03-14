export interface NoteMetadata {
  title: string;
  date?: string;
  category: string;
  tags?: string[];
  slug: string;
  lang: 'EN' | 'VI';
  path: string;
}

export interface Note extends NoteMetadata {
  contentHtml: string;
  toc: { level: number; text: string; id: string }[];
}

export interface DirectoryItem {
  name: string;
  isDirectory: boolean;
  children?: DirectoryItem[];
  slug?: string;
  hasEN?: boolean;
  hasVI?: boolean;
}
