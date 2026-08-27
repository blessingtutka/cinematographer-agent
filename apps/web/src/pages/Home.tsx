import { motion, useScroll, useTransform } from "framer-motion"
import {
  ArrowRight,
  Brain,
  Camera,
  CheckCircle2,
  CirclePlay,
  Code,
  Drone,
  Film,
  Layers3,
  Move3D,
  Play,
  Sparkles,
  Target,
  Video,
  Zap,
} from "lucide-react"

import { SiteLayout } from "@/components/Layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

function Home() {
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 450], [1, 0.35])
  const heroScale = useTransform(scrollY, [0, 450], [1, 0.96])
  const heroY = useTransform(scrollY, [0, 450], [0, 70])

  const features = [
    {
      icon: Brain,
      title: "Understand the Scene",
      description:
        "The system reads a screenplay and identifies the characters, actions, emotions, dialogue, and important moments of the scene.",
    },
    {
      icon: Camera,
      title: "Design the Shots",
      description:
        "It transforms the scene into a cinematography plan, selecting appropriate camera angles, movements, perspectives, and framing.",
    },
    {
      icon: Drone,
      title: "Control Virtual Drones",
      description:
        "Each planned shot can be assigned to a virtual drone that reproduces the intended camera movement inside the 3D environment.",
    },
    {
      icon: Move3D,
      title: "Visualize Before Filming",
      description:
        "Directors can preview the planned shots in a 3D simulation before committing to physical production.",
    },
  ]

  const workflow = [
    {
      number: "01",
      icon: Film,
      title: "Provide a Scene",
      description:
        "Start with a screenplay scene containing the dialogue, characters, and actions.",
    },
    {
      number: "02",
      icon: Brain,
      title: "AI Understands It",
      description:
        "The AI analyzes the scene and identifies the elements that matter for cinematography.",
    },
    {
      number: "03",
      icon: Camera,
      title: "Create the Shot Plan",
      description:
        "A cinematography plan is generated with shots, camera movements, perspectives, and assignments.",
    },
    {
      number: "04",
      icon: Move3D,
      title: "Preview in 3D",
      description:
        "The virtual drones execute the plan so the director can see the result in a simulated environment.",
    },
  ]

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 mesh-bg" />

        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-glow-pulse" />

        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-tertiary/20 blur-3xl animate-glow-pulse animation-delay-1000" />

        <div className="absolute left-1/3 top-2/3 h-72 w-72 rounded-full bg-secondary/10 blur-3xl animate-glow-pulse animation-delay-2000" />

        <motion.div
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
          }}
          className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex"
          >
            <Badge className="border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI-Powered Cinematography
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <span className="bg-linear-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
              From Script
            </span>
            <br />
            <span className="bg-linear-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              to Cinematic Vision
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Cinematographer Agent transforms screenplay scenes into cinematic shot plans and brings
            them to life through an interactive 3D drone simulation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button className="group bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80 hover:shadow-primary/40">
              <CirclePlay className="mr-2 h-4 w-4" />
              Explore the Simulation
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>

            <Button
              variant="outline"
              className="border-border bg-transparent px-6 text-foreground hover:bg-muted"
            >
              <Code className="mr-2 h-4 w-4" />
              View Project
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-3"
          >
            {["AI Cinematography", "3D Simulation", "Virtual Drones", "Real-Time Control"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
                >
                  {item}
                </span>
              ),
            )}
          </motion.div>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground/70">
          <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>

          <div className="flex h-8 w-5 justify-center rounded-full border border-border pt-1.5">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-2 w-1 rounded-full bg-primary/60"
            />
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="relative border-t border-border/40 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-5 border border-tertiary/30 bg-tertiary/10 text-tertiary">
              <Target className="mr-1.5 h-3.5 w-3.5" />
              The Challenge
            </Badge>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Turning a script into{" "}
              <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                camera decisions
              </span>
            </h2>

            <p className="mt-5 leading-relaxed text-muted-foreground">
              Cinematography requires many decisions: where the camera should be positioned, how it
              should move, what it should focus on, and how each shot contributes to the story.
            </p>

            <p className="mt-4 leading-relaxed text-muted-foreground">
              Cinematographer Agent explores how AI can assist this process by turning
              natural-language scenes into structured and visual cinematography plans.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="relative overflow-hidden border-border/60 bg-card/70 p-8 backdrop-blur-sm">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Film className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-semibold">The idea</p>
                    <p className="text-sm text-muted-foreground">
                      From words to visual storytelling
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    "Screenplay",
                    "Scene understanding",
                    "Cinematography plan",
                    "3D drone simulation",
                  ].map((item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </div>

                      <span className="text-sm text-foreground/80">{item}</span>

                      {index < 3 && (
                        <ArrowRight className="ml-auto h-4 w-4 rotate-90 text-muted-foreground/60" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Workflow */}
      <section
        id="workflow"
        className="relative border-t border-border/40 px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-tertiary/15" />

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <Badge className="mb-4 border border-primary/20 bg-primary/10 text-primary">
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              How It Works
            </Badge>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              From scene to{" "}
              <span className="bg-linear-to-r from-primary to-tertiary bg-clip-text text-transparent">
                simulation
              </span>
            </h2>

            <p className="mt-4 text-muted-foreground">
              A simple workflow that connects creative direction with intelligent automation and
              visual experimentation.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-4">
            {workflow.map((step, index) => {
              const Icon = step.icon

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  className="relative"
                >
                  {index < workflow.length - 1 && (
                    <div className="absolute left-[calc(100%+4px)] top-12 hidden w-5 border-t border-dashed border-border md:block" />
                  )}

                  <Card className="h-full border-border/60 bg-card/70 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest text-primary">
                        {step.number}
                      </span>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-card-foreground">{step.title}</h3>

                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative border-t border-border/40 px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <Badge className="mb-4 border border-tertiary/30 bg-tertiary/10 text-tertiary">
              <Layers3 className="mr-1.5 h-3.5 w-3.5" />
              Capabilities
            </Badge>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Designed around the{" "}
              <span className="bg-linear-to-r from-tertiary to-primary bg-clip-text text-transparent">
                director
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-muted-foreground">
              The system focuses on making cinematographic experimentation faster, more visual, and
              easier to iterate.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full border-border/50 bg-card/60 p-7 backdrop-blur-sm transition-all duration-300 hover:border-primary/30">
                    <div className="flex gap-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/15">
                        <Icon className="h-6 w-6 text-primary" strokeWidth={1.6} />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">{feature.title}</h3>

                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Simulation */}
      <section
        id="simulation"
        className="relative overflow-hidden border-t border-border/40 px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0 bg-linear-to-b from-tertiary/15 via-primary/10 to-transparent" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-5 border border-secondary/50 bg-transparent text-secondary">
                <Video className="mr-1.5 h-3.5 w-3.5" />
                3D Simulation
              </Badge>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span> See the shot </span>
                <span className="inline-block bg-linear-to-r from-secondary to-primary bg-clip-text text-transparent">
                  before the camera rolls
                </span>
              </h2>

              <p className="mt-5 leading-relaxed text-muted-foreground">
                Instead of relying only on descriptions, the system provides a visual environment
                where virtual drones can execute the generated cinematography plan.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  "Preview camera positions",
                  "Follow drone movements",
                  "Experiment with different shots",
                  "Validate the plan visually",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
                <div className="absolute inset-0 bg-linear-to-br from-primary/30 via-card to-tertiary/20" />

                <div className="absolute inset-6 rounded-xl border border-border/60 bg-background/40">
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                        <Drone className="h-8 w-8" />
                      </div>

                      <p className="font-semibold">3D Simulation</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your virtual production environment
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute left-5 top-5 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
                  CAMERA 01
                </div>

                <div className="absolute bottom-5 right-5 rounded-lg border border-secondary/50 bg-transparent px-3 py-2 text-xs text-secondary backdrop-blur-sm">
                  ● SIMULATION LIVE
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border/40 px-4 py-28 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-linear-to-b from-primary/15 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-3xl text-center"
        >
          <Badge className="mb-5 border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Explore the Project
          </Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Imagine the shot.
            <br />
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Then see it happen.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Explore how AI, cinematography, and 3D simulation come together to create a new approach
            to visual storytelling.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button className="bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80">
              <Play className="mr-2 h-4 w-4" />
              Launch Demo
            </Button>

            <Button
              variant="outline"
              className="border-border bg-transparent px-6 text-foreground hover:bg-muted hover:text-secondary"
            >
              Technical Overview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>
    </SiteLayout>
  )
}

export default Home
