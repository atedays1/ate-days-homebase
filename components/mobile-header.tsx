"use client"

import { Menu } from "lucide-react"
import Link from "next/link"

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 md:hidden">
      {/* Hamburger menu button */}
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Logo / Brand */}
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
          <span className="text-sm font-bold text-white">A</span>
        </div>
        <span className="text-[14px] font-semibold text-neutral-900">
          AteDays
        </span>
      </Link>

      {/* Spacer to balance the layout */}
      <div className="w-10" />
    </header>
  )
}
