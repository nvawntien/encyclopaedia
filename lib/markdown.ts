import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { unified } from 'unified';
import remarkRehype from 'remark-rehype';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeCodeTitles from 'rehype-code-titles';
import { NoteMetadata, Note, DirectoryItem } from "@/types/markdown";

const dataDirectory = path.join(process.cwd(), 'data');

export async function getAllNotes(): Promise<NoteMetadata[]> {
  const notes: NoteMetadata[] = [];

  function scanDir(currentPath: string, relativePath: string = '') {
    if (!fs.existsSync(currentPath)) return;
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath, path.join(relativePath, file));
      } else if (file.endsWith('.md')) {
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data } = matter(fileContents);
        
        const isEN = file.endsWith('_EN.md');
        const isVI = file.endsWith('_VI.md');
        const lang = isEN ? 'EN' : (isVI ? 'VI' : 'EN');
        
        // Remove _EN or _VI from slug, or just use filename
        const slugBase = file.replace(/(_EN|_VI)\.md$/, '').replace(/\.md$/, '');
        const slug = path.join(relativePath, slugBase);

        notes.push({
          title: data.title || slugBase,
          date: data.date ? new Date(data.date).toISOString() : undefined,
          category: data.category || relativePath.split(path.sep)[0] || 'uncategorized',
          tags: data.tags || [],
          slug,
          lang,
          path: fullPath,
        });
      }
    }
  }

  if (fs.existsSync(dataDirectory)) {
    scanDir(dataDirectory);
  }

  return notes;
}

export async function getNoteData(slug: string, lang: 'EN' | 'VI'): Promise<Note | null> {
  // Try specialized file first (_EN.md or _VI.md)
  let fileName = `${slug}_${lang}.md`;
  let fullPath = path.join(dataDirectory, fileName);

  // If not found, try generic file (slug.md)
  if (!fs.existsSync(fullPath)) {
    fileName = `${slug}.md`;
    fullPath = path.join(dataDirectory, fileName);
  }

  if (!fs.existsSync(fullPath)) {
    // Last resort: try any version that exists for this slug
    const files = fs.readdirSync(path.dirname(path.join(dataDirectory, slug)) || dataDirectory);
    const existingFile = files.find(f => f.startsWith(path.basename(slug)) && f.endsWith('.md'));
    if (existingFile) {
        fullPath = path.join(path.dirname(path.join(dataDirectory, slug)), existingFile);
    } else {
        return null;
    }
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  // Extract TOC (even if not shown in UI, useful for metadata if needed later)
  const toc: { level: number; text: string; id: string }[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    toc.push({ level, text, id });
  }

  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeCodeTitles)
    .use(rehypePrettyCode, {
      theme: 'github-dark',
      onVisitLine(node: any) {
        if (node.children.length === 0) {
          node.children = [{ type: 'text', value: ' ' }];
        }
      },
      onVisitHighlightedLine(node: any) {
        node.properties.className.push('highlighted');
      },
    })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['anchor'] }
    })
    .use(rehypeStringify)
    .process(content);

  const contentHtml = processedContent.toString();

  return {
    slug,
    lang,
    contentHtml,
    toc,
    title: data.title || slug.split('/').pop() || '',
    category: data.category || '',
    path: fullPath,
    ...data,
  } as Note;
}

export function getDirectoryStructure(): DirectoryItem[] {
  function buildTree(currentPath: string): DirectoryItem[] {
    if (!fs.existsSync(currentPath)) return [];
    
    const items = fs.readdirSync(currentPath);
    const result: DirectoryItem[] = [];

    const groupedFiles = new Map<string, { hasEN: boolean; hasVI: boolean }>();

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        result.push({
          name: item,
          isDirectory: true,
          children: buildTree(fullPath),
        });
      } else if (item.endsWith('.md')) {
        const baseName = item.replace(/(_EN|_VI)\.md$/, '').replace(/\.md$/, '');
        const isEN = item.endsWith('_EN.md');
        const isVI = item.endsWith('_VI.md');

        const existing = groupedFiles.get(baseName) || { hasEN: false, hasVI: false };
        if (isEN) existing.hasEN = true;
        if (isVI) existing.hasVI = true;
        // If it's just slug.md, we consider it having its own content
        if (!isEN && !isVI) existing.hasEN = true; // Default to true if plain .md
        
        groupedFiles.set(baseName, existing);
      }
    }

    for (const [baseName, status] of groupedFiles.entries()) {
      const relativePathFromData = path.relative(dataDirectory, path.join(currentPath, baseName));
      result.push({
        name: baseName,
        isDirectory: false,
        slug: relativePathFromData,
        ...status,
      });
    }

    return result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  if (!fs.existsSync(dataDirectory)) return [];
  return buildTree(dataDirectory);
}
