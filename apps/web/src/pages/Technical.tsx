import { motion } from "framer-motion"
import { Braces, Database, GitBranch, Radio, Server, Sparkles } from "lucide-react"

import { SiteLayout } from "@/components/Layout"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

const architecture = [
  {
    icon: Sparkles,
    title: "Scene analysis and shot planning",
    description:
      "Gemini-backed agents turn screenplay text into editable scene metadata and a structured shot plan. Parallel Web supplies research results that ground cinematography recommendations.",
  },
  {
    icon: Server,
    title: "FastAPI application layer",
    description:
      "Authenticated API routes manage projects, scenes, shot plans, registered drones, and simulation commands for the studio workspace.",
  },
  {
    icon: Radio,
    title: "Virtual production runtime",
    description:
      "The simulation engine executes a shot plan for selected virtual drones. WebSockets stream drone state, camera activity, and AI vision updates to the browser.",
  },
  {
    icon: Database,
    title: "Persistent production data",
    description:
      "Projects, scenes, shot plans, drones, and simulation records are stored through SQLAlchemy models and tracked with Alembic migrations.",
  },
]

const stack = [
  "Python 3.11+",
  "React",
  "TypeScript",
  "Vite",
  "React Three Fiber",
  "Three.js",
  "Tailwind CSS",
  "Framer Motion",
  "FastAPI",
  "Uvicorn",
  "Pydantic",
  "Gemini",
  "Parallel Web",
  "SQLAlchemy",
  "Alembic",
  "asyncpg",
  "WebSockets",
  "PostgreSQL",
  "JWT",
  "TOTP / QR codes",
  "Shared Pydantic schemas",
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
              A studio for turning scenes into <span className="text-primary">testable shots.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              The web app takes a screenplay scene from first analysis to editable coverage and a
              live virtual-drone run, so camera decisions can be inspected before a physical shoot.
            </p>
          </motion.div>

          <section className="mt-16 max-w-4xl border-t border-border/60 pt-10">
            <h2 className="text-lg font-semibold">What the studio actually does</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              A user selects a project, submits scene text, reviews the AI-generated breakdown,
              chooses up to three registered drones, and creates a shot plan. The coverage and
              simulation stages then expose the plan as camera movements, director view, camera
              feeds, and in-flight vision analysis.
            </p>
          </section>

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
