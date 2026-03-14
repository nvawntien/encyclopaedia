"use client"

import * as React from "react"
import { ThemeToggle } from "./theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Link, usePathname } from "@/i18n/routing"
import { useLocale } from 'next-intl'
import siteConfig from "@/config/site.json"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function Header() {
  const locale = useLocale()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4 flex-1">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-black uppercase tracking-tighter">
              Brain<span className="text-primary italic">Dump.</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* High-end Segmented Control using Link for zero-reload switching */}
          <div className="relative flex items-center bg-muted/40 p-1 rounded-full border border-primary/5 shadow-inner">
            <motion.div
              className="absolute h-7 rounded-full bg-background shadow-md border border-primary/10"
              initial={false}
              animate={{
                x: locale === "en" ? 0 : 40,
                width: locale === "en" ? 36 : 36
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
            
            <Link 
              href={pathname} 
              locale="en"
              className={cn(
                "relative z-10 w-9 h-7 flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-colors duration-500",
                locale === "en" ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              EN
            </Link>
            
            <Link 
              href={pathname} 
              locale="vi"
              className={cn(
                "relative z-10 w-9 h-7 flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-colors duration-500",
                locale === "vi" ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              VI
            </Link>
          </div>
          
          <ThemeToggle />
          
          <Link href="/profile" className="transition-transform hover:scale-105 active:scale-95">
            <Avatar className="h-9 w-9 border-2 border-primary/10 shadow-sm overflow-hidden bg-muted">
              <AvatarImage src={siteConfig.avatar} alt={siteConfig.name} />
              <AvatarFallback className="text-[10px] font-black font-mono">
                {siteConfig.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  )
}
