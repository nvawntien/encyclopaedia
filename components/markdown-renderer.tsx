"use client"

import * as React from "react"

interface MarkdownRendererProps {
  contentHtml: string
}

export function MarkdownRenderer({ contentHtml }: MarkdownRendererProps) {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-h1:text-4xl prose-h1:font-black prose-h1:tracking-tighter prose-h1:uppercase prose-h2:text-2xl prose-h2:font-bold prose-h2:tracking-tight prose-h2:border-b prose-h2:pb-2 prose-h2:mt-12 prose-a:text-primary prose-a:no-underline hover:prose-a:underline font-mono">
      <div 
        dangerouslySetInnerHTML={{ __html: contentHtml }} 
        className="[&>pre]:border-2 [&>pre]:border-primary/10 [&>pre]:rounded-sm [&>pre]:my-8"
      />
    </article>
  )
}
