"use client"

import { useState } from "react"
import { 
  Globe, 
  ShoppingCart, 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Youtube,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// TikTok icon component (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}

export interface Competitor {
  id: string
  name: string
  description: string | null
  website_url: string | null
  amazon_url: string | null
  logo_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  youtube_url: string | null
  category: string
  tags: string[] | null
  status: string
  discovered_via: string
  notes: string | null
  founded_year: number | null
  headquarters: string | null
  created_at: string
  updated_at: string
}

interface CompetitorCardProps {
  competitor: Competitor
  onEdit?: (competitor: Competitor) => void
  onDelete?: (id: string) => void
  isAdmin?: boolean
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  sleep: { bg: "bg-indigo-50", text: "text-indigo-700" },
  focus: { bg: "bg-amber-50", text: "text-amber-700" },
  calm: { bg: "bg-emerald-50", text: "text-emerald-700" },
  multi: { bg: "bg-purple-50", text: "text-purple-700" },
  general: { bg: "bg-neutral-100", text: "text-neutral-700" },
}

export function CompetitorCard({ 
  competitor, 
  onEdit, 
  onDelete,
  isAdmin = false 
}: CompetitorCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  
  const categoryColor = CATEGORY_COLORS[competitor.category] || CATEGORY_COLORS.general
  
  // Get initials for logo fallback
  const initials = competitor.name
    .split(" ")
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  
  // Count available social links
  const socialLinks = [
    { url: competitor.instagram_url, icon: Instagram, label: "Instagram" },
    { url: competitor.tiktok_url, icon: TikTokIcon, label: "TikTok" },
    { url: competitor.facebook_url, icon: Facebook, label: "Facebook" },
    { url: competitor.twitter_url, icon: Twitter, label: "Twitter/X" },
    { url: competitor.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: competitor.youtube_url, icon: Youtube, label: "YouTube" },
  ].filter(link => link.url)
  
  return (
    <div className="group relative flex flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:shadow-md hover:border-neutral-300">
      {/* Admin menu */}
      {isAdmin && (
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-600 transition-all"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onEdit?.(competitor)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onDelete?.(competitor.id)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Logo / Avatar */}
      <div className="mb-3 flex items-start gap-3">
        {competitor.logo_url ? (
          <img 
            src={competitor.logo_url} 
            alt={`${competitor.name} logo`}
            className="h-12 w-12 rounded-xl object-contain bg-neutral-50 border border-neutral-100"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 font-semibold text-sm">
            {initials}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-neutral-900 truncate pr-8">
            {competitor.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
              categoryColor.bg,
              categoryColor.text
            )}>
              {competitor.category}
            </span>
            {competitor.discovered_via === "tavily" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                <Sparkles className="h-2.5 w-2.5" />
                Discovered
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Description */}
      {competitor.description && (
        <p className="text-[12px] text-neutral-500 line-clamp-2 mb-3">
          {competitor.description}
        </p>
      )}
      
      {/* Primary Links */}
      <div className="flex items-center gap-2 mb-3">
        {competitor.website_url && (
          <a
            href={competitor.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <Globe className="h-3 w-3" />
            Website
            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
          </a>
        )}
        {competitor.amazon_url && (
          <a
            href={competitor.amazon_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <ShoppingCart className="h-3 w-3" />
            Amazon
            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
          </a>
        )}
      </div>
      
      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="flex items-center gap-1 pt-2 border-t border-neutral-100">
          {socialLinks.map(({ url, icon: Icon, label }) => (
            <a
              key={label}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      )}
      
      {/* Tags */}
      {competitor.tags && competitor.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-neutral-100">
          {competitor.tags.slice(0, 3).map(tag => (
            <span 
              key={tag}
              className="inline-flex items-center rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-500"
            >
              {tag}
            </span>
          ))}
          {competitor.tags.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-400">
              +{competitor.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Skeleton loader for competitor cards
export function CompetitorCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4 animate-pulse">
      <div className="mb-3 flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-neutral-200" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-neutral-200 rounded mb-2" />
          <div className="h-4 w-16 bg-neutral-100 rounded-full" />
        </div>
      </div>
      <div className="h-3 w-full bg-neutral-100 rounded mb-1" />
      <div className="h-3 w-3/4 bg-neutral-100 rounded mb-3" />
      <div className="flex gap-2">
        <div className="h-7 w-20 bg-neutral-100 rounded" />
        <div className="h-7 w-20 bg-neutral-100 rounded" />
      </div>
    </div>
  )
}
