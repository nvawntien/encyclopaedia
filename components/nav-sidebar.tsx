"use client"

import { Link } from "@/i18n/routing";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, FileText, Folder, Github } from "lucide-react";
import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DirectoryItem } from "@/types/markdown";
import { useTranslations } from 'next-intl';
import siteConfig from "@/config/site.json";

interface NavSidebarProps {
  className?: string;
  initialStructure?: DirectoryItem[];
}

export function NavSidebar({ className, initialStructure = [] }: NavSidebarProps) {
  const [structure, setStructure] = React.useState<DirectoryItem[]>(initialStructure);
  const pathname = usePathname();
  const t = useTranslations('Sidebar');

  // Update structure when initialStructure changes (e.g. on soft navigation)
  React.useEffect(() => {
    if (initialStructure.length > 0) {
      setStructure(initialStructure);
    }
  }, [initialStructure]);

  // Fallback fetch if not provided (though in this architecture it should be provided)
  React.useEffect(() => {
    if (structure.length === 0) {
      fetch('/api/structure')
        .then(res => res.json())
        .then(setStructure)
        .catch(err => console.error("Failed to fetch sidebar structure:", err));
    }
  }, [structure.length]);

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 border-r border-primary/5", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 flex items-center gap-2">
              <span className="h-px w-4 bg-primary/20" />
              {t('version')}
          </h2>
          <a 
            href="https://github.com/huynhanx03/BrainDump"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary/20 hover:text-primary transition-colors duration-300"
          >
            <Github className="h-3.5 w-3.5" />
          </a>
        </div>
        <ScrollArea className="h-[calc(100vh-160px)] -mx-2 px-2">
          <div className="space-y-6">
            {structure.map((item) => (
              <TreeItem key={item.name} item={item} activePath={pathname} />
            ))}
            {structure.length === 0 && (
                <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">{t('noNotes')}</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function TreeItem({ item, activePath, depth = 0 }: { item: DirectoryItem, activePath: string, depth?: number }) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (item.isDirectory) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center py-2 px-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group"
        >
          <ChevronRight className={cn("inline-block h-3 w-3 mr-2 transition-transform duration-300", isOpen ? "rotate-90" : "rotate-0")} />
          <Folder className="h-3 w-3 mr-2 opacity-40 group-hover:opacity-100 transition-opacity" />
          {item.name}
        </button>
        {isOpen && item.children && (
          <div className="ml-3 pl-3 border-l-2 border-primary/5 space-y-1">
            {item.children.map((child) => (
              <TreeItem key={child.name} item={child} activePath={activePath} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activePath.endsWith(`/${item.slug}`);

  return (
    <Link
      href={`/${item.slug}`}
      className={cn(
        "flex items-center justify-between py-2 px-3 text-[13px] font-medium transition-all group rounded-sm",
        isActive 
          ? "bg-primary/5 text-primary border-l-2 border-primary -ml-[13px] pl-[11px]" 
          : "text-muted-foreground hover:text-primary hover:bg-primary/5"
      )}
    >
      <div className="flex items-center">
        <FileText className={cn("h-3 w-3 mr-3 transition-opacity", isActive ? "opacity-100" : "opacity-30 group-hover:opacity-100")} />
        <span className={cn("truncate font-mono", isActive && "font-bold")}>{item.name.replace(/_EN$|_VI$/, '')}</span>
      </div>
    </Link>
  );
}
