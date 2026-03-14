import { getNoteData } from "@/lib/markdown";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { notFound } from "next/navigation";
import { FolderOpen, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, slug?: string[] }> }) {
  const { locale, slug } = await params;
  if (!slug) return { title: "BrainDump" };
  
  const note = await getNoteData(slug.join("/"), locale.toUpperCase() as any);
  return {
    title: note ? `${note.title} | BrainDump` : "Note not found",
  };
}

export default async function NotePage(props: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const { locale, slug: slugArray } = await props.params;
  const t = await getTranslations('Landing');

  if (!slugArray || slugArray.length === 0) {
    // Landing page view
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12 py-20">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-[0.8] mb-8" dangerouslySetInnerHTML={{ __html: t('title') }} />
          <p className="text-lg text-muted-foreground font-mono leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl text-left border-t-2 border-primary/5 pt-12">
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">{t('step1Title')}</h3>
                <p className="text-xs text-muted-foreground font-mono">{t('step1Desc')}</p>
            </div>
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">{t('step2Title')}</h3>
                <p className="text-xs text-muted-foreground font-mono">{t('step2Desc')}</p>
            </div>
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">{t('step3Title')}</h3>
                <p className="text-xs text-muted-foreground font-mono">{t('step3Desc')}</p>
            </div>
        </div>
      </div>
    );
  }

  const slug = slugArray.join("/");
  const note = await getNoteData(slug, locale.toUpperCase() as any);

  if (!note) {
    notFound();
  }

  return (
    <div className="relative pb-24 max-w-4xl mx-auto">
      <div className="mb-12 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <nav className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-primary/40 text-xs">{note.category}</span>
        </nav>

        <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
          {note.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 pt-4 border-t-2 border-primary/5">
          {note.date && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              <Calendar className="h-3 w-3" />
              {format(new Date(note.date), "MMMM dd, yyyy")}
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            <FolderOpen className="h-3 w-3" />
            {note.category}
          </div>
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-2">
                {note.tags.map((tag) => (
                  <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-primary/20 rounded-full hover:bg-primary/5 transition-colors cursor-pointer">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <MarkdownRenderer contentHtml={note.contentHtml} />
      </div>
    </div>
  );
}
