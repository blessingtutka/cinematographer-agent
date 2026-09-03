import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, FolderKanban, LoaderCircle, Plus } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type Project, projectsService } from "@/services/projects.service"

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    void projectsService
      .list()
      .then(setProjects)
      .catch((reason: unknown) =>
        setLoadError(reason instanceof Error ? reason.message : "Could not load projects."),
      )
  }, [])

  function handleCreated(project: Project) {
    setProjects((current) => [project, ...current])
    setOpen(false)
  }

  return (
    <div className="w-full h-full">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Production library
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Movie projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize scenes, coverage, and simulation runs by production.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> New project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                Give your production a title and an optional brief.
              </DialogDescription>
            </DialogHeader>
            <CreateProjectForm onCreated={handleCreated} />
          </DialogContent>
        </Dialog>
      </header>

      {loadError && <p className="mt-4 text-sm text-destructive">{loadError}</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.project_id}
            to={`/projects/${project.project_id}`}
            className="group border border-border/70 bg-card/80 p-5 transition-colors hover:border-primary/60 hover:bg-card"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-10 items-center justify-center bg-primary/10 text-primary">
                <FolderKanban />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <h2 className="mt-6 text-lg font-semibold">{project.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {project.description || "No production description yet."}
            </p>
          </Link>
        ))}
      </div>

      {projects.length === 0 && !loadError && (
        <div className="mt-8 border border-dashed border-border/70 p-12 text-center text-sm text-muted-foreground">
          Create your first movie project to begin organizing scenes.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create form — lives inside the Dialog, manages its own state
// ---------------------------------------------------------------------------

type CreateProjectFormProps = {
  onCreated: (project: Project) => void
}

function CreateProjectForm({ onCreated }: CreateProjectFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError("Title is required.")
      return
    }
    if (trimmedTitle.length > 200) {
      setError("Title must be 200 characters or fewer.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const project = await projectsService.create(trimmedTitle, description.trim())
      onCreated(project)
    } catch {
      setError("Could not create project. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Title
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (error) {setError(null)}
            }}
            placeholder="e.g. The Sunshine Maya"
            maxLength={200}
            autoFocus
            disabled={submitting}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Description
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short production brief (optional)"
            maxLength={5000}
            rows={3}
            disabled={submitting}
            className="resize-none"
          />
        </label>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <DialogFooter className="mt-2" showCloseButton>
        <Button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? <LoaderCircle className="animate-spin" /> : <Plus />}
          {submitting ? "Creating…" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  )
}
