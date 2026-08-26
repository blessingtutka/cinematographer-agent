# Implementation Plan: Cinematographer Agent

## Overview

Build the CA platform as a monorepo: scaffold the project structure and shared packages first, then implement the FastAPI backend (data layer, AI pipeline, drone abstraction, simulation engine, WebSocket), and finally the Next.js frontend (3D director view, camera feeds, control room UI). Property-based tests are wired in close to the code they validate to catch regressions early.

---

## Tasks

- [x] 1. Scaffold monorepo structure and shared packages
  - [x] 1.1 Initialise monorepo root, pnpm workspaces, and eslint-config package
    - Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`
    - Create root `package.json` with workspace scripts (`lint`, `test`)
    - Create `packages/eslint-config/index.js` exporting base ESLint + TypeScript rules
    - Create `packages/eslint-config/package.json`
    - _Requirements: 14.1, 14.5, 14.7_

  - [x] 1.2 Create `packages/shared-types` TypeScript package
    - Create `packages/shared-types/package.json` (name `@ca/shared-types`, references eslint-config via `workspace:*`)
    - Write `src/scene.ts` — `Character`, `Action`, `CinematicBeat`, `DialogueLine`, `SceneAnalysis`, `EmotionalTone`
    - Write `src/shot-plan.ts` — `ShotType`, `CameraMovement`, `Shot`, `ShotPlan`, `ResearchSource`
    - Write `src/drone.ts` — `Vector3`, `DroneStatus`, `CameraFeed`
    - Write `src/simulation.ts` — `SimulationState`, `Simulation`, all WebSocket event types
    - Write `src/index.ts` re-exporting all modules
    - _Requirements: 14.2, 14.4_

  - [x] 1.3 Create `packages/cinematography-schema` Python package
    - Create `packages/cinematography-schema/pyproject.toml` (uv-managed, pydantic v2 dep)
    - Write `src/schema.py` with all Pydantic v2 models: `ShotType`, `CameraMovement`, `EmotionalTone`, `Vector3`, `Character`, `Action`, `CinematicBeat`, `DialogueLine`, `SceneAnalysis`, `Shot`, `ResearchSource`, `ShotPlan`, `DroneStatus`, `SimulationState`, `Simulation`
    - Ensure package is importable as `from cinematography_schema.schema import ShotPlan`
    - _Requirements: 14.3, 15.1_

  - [x] 1.4 Scaffold `apps/api` FastAPI project
    - Create `apps/api/pyproject.toml` with runtime deps (fastapi, uvicorn, sqlalchemy[asyncio], alembic, asyncpg, google-generativeai, httpx, hypothesis) and dev deps (pytest, pytest-asyncio)
    - Create `apps/api/app/__init__.py`, `main.py` (bare FastAPI app factory), `config.py` (pydantic-settings `Settings`)
    - Create empty router stubs: `routers/scenes.py`, `routers/simulations.py`, `routers/drones.py`, `routers/health.py`
    - Create `apps/api/tests/__init__.py`, `tests/properties/__init__.py`
    - _Requirements: 14.1, 14.6_

  - [x] 1.5 Scaffold `apps/web` Next.js 14 project
    - Bootstrap Next.js 14 App Router project under `apps/web` with TypeScript, Tailwind CSS
    - Install shadcn/ui, Framer Motion, Lucide React, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), fast-check
    - Add `@ca/shared-types` as a workspace dependency
    - Create directory stubs: `components/scene-input/`, `components/scene-analysis/`, `components/shot-plan/`, `components/director-view/`, `components/camera-feeds/`, `components/control-bar/`, `hooks/`, `lib/`
    - _Requirements: 14.1, 14.4, 14.5_

- [x] 2. Database layer and migrations
  - [x] 2.1 Configure SQLAlchemy async session and Alembic
    - Write `apps/api/app/db/session.py` — async engine, `AsyncSession` factory, `get_db` FastAPI dependency
    - Run `alembic init apps/api/app/db/migrations` and configure `alembic.ini` and `env.py` for async SQLAlchemy
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 2.2 Write SQLAlchemy ORM models and initial Alembic migration
    - Write `apps/api/app/models/scene.py` — `SceneModel` (scene_id UUID PK, title, raw_text, analysis_json JSONB, timestamps)
    - Write `apps/api/app/models/shot_plan.py` — `ShotPlanModel` (plan_id UUID PK, scene_id FK, plan_json JSONB, created_at; UNIQUE on scene_id)
    - Write `apps/api/app/models/simulation.py` — `SimulationModel` (simulation_id UUID PK, scene_id FK, state TEXT, timestamps)
    - Generate and review Alembic migration `0001_initial.py` creating all three tables
    - _Requirements: 13.1, 13.2, 13.3, 13.6_

- [ ] 3. Cinematography schema property-based tests
  - [ ] 3.1 Write property tests for ShotPlan serialization round-trip (Property 10)
    - Create `apps/api/tests/properties/test_shot_plan_schema.py`
    - Use `hypothesis` `@given(st.from_type(ShotPlan))` to test `serialize → deserialize → equal` and `serialize(deserialize(serialize(x))) == serialize(x)`
    - Tag: `Feature: cinematographer-agent, Property 10: ShotPlan Serialization Round-Trip`
    - Also test `Property 5` (shot count in [1,20]) and `Property 7` (sequence monotonicity) in the same file
    - `@settings(max_examples=100)` on all property tests
    - _Requirements: 15.1, 15.2, 15.3, 4.1, 4.6_

  - [ ] 3.2 Write property tests for schema validation error completeness (Property 11)
    - Create `apps/api/tests/properties/test_schema_validation_errors.py`
    - Generate invalid payloads (wrong types, missing required fields, out-of-range values, bad enums) and assert structured errors contain non-empty `field_path` and `description`
    - Tag: `Feature: cinematographer-agent, Property 11: Schema Validation Error Completeness`
    - _Requirements: 15.4_

  - [ ] 3.3 Write property tests for Shot structural invariants (Property 6)
    - Add to `test_shot_plan_schema.py`
    - For any generated `Shot`, assert `shot_type ∈ ShotType`, `camera_movement ∈ CameraMovement`, `drone_name` non-empty, `rationale` length in [1, 500]
    - Tag: `Feature: cinematographer-agent, Property 6: Shot Structural Invariants`
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [~] 4. AI agent pipeline
  - [-] 4.1 Implement `Scene_Analyzer` agent
    - Write `apps/api/app/agents/scene_analyzer.py` — `async def analyze_scene(raw_text: str) -> SceneAnalysis`
    - Call Gemini with `response_schema=SceneAnalysis`; map `GeminiAPIError` → HTTP 502, post-Gemini failures → HTTP 500
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 4.2 Write property tests for SceneAnalysis structural invariants (Property 2 & 3)
    - Create `apps/api/tests/properties/test_scene_analysis_invariants.py`
    - Use `hypothesis` to verify all SceneAnalysis structural invariants and JSON round-trip equality
    - Tag: `Feature: cinematographer-agent, Property 2: SceneAnalysis Structural Invariants` and `Property 3: SceneAnalysis Round-Trip`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [-] 4.3 Implement `Research_Agent` agent
    - Write `apps/api/app/agents/research_agent.py` — `async def research(scene_analysis: SceneAnalysis) -> ResearchContext`
    - Build ≥ 2 search queries from emotional tone + cinematic beats; run `asyncio.gather` with 10-second `asyncio.wait_for` timeout
    - On timeout return `ResearchContext(research_sources=[], research_warning="Research data unavailable: timeout")`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 4.4 Write property tests for Research_Agent query invariants (Property 4)
    - Create `apps/api/tests/properties/test_research_agent.py`
    - For any valid `SceneAnalysis`, assert `_build_queries` returns ≥ 2 non-empty strings
    - Tag: `Feature: cinematographer-agent, Property 4: Research Query Invariants`
    - _Requirements: 3.1, 3.2_

  - [ ] 4.5 Implement `Cinematographer_Agent` agent
    - Write `apps/api/app/agents/cinematographer_agent.py` — `async def plan(scene_analysis, research_context, drone_inventory) -> ShotPlan`
    - Call Gemini with full context; validate against `cinematography-schema`; retry up to 2× on `ValidationError`
    - Raise `ShotPlanValidationError` (→ HTTP 500) if all attempts fail
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 4.6 Wire AI pipeline into `POST /api/scenes/{scene_id}/shot-plan` router
    - Update `apps/api/app/routers/scenes.py` to call Scene_Analyzer → Research_Agent → Cinematographer_Agent in sequence
    - Persist `SceneAnalysis` and `ShotPlan` to PostgreSQL in a single transaction; roll back on any failure
    - Handle overwrite case (Requirement 4.11) via upsert on `shot_plans.scene_id`
    - _Requirements: 4.7, 4.10, 4.11, 13.1, 13.2, 13.6_

- [ ] 5. Scene and Shot Plan HTTP endpoints
  - [ ] 5.1 Implement `POST /api/scenes/analyze` and scene GET endpoints
    - Implement `POST /api/scenes/analyze` — call `analyze_scene`, persist, return `SceneAnalysis`
    - Implement `GET /api/scenes/{scene_id}` — fetch from DB; 404 if not found
    - Implement `GET /api/scenes/{scene_id}/shots` — fetch ShotPlan, return ordered shots; 404 if no plan; 500 on read failure
    - _Requirements: 2.7, 2.8, 2.9, 4.8, 4.9, 4.12, 13.4, 13.5_

  - [ ] 5.2 Checkpoint — run `uv run pytest apps/api/tests/ -v` and confirm all passing
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Drone abstraction layer
  - [ ] 6.1 Implement `Drone` abstract base class and `VirtualDrone`
    - Write `apps/api/app/drone/base.py` — `Drone` ABC with `receive_shot`, `move_to`, `get_status`, `get_camera_feed`
    - Write `apps/api/app/drone/virtual_drone.py` — `VirtualDrone(Drone)` with internal position, orientation, trajectory_progress tracking
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 6.2 Implement `DroneManager`
    - Write `apps/api/app/drone/manager.py` — `DroneManager` with `register`, `dispatch_shot`, `get_all`, `get_by_id`, `get_by_name`, `return_all_home`
    - Inject drones at app startup; never import `VirtualDrone` in `manager.py`
    - On unknown `drone_name`: log error and skip Shot (Requirement 5.9)
    - _Requirements: 5.1, 5.4, 5.8, 5.9_

  - [ ] 6.3 Write property tests for DroneManager dispatch (Property 8)
    - Create `apps/api/tests/properties/test_drone_manager.py`
    - For any ShotPlan and registered set of named drones, assert `receive_shot` is called on exactly the matching drone
    - Tag: `Feature: cinematographer-agent, Property 8: DroneManager Dispatch by Name`
    - _Requirements: 5.4_

  - [ ] 6.4 Implement drone HTTP endpoints
    - Implement `GET /api/drones` — return all drone statuses
    - Implement `GET /api/drones/{drone_id}` — return status + active shot; 404 if not found; omit `active_shot` when none
    - _Requirements: 5.5, 5.6, 5.7_

- [ ] 7. Simulation engine and WebSocket streaming
  - [ ] 7.1 Implement `SimulationEngine` with asyncio tick loop
    - Write `apps/api/app/simulation/engine.py` — `SimulationEngine` with `start`, `pause`, `stop`, `_tick_loop` (~100 Hz), `_dispatch_shots`
    - `_tick_loop` publishes `DroneUpdateEvent` to `WebSocketManager` at ≥ 10 Hz
    - On `pause`: freeze all drones at current trajectory position
    - On `stop`: call `drone_manager.return_all_home()`
    - _Requirements: 6.2, 6.3, 6.4, 6.8, 7.1_

  - [ ] 7.2 Implement `WebSocketManager` and WebSocket endpoint
    - Write `apps/api/app/simulation/websocket.py` — `WebSocketManager` with `connect`, `disconnect`, `broadcast`
    - Register `/ws/simulations/{simulation_id}` endpoint in `main.py`
    - Emit snapshot on connect (Requirement 7.6); close with code 4004 on non-existent simulation (Requirement 7.5)
    - Emit `shot_started`, `shot_completed`, `state_change` events; close connection after `Paused`/`Completed` `state_change`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 7.3 Implement simulation lifecycle HTTP endpoints
    - Implement `POST /api/simulations` — create Simulation record in Created state; 422 if no ShotPlan exists; persist to DB
    - Implement `POST /api/simulations/{id}/start` — transition Created/Paused → Running; 404/409 guards; start `SimulationEngine.start()`
    - Implement `POST /api/simulations/{id}/pause` — transition Running → Paused; 404/409 guards
    - Implement `POST /api/simulations/{id}/stop` — transition Running/Paused → Completed; 404/409 guards
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9, 13.3_

  - [ ] 7.4 Write property tests for simulation state machine (Property 9)
    - Create `apps/api/tests/properties/test_simulation_state_machine.py`
    - For each valid/invalid transition, assert correct resulting state or 409 error
    - Tag: `Feature: cinematographer-agent, Property 9: Simulation State Machine Correctness`
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.7_

- [ ] 8. Health endpoint and observability
  - [ ] 8.1 Implement `GET /health` endpoint and request logging middleware
    - Write `apps/api/app/routers/health.py` — check DB connectivity and Gemini/Search reachability; return 200 or 503 with dependency breakdown
    - Add `logging` middleware to `main.py` logging method, path, status code, latency at INFO level
    - Add DEBUG-level logging in each AI agent for agent name, input token count, response latency
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 9. Backend checkpoint
  - [ ] 9.1 Checkpoint — run full backend test suite
    - Run `uv run pytest apps/api/tests/ -v --tb=short`
    - Ensure all unit tests, property tests, and integration tests pass; ask the user if questions arise.

- [ ] 10. Frontend shared infrastructure
  - [ ] 10.1 Implement `lib/api-client.ts` HTTP client
    - Write typed fetch wrappers for all HTTP endpoints: `analyzeScene`, `getShotPlan`, `getShots`, `getDrones`, `createSimulation`, `startSimulation`, `pauseSimulation`, `stopSimulation`
    - Import all request/response types from `@ca/shared-types`
    - _Requirements: 14.4_

  - [ ] 10.2 Implement `hooks/use-simulation-ws.ts` WebSocket hook
    - Subscribe to `/ws/simulations/{simulationId}`; parse and dispatch `DroneUpdateEvent`, `ShotStartedEvent`, `ShotCompletedEvent`, `SimulationStateChangeEvent`
    - Establish connection within 2 seconds of simulation entering Running state
    - _Requirements: 7.7_

  - [ ] 10.3 Implement `hooks/use-shot-plan.ts` data hook
    - Fetch and cache the current `ShotPlan`; expose loading and error states
    - _Requirements: 4.13_

- [ ] 11. Scene input and analysis panels
  - [ ] 11.1 Implement `SceneInputPanel` component
    - Multi-line textarea capped at 10,000 characters with submit button
    - Client-side validation: error if length < 10 or > 10,000; block submission on error; show/hide loading indicator; disable submit while in-flight
    - Display API error messages on failure
    - Animate panel transitions with Framer Motion (150–400ms)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 11.3_

  - [ ] 11.2 Write property tests for scene input validation (Property 1)
    - Create `apps/web/__tests__/properties/scene-input-validation.test.ts`
    - Use `fast-check` to assert validation returns non-empty error iff length < 10 or > 10,000
    - Tag: `Feature: cinematographer-agent, Property 1: Input Validation Completeness`
    - _Requirements: 1.3_

  - [ ] 11.3 Implement `SceneAnalysisPanel` component
    - Display characters (name, position), actions, emotions, cinematic beats (description, timestamp, significance score), dialogue lines
    - Import types from `@ca/shared-types`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 12. Shot plan panel and AI transparency UI
  - [ ] 12.1 Implement `ShotPlanPanel` component
    - List each Shot with type, movement, drone, subject, duration, rationale; show "No rationale provided" fallback
    - Display `cinematographer_notes` at the top of the panel
    - Display `research_sources` (query text + reference count)
    - Show associated `CinematicBeat` per Shot
    - Highlight selected/hovered Shot with visually distinct border/background; scroll active shot into view during playback
    - _Requirements: 4.13, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 3.7_

- [ ] 13. 3D Director View (React Three Fiber)
  - [ ] 13.1 Implement `DirectorViewPanel` base R3F canvas
    - Create `components/director-view/DirectorViewPanel.tsx` with `<Canvas>` and OrbitControls from Drei
    - Render static environment stage mesh; orbit, pan, zoom controls
    - _Requirements: 8.1, 8.8_

  - [ ] 13.2 Implement drone and character 3D representations
    - Add `<DroneModel>` component with name label, camera cone FOV indicator, red recording dot, pause visual treatment
    - Add `<CharacterModel>` component positioned from WebSocket state
    - Render trajectory paths as `<Line>` (Drei) for each planned shot
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6, 8.7, 11.6_

  - [ ] 13.3 Wire WebSocket state into Director View animations
    - Subscribe to `useSimulationWS`; animate each drone along its trajectory; cap lag to ≤ 100ms
    - Freeze animations on `Paused` state; update Character positions from events
    - _Requirements: 8.2, 8.7, 8.9_

- [ ] 14. Camera feeds panel
  - [ ] 14.1 Implement `CameraFeedsPanel` with first-person R3F viewports
    - Create `components/camera-feeds/CameraFeedsPanel.tsx`; default to first drone; allow drone selection via list/thumbnail grid
    - Render first-person `<PerspectiveCamera>` per drone from drone's position/orientation
    - Display on-screen overlay: Shot_Type, Camera_Movement, subject; "Standby" when no active shot
    - _Requirements: 9.1, 9.2, 9.3, 9.8_

  - [ ] 14.2 Implement camera movement animations in feeds
    - DOLLY_IN/OUT: animate camera forward/backward along depth axis
    - FOLLOW: track character position, keep centered in frame
    - PAN/TILT: apply angular rotation around vertical/horizontal axis
    - ORBIT: circle subject, keep subject centered
    - _Requirements: 9.4, 9.5, 9.6, 9.7_

- [ ] 15. Control bar and simulation controls
  - [ ] 15.1 Implement `ControlBar` component
    - Play, Pause, Stop buttons with Lucide icons; enable/disable based on simulation state rules
    - Persistent top-level status bar showing simulation state
    - Call `startSimulation`, `pauseSimulation`, `stopSimulation` via `api-client`
    - Animate state transitions with Framer Motion
    - _Requirements: 11.4, 11.5, 11.7, 11.3_

- [ ] 16. Director Control Room root layout
  - [ ] 16.1 Assemble `app/page.tsx` control room layout
    - Compose all panels: SceneInput, SceneAnalysis, ShotPlan, DirectorView, CameraFeeds, ControlBar
    - Apply Tailwind CSS layout so all panels are visible, non-overlapping, and fully functional at ≥ 1280px viewport
    - Consistently use shadcn/ui components and Lucide icons throughout
    - _Requirements: 11.1, 11.2, 11.7, 11.8_

- [ ] 17. Frontend checkpoint — run full frontend test suite
  - Ensure all component tests, property tests, and snapshot tests pass, ask the user if questions arise.
  - Run `pnpm --filter apps/web test --run`

- [ ] 18. Integration wiring and end-to-end validation
  - [ ] 18.1 Wire full AI pipeline integration test
    - Write `apps/api/tests/integration/test_pipeline.py` — `POST /api/scenes/analyze` → `POST /api/scenes/{id}/shot-plan` → `GET /api/scenes/{id}/shots` against a test PostgreSQL instance
    - _Requirements: 2.8, 4.8, 13.4, 13.5_

  - [ ] 18.2 Write simulation lifecycle integration test
    - Cover: create → start → pause → start → stop; assert state transitions and WebSocket events
    - Verify `drone_update` events emitted at ≥ 10 Hz over 1 second
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1_

  - [ ] 18.3 Write health-check integration test
    - Assert 200 with all deps healthy; assert 503 with DB mocked as unavailable
    - _Requirements: 12.1, 12.2, 12.5_

- [ ] 19. Final checkpoint — full stack green
  - Ensure all backend and frontend tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for full traceability
- Property tests use `hypothesis` (Python, `@settings(max_examples=100)`) and `fast-check` (TypeScript)
- The `Drone` abstract interface is the single architectural seam; `DroneManager` never imports `VirtualDrone` directly
- All domain objects persisted as JSONB; Pydantic models are the authoritative schema
- Alembic migrations must be generated and reviewed before running integration tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "3.1", "10.1", "10.2", "10.3"] },
    { "id": 3, "tasks": ["2.2", "3.2", "3.3", "4.1", "6.1", "11.1", "11.3"] },
    { "id": 4, "tasks": ["4.2", "4.3", "6.2", "8.1", "11.2", "12.1"] },
    { "id": 5, "tasks": ["4.4", "4.5", "6.3", "6.4", "13.1"] },
    { "id": 6, "tasks": ["4.6", "7.1", "7.2", "13.2"] },
    { "id": 7, "tasks": ["5.1", "7.3", "13.3", "14.1"] },
    { "id": 8, "tasks": ["7.4", "14.2", "15.1"] },
    { "id": 9, "tasks": ["9.1", "16.1"] },
    { "id": 10, "tasks": ["18.1", "18.2", "18.3"] },
    { "id": 11, "tasks": ["5.2"] }
  ]
}
```
