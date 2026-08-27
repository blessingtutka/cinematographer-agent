import { motion } from "framer-motion"
import { Braces, Database, GitBranch, Radio, Server, Sparkles } from "lucide-react"

import { SiteLayout } from "@/components/Layout"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

const architecture = [
  {
    icon: Sparkles,
    title: "AI orchestration",
    description:
      "Specialized agents analyze scenes, research references, and produce a validated shot plan.",
  },
  {
    icon: Server,
    title: "FastAPI services",
    description:
      "The API exposes scene, shot-plan, drone, and simulation workflows to the web client.",
  },
  {
    icon: Radio,
    title: "Live simulation",
    description:
      "WebSockets stream virtual drone state so the preview remains synchronized in real time.",
  },
  {
    icon: Database,
    title: "Structured persistence",
    description:
      "PostgreSQL and Alembic keep scenes, plans, and simulation data consistent and inspectable.",
  },
]

const stack = [
  "React",
  "TypeScript",
  "Vite",
  "FastAPI",
  "Pydantic",
  "Gemini",
  "WebSockets",
  "PostgreSQL",
]

function Technical() {
  return (
    <SiteLayout>
      <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-36 sm:px-6 lg:px-8">
        <div className="absolute inset-0 mesh-bg" />
        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge className="mb-5 border border-accent bg-accent text-accent-foreground">
              <Braces className="mr-1.5 h-3.5 w-3.5" />
              Technical Overview
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              A production pipeline for <span className="text-primary">cinematic decisions.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Cinematographer Agent connects structured AI analysis, shared schemas, and a live
              drone simulation into one workflow for exploring and validating shot plans.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {architecture.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                >
                  <Card className="h-full border-border/60 bg-card/70 p-7 backdrop-blur-sm">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-semibold">{item.title}</h2>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{item.description}</p>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          <section className="mt-16 border-t border-border/60 pt-10">
            <div className="flex items-center gap-3 text-foreground/80">
              <GitBranch className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Shared technology surface</h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {stack.map((technology) => (
                <span
                  key={technology}
                  className="rounded-full border border-border/60 bg-muted/60 px-4 py-2 text-sm text-muted-foreground"
                >
                  {technology}
                </span>
              ))}
            </div>
          </section>
        </div>
      </main>
    </SiteLayout>
  )
}

export default Technical
