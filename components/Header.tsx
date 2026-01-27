"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/ThemeToggle"

export default function Header() {
  const pathname = usePathname()
  const isTeamPage = pathname.startsWith("/team/")

  return (
    <header className="sticky top-0 z-50 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        
        {/* LOGO SULPET */}
        <Image
          src="/logos/sulpet.png"
          alt="Sulpet"
          width={150}
          height={45}
          priority
          className="object-contain"
        />

        {/* AÇÕES DIREITA */}
        <div className="flex items-center gap-2">
          
          {/* BOTÃO VOLTAR (APENAS EM /team) */}
          {isTeamPage && (
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-[rgb(var(--border))]"
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
            </Link>
          )}

          {/* TOGGLE CLARO / ESCURO */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
