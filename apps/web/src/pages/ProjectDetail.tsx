import {
  ArrowLeft,
  Check,
  Clapperboard,
  ExternalLink,
  FileVideoCamera,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { type Project, type ProjectScene, projectsService } from "@/services/projects.service"

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [scenes, setScenes] = useState<ProjectScene[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (!projectId) {
      return
    }
    void Promise.all([projectsService.get(projectId), projectsService.listScenes(projectId)])
      .then(([nextProject, nextScenes]) => {
        setProject(nextProject)
        setScenes(nextScenes)
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load project."),
      )
  }, [projectId])

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectId) {return}
    const form = new FormData(event.currentTarget)
    const title = String(form.get("title") ?? "").trim()
    const description = String(form.get("description") ?? "").trim()
    if (!title) {
      setError("Project title is required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      setProject(await projectsService.update(projectId, { title, description }))
      setEditing(false)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not update project.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject() {
    if (!projectId || !project) {return}
    setDeleting(true)
    setError(null)
    try {
      await projectsService.delete(projectId)
      setDeleteDialogOpen(false)
      navigate("/projects", { replace: true })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not delete project.")
      setDeleting(false)
    }
  }

  return (
    <div className="w-full h-full">
      <Button asChild variant="ghost" className="mb-6 -ml-2">
        <Link to="/projects">
          <ArrowLeft /> Projects
        </Link>
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {project && (
        <>
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
                Project workspace
              </p>
              {editing ? (
                <form onSubmit={saveProject} className="mt-3 grid max-w-2xl gap-3">
                  <input
                    name="title"
                    defaultValue={project.title}
                    maxLength={200}
                    autoFocus
                    className="border border-input bg-background px-3 py-2 text-xl font-semibold text-foreground focus:border-primary focus:outline-none"
                  />
                  <textarea
                    name="description"
                    defaultValue={project.description}
                    maxLength={5000}
                    rows={3}
                    className="border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      <Check /> {saving ? "Saving…" : "Save project"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                    >
                      <X /> Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight">{project.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {project.description || "No production description yet."}
                  </p>
                </>
              )}
            </div>
            {!editing && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleting}
                >
                  <Trash2 /> {deleting ? "Deleting…" : "Delete"}
                </Button>
                <Button asChild>
                  <Link to={`/studio?project=${project.project_id}`}>
                    <Clapperboard /> Open studio
                  </Link>
                </Button>
              </div>
            )}
          </header>
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Production contents
                </p>
                <h2 className="mt-1 text-xl font-semibold">Scenes</h2>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {scenes.length} scenes
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {scenes.map((scene) => (
                <div
                  key={scene.scene_id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-border/70 bg-card/80 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center bg-secondary/10 text-secondary">
                      <FileVideoCamera className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-medium">{scene.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Analysis saved · Shot plan available from Studio
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={`/studio/analysis?project=${project.project_id}&scene=${scene.scene_id}`}
                    >
                      Open scene <ExternalLink />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
            {scenes.length === 0 && (
              <div className="mt-4 border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
                Your analyzed project scenes will appear here.
              </div>
            )}
          </section>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes &quot;{project.title}&quot; and all scenes and shot plans
                  inside it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => void deleteProject()}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
