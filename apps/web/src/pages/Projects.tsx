import { ArrowRight, FolderKanban, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type Project, projectsService } from "@/services/projects.service"

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void projectsService
      .list()
      .then(setProjects)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load projects."),
      )
  }, [])

  async function handleCreate(event: { preventDefault: () => void }) {
    event.preventDefault()
    if (!title.trim()) {
      return
    }
    try {
      const project = await projectsService.create(title.trim(), description.trim())
      setProjects((current) => [project, ...current])
      setTitle("")
      setDescription("")
      setShowForm(false)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not create project.")
    }
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
        <Button onClick={() => setShowForm((current) => !current)}>
          <Plus /> New project
        </Button>
      </header>
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-6 grid gap-3 border border-primary/30 bg-card/80 p-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
        >
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Project title"
              maxLength={200}
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A short production brief"
              maxLength={5000}
            />
          </label>
          <Button type="submit" disabled={!title.trim()}>
            Create
          </Button>
        </form>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
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
      {projects.length === 0 && !error && (
        <div className="mt-8 border border-dashed border-border/70 p-12 text-center text-sm text-muted-foreground">
          Create your first movie project to begin organizing scenes.
        </div>
      )}
    </div>
  )
}
