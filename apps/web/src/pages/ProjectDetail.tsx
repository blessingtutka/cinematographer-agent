import { ArrowLeft, Clapperboard, ExternalLink, FileVideoCamera } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { type Project, type ProjectScene, projectsService } from "@/services/projects.service"

export default function ProjectDetail() {
  const { projectId } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [scenes, setScenes] = useState<ProjectScene[]>([])
  const [error, setError] = useState<string | null>(null)

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
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
                Project workspace
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{project.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {project.description || "No production description yet."}
              </p>
            </div>
            <Button asChild>
              <Link to={`/studio?project=${project.project_id}`}>
                <Clapperboard /> Open studio
              </Link>
            </Button>
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
                    <Link to={`/studio?project=${project.project_id}&scene=${scene.scene_id}`}>
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
        </>
      )}
    </div>
  )
}
