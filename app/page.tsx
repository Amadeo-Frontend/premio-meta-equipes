import Link from "next/link"
import Image from "next/image"
import { teams } from "@/data/teams"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-10 text-center text-3xl font-bold">
        Premiação por Crescimento
      </h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(teams).map(([slug, team]) => (
          <Link key={slug} href={`/team/${slug}`} className="block">
            <Card
              className="
                h-[220px]
                cursor-pointer
                border border-[rgb(var(--border))]
                bg-[rgb(var(--card))]
                transition
                hover:shadow-lg
                hover:scale-[1.01]
              "
            >
              <CardHeader className="flex h-full flex-col items-center justify-center gap-4">
                {team.logo ? (
                  <Image
                    src={team.logo}
                    alt={team.name}
                    width={110}
                    height={60}
                    className="object-contain"
                    priority
                  />
                ) : null}

                <CardTitle className="text-center text-lg">{team.name}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
