"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Github, Linkedin, Mail } from "lucide-react"
import { Link } from "@/i18n/routing"
import siteConfig from "@/config/site.json"
import { useTranslations } from 'next-intl'

export default function ProfilePage() {
  const t = useTranslations('Profile')

  return (
    <div className="max-w-2xl mx-auto py-16 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-8">
        <Avatar className="h-24 w-24 border-4 border-primary/5 shadow-lg">
          <AvatarImage src={siteConfig.avatar} alt={siteConfig.name} className="object-cover" />
          <AvatarFallback className="text-2xl font-black font-mono">
            {siteConfig.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-3xl font-black uppercase tracking-tighter">{siteConfig.name}</h1>
          <p className="text-sm text-primary font-black uppercase tracking-widest opacity-60">{siteConfig.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 flex items-center gap-2">
            <span className="h-px w-4 bg-primary/20" />
            {t('about')}
          </h2>
          <p className="text-xs font-mono leading-relaxed text-muted-foreground/80 max-w-xl">
            {siteConfig.bio}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 flex items-center gap-2">
            <span className="h-px w-4 bg-primary/20" />
            {t('connect')}
          </h2>
          <div className="flex flex-wrap gap-4">
            <SocialIconLink icon={<Github className="h-4 w-4" />} href={siteConfig.social.github} label="GitHub" />
            <SocialIconLink icon={<Linkedin className="h-4 w-4" />} href={siteConfig.social.linkedin} label="LinkedIn" />
            <SocialIconLink icon={<Mail className="h-4 w-4" />} href={siteConfig.social.email} label="Email" />
          </div>
        </section>
      </div>

      <div className="pt-12 border-t border-primary/5">
        <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 hover:text-primary transition-colors inline-flex items-center gap-2"
        >
          <span className="text-lg">←</span> {t('back')}
        </Link>
      </div>
    </div>
  )
}

function SocialIconLink({ icon, href, label }: { icon: React.ReactNode, href: string, label: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="p-3 bg-muted/30 hover:bg-primary/10 rounded-lg border border-primary/5 transition-all duration-300 text-muted-foreground hover:text-primary group"
      title={label}
    >
      {icon}
    </a>
  )
}
