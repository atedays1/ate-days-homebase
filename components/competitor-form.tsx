"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  X, 
  Loader2,
  Globe,
  ShoppingCart,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Building,
  Calendar,
  Tag,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Competitor } from "@/components/competitor-card"

interface CompetitorFormProps {
  competitor?: Competitor | null
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  { id: "sleep", label: "Sleep" },
  { id: "focus", label: "Focus" },
  { id: "calm", label: "Calm" },
  { id: "multi", label: "Multi-purpose" },
  { id: "general", label: "General" },
]

export function CompetitorForm({ competitor, onClose, onSuccess }: CompetitorFormProps) {
  const isEditing = !!competitor
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [name, setName] = useState(competitor?.name || "")
  const [description, setDescription] = useState(competitor?.description || "")
  const [category, setCategory] = useState(competitor?.category || "multi")
  const [websiteUrl, setWebsiteUrl] = useState(competitor?.website_url || "")
  const [amazonUrl, setAmazonUrl] = useState(competitor?.amazon_url || "")
  const [instagramUrl, setInstagramUrl] = useState(competitor?.instagram_url || "")
  const [tiktokUrl, setTiktokUrl] = useState(competitor?.tiktok_url || "")
  const [facebookUrl, setFacebookUrl] = useState(competitor?.facebook_url || "")
  const [twitterUrl, setTwitterUrl] = useState(competitor?.twitter_url || "")
  const [linkedinUrl, setLinkedinUrl] = useState(competitor?.linkedin_url || "")
  const [youtubeUrl, setYoutubeUrl] = useState(competitor?.youtube_url || "")
  const [logoUrl, setLogoUrl] = useState(competitor?.logo_url || "")
  const [foundedYear, setFoundedYear] = useState(competitor?.founded_year?.toString() || "")
  const [headquarters, setHeadquarters] = useState(competitor?.headquarters || "")
  const [notes, setNotes] = useState(competitor?.notes || "")
  const [tagsInput, setTagsInput] = useState(competitor?.tags?.join(", ") || "")
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    
    setIsSubmitting(true)
    
    const data = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      website_url: websiteUrl.trim() || null,
      amazon_url: amazonUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      twitter_url: twitterUrl.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      logo_url: logoUrl.trim() || null,
      founded_year: foundedYear ? parseInt(foundedYear, 10) : null,
      headquarters: headquarters.trim() || null,
      notes: notes.trim() || null,
      tags: tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : null,
    }
    
    try {
      const url = isEditing ? `/api/competitors/${competitor.id}` : "/api/competitors"
      const method = isEditing ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to save competitor")
      }
      
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-[16px] font-semibold text-neutral-900">
            {isEditing ? "Edit Competitor" : "Add Competitor"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-[13px] text-red-600">
              {error}
            </div>
          )}
          
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">
              Basic Information
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Company Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ritual"
                  className="h-9 text-[13px]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the company..."
                rows={2}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">
                  Logo URL
                </label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Calendar className="h-3 w-3" />
                  Founded Year
                </label>
                <Input
                  type="number"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Building className="h-3 w-3" />
                  Headquarters
                </label>
                <Input
                  value={headquarters}
                  onChange={(e) => setHeadquarters(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
          </div>
          
          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">
              Links
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Globe className="h-3 w-3" />
                  Website
                </label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <ShoppingCart className="h-3 w-3" />
                  Amazon
                </label>
                <Input
                  value={amazonUrl}
                  onChange={(e) => setAmazonUrl(e.target.value)}
                  placeholder="https://amazon.com/..."
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
          </div>
          
          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">
              Social Media
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Instagram className="h-3 w-3" />
                  Instagram
                </label>
                <Input
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  TikTok
                </label>
                <Input
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@..."
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Facebook className="h-3 w-3" />
                  Facebook
                </label>
                <Input
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Twitter className="h-3 w-3" />
                  Twitter/X
                </label>
                <Input
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://x.com/..."
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Linkedin className="h-3 w-3" />
                  LinkedIn
                </label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                  className="h-9 text-[13px]"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                  <Youtube className="h-3 w-3" />
                  YouTube
                </label>
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">
              Additional Information
            </h3>
            
            <div>
              <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                <Tag className="h-3 w-3" />
                Tags (comma-separated)
              </label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="DTC, Subscription, Gummies, Powder"
                className="h-9 text-[13px]"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-700 mb-1.5">
                <FileText className="h-3 w-3" />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this competitor..."
                rows={3}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-none"
              />
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-9 text-[13px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-9 text-[13px] gap-2 bg-neutral-900 hover:bg-neutral-800"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Competitor"}
          </Button>
        </div>
      </div>
    </div>
  )
}
