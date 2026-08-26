# Requirements Document

## Introduction

CA (Cinematographer Agent) is an AI-powered autonomous cinematography platform that transforms a screenplay scene into an executable cinematography plan. The system analyzes screenplay text to understand characters, actions, dialogue, and emotional beats, then generates a structured shot plan that is executed by named virtual camera drones in a 3D digital-twin simulation. The platform presents itself as a professional virtual film production control room, enabling directors to visualize how an AI cinematographer would interpret and capture their scene. The architecture is explicitly designed so that the virtual drone layer can be replaced by real physical drone adapters without modifying the AI, cinematography planning, or frontend application.

---

## Glossary

- **CA**: Cinematographer Agent — the overall system.
- **Scene**: A screenplay excerpt containing characters, dialogue, actions, and emotional context submitted by the director.
- **Scene_Analyzer**: The AI agent responsible for parsing a screenplay scene into structured domain objects (characters, actions, emotions, cinematic beats).
- **Research_Agent**: The AI agent that queries the Parallel Search API to retrieve cinematography references and domain knowledge at runtime.
- **Cinematographer_Agent**: The AI agent that combines scene analysis and research results with available drone inventory to produce a validated ShotPlan.
- **ShotPlan**: A structured, validated document listing ordered shots, drone assignments, camera movements, and cinematographic justifications.
- **Shot**: A single camera capture instruction, including shot type, camera movement, assigned drone, subject, duration, and rationale.
- **Drone**: An abstract interface representing a camera-carrying agent that can receive and execute shot instructions.
- **VirtualDrone**: The MVP implementation of the Drone interface that operates within the 3D simulation environment.
- **DroneManager**: The orchestration layer that receives a ShotPlan and dispatches shot instructions to the correct Drone instances.
- **Simulation**: A runtime execution of a ShotPlan in the 3D digital-twin environment, with a lifecycle of Created → Running → Paused → Completed.
- **Trajectory**: The 3D path a Drone follows during the execution of a shot.
- **CinematicBeat**: A narratively or emotionally significant moment within the scene identified by the Scene_Analyzer.
- **Character**: A named person present in the scene with associated position, movement, and dialogue.
- **Director_View**: The primary UI panel showing the 3D simulation environment from an overhead or freely positioned perspective.
- **Camera_Feed**: The first-person viewport rendered from a specific Drone's virtual camera.
- **Parallel_Search_API**: The external search service used by the Research_Agent to retrieve cinematography references.
- **Shot_Type**: One of WIDE, MEDIUM, CLOSE_UP, EXTREME_CLOSE_UP, OVER_SHOULDER, LOW_ANGLE, HIGH_ANGLE.
- **Camera_Movement**: One of STATIC, MOVE_TO, DOLLY_IN, DOLLY_OUT, TRACK, FOLLOW, ORBIT, PAN, TILT.
- **WebSocket**: A persistent bidirectional connection used to stream real-time simulation state updates to the frontend.
- **Monorepo**: The unified repository containing apps/web, apps/api, and shared packages.

---

## Requirements

### Requirement 1: Screenplay Scene Ingestion

**User Story:** As a director, I want to paste a screenplay scene into CA, so that the system can analyze it and begin building a cinematography plan.

#### Acceptance Criteria

1. THE CA_Frontend SHALL provide a multi-line text input area that accepts plain-text screenplay content of up to 10,000 characters.
2. WHEN the director submits a scene, THE CA_Frontend SHALL send the raw scene text to the `POST /api/scenes/analyze` endpoint.
3. IF the submitted scene text is empty, contains fewer than 10 characters, or exceeds 10,000 characters, THEN THE CA_Frontend SHALL display a validation error message identifying which constraint was violated, and SHALL NOT submit the request to the API.
4. WHEN a client-side validation error is detected, THE CA_Frontend SHALL display the validation error message and SHALL NOT display any API error message.
5. WHILE the scene analysis request is in progress, THE CA_Frontend SHALL display a loading indicator and SHALL disable the submit control.
6. WHEN the scene analysis request completes successfully, THE CA_Frontend SHALL hide the loading indicator and re-enable the submit control.
7. WHEN the scene analysis request returns an error response, THE CA_Frontend SHALL hide the loading indicator, re-enable the submit control, and display an error message describing the failure.

---

### Requirement 2: Scene Analysis

**User Story:** As a director, I want CA to understand the characters, actions, emotions, and cinematic beats in my scene, so that the AI has the necessary context to plan cinematography.

#### Acceptance Criteria

1. WHEN a scene is submitted to `POST /api/scenes/analyze`, THE Scene_Analyzer SHALL extract all named characters present in the scene and return each with a unique character_id, display name, and initial position.
2. WHEN a scene is submitted to `POST /api/scenes/analyze`, THE Scene_Analyzer SHALL extract all physical actions and movements described in the scene and associate each action with the character performing it.
3. WHEN a scene is submitted to `POST /api/scenes/analyze`, THE Scene_Analyzer SHALL identify the dominant emotional tone for each narrative segment and return it as an enumerated value from: NEUTRAL, TENSE, ROMANTIC, MELANCHOLIC, JOYFUL, FEARFUL, ANGRY.
4. WHEN a scene is submitted to `POST /api/scenes/analyze`, THE Scene_Analyzer SHALL identify all CinematicBeats — narratively or emotionally significant moments — and return each with a description, timestamp offset, and significance score from 1–10.
5. WHEN a scene is submitted to `POST /api/scenes/analyze`, THE Scene_Analyzer SHALL extract all dialogue lines and associate each with the speaking character's character_id and the narrative position at which the line occurs.
6. THE Scene_Analyzer SHALL return a structured scene analysis object conforming to the Pydantic v2 schema that includes: scene_id, title, characters, actions, emotions, cinematic_beats, and dialogue.
7. IF the Gemini API returns an error during scene analysis, THEN THE Scene_Analyzer SHALL return HTTP status 502 and a descriptive message identifying the upstream failure. IF a non-Gemini internal processing step fails after a successful Gemini response, THEN THE API SHALL return HTTP status 500 with a descriptive message.
8. WHEN a `GET /api/scenes/{scene_id}` request is made for a scene that exists, THE API SHALL return the full scene analysis object persisted during the most recent successful analysis for that scene_id.
9. IF a `GET /api/scenes/{scene_id}` request is made for a scene_id that does not exist, THEN THE API SHALL return HTTP status 404.

---

### Requirement 3: Cinematography Research

**User Story:** As a director, I want CA to consult real cinematography references before planning shots, so that the resulting shot plan is grounded in established cinematic techniques.

#### Acceptance Criteria

1. WHEN a shot plan is requested for a scene, THE Research_Agent SHALL construct search queries derived from the scene's identified emotional tone and CinematicBeats and submit them to the Parallel_Search_API.
2. THE Research_Agent SHALL execute at least two parallel search queries per shot plan request to retrieve diverse cinematography references.
3. WHEN the Parallel_Search_API returns results for a query, THE Research_Agent SHALL extract relevant shot techniques, framing guidance, and lighting context from those results.
4. IF the Parallel_Search_API returns no results for all submitted queries, THEN THE Research_Agent SHALL proceed with scene analysis data alone and set the `research_sources` field to an empty list.
5. IF the Parallel_Search_API does not respond within 10 seconds, THEN THE Research_Agent SHALL proceed with scene analysis data alone and include a `research_warning` field in the ShotPlan indicating that research data was unavailable.
6. THE ShotPlan SHALL include a `research_sources` field containing, for each query submitted: the query text and the number of references retrieved.
7. WHEN a generated ShotPlan is displayed, THE CA_Frontend SHALL render the `research_sources` field showing each query text and its reference count.

---

### Requirement 4: Shot Plan Generation

**User Story:** As a director, I want CA to generate a structured cinematography shot plan, so that I can review the AI's intended approach before running the simulation.

#### Acceptance Criteria

1. WHEN the director requests a shot plan via `POST /api/scenes/{scene_id}/shot-plan`, THE Cinematographer_Agent SHALL produce a ShotPlan containing between 1 and 20 Shots inclusive.
2. THE Cinematographer_Agent SHALL assign each Shot a Shot_Type drawn exclusively from: WIDE, MEDIUM, CLOSE_UP, EXTREME_CLOSE_UP, OVER_SHOULDER, LOW_ANGLE, HIGH_ANGLE.
3. THE Cinematographer_Agent SHALL assign each Shot a Camera_Movement drawn exclusively from: STATIC, MOVE_TO, DOLLY_IN, DOLLY_OUT, TRACK, FOLLOW, ORBIT, PAN, TILT.
4. THE Cinematographer_Agent SHALL assign each Shot to exactly one named Drone from the available Drone inventory.
5. THE Cinematographer_Agent SHALL include a natural-language rationale for each Shot of between 1 and 500 characters explaining why that framing and movement was chosen given the scene's emotional and narrative context.
6. THE Cinematographer_Agent SHALL sequence Shots in narrative order aligned with the scene's CinematicBeats.
7. THE ShotPlan SHALL be validated against the cinematography-schema Pydantic model before being persisted; IF validation fails, THEN THE Cinematographer_Agent SHALL re-invoke the AI model up to two additional times; IF all attempts fail validation, THEN THE API SHALL return HTTP status 500 with a descriptive message and SHALL NOT persist any partial result.
8. WHEN a `GET /api/scenes/{scene_id}/shots` request is made and a ShotPlan exists, THE API SHALL return the ordered list of Shots from the persisted ShotPlan.
9. IF no ShotPlan exists for a scene_id when `GET /api/scenes/{scene_id}/shots` is called, THEN THE API SHALL return HTTP status 404.
10. IF `POST /api/scenes/{scene_id}/shot-plan` is called for a scene_id that does not exist, THEN THE API SHALL return HTTP status 404.
11. IF a ShotPlan already exists for the scene_id when `POST /api/scenes/{scene_id}/shot-plan` is called, THEN THE API SHALL overwrite the existing ShotPlan with the newly generated one and return the new ShotPlan.
12. IF a ShotPlan exists but cannot be read (e.g., corrupted or incomplete) when `GET /api/scenes/{scene_id}/shots` is called, THEN THE API SHALL return HTTP status 500 with a descriptive message indicating the read failure.
13. WHEN the CA_Frontend receives a successful shot plan response, THE CA_Frontend SHALL display the generated ShotPlan listing each Shot's type, movement, assigned drone, subject, duration, and rationale.

---

### Requirement 5: Drone Abstraction Layer

**User Story:** As a platform architect, I want the drone interaction layer to be decoupled from the AI and simulation implementations, so that VirtualDrone instances can be replaced by RealDrone adapters in the future without rewriting the AI, planning, or frontend code.

#### Acceptance Criteria

1. THE DroneManager SHALL interact exclusively with the abstract Drone interface and SHALL NOT reference VirtualDrone or any concrete implementation directly.
2. THE Drone interface SHALL define the following operations: `receive_shot(shot: Shot)`, `move_to(trajectory: Trajectory)`, `get_status() -> DroneStatus`, and `get_camera_feed() -> CameraFeed`.
3. THE VirtualDrone SHALL implement all operations defined in the Drone interface.
4. WHEN a ShotPlan is started, THE DroneManager SHALL dispatch each Shot to the Drone instance held by the DroneManager at the time of dispatch whose name matches the Shot's assigned drone field.
5. THE `GET /api/drones` endpoint SHALL return the list of Drone instances held by the DroneManager at the time of the request, each with its current status.
6. WHEN a `GET /api/drones/{drone_id}` request is made for a drone that exists, THE API SHALL return the Drone's current status and active shot; IF no shot is currently active, the active shot field SHALL be absent from the response.
7. IF a `GET /api/drones/{drone_id}` request references a drone_id that does not exist in the DroneManager, THEN THE API SHALL return HTTP status 404.
8. WHERE a RealDrone adapter is introduced, THE DroneManager SHALL accept the RealDrone without requiring changes to the Cinematographer_Agent, ShotPlan schema, or frontend application.
9. IF a Shot references a drone name that does not match any Drone instance registered with the DroneManager, THEN THE DroneManager SHALL log an error and skip that Shot, continuing execution of remaining Shots.

---

### Requirement 6: Simulation Lifecycle Management

**User Story:** As a director, I want to start, pause, and stop the simulation, so that I can control the playback of the shot plan execution at my own pace.

#### Acceptance Criteria

1. WHEN the director calls `POST /api/simulations` with a valid `scene_id` body parameter referencing a scene that has an associated ShotPlan, THE API SHALL create a new Simulation in the Created state and return the simulation_id and initial state.
2. WHEN the director calls `POST /api/simulations/{id}/start` for a Simulation in Created or Paused state, THE API SHALL transition the Simulation to Running state, begin dispatching Shots to the DroneManager, and return HTTP status 200 with a response body confirming the new simulation state.
3. WHEN the director calls `POST /api/simulations/{id}/pause`, THE Simulation SHALL transition from Running to Paused state, all VirtualDrones SHALL halt movement at their current position along their active Trajectory, and THE API SHALL return HTTP status 200 with a response body confirming the new simulation state.
4. WHEN the director calls `POST /api/simulations/{id}/stop`, THE Simulation SHALL transition to Completed state, all VirtualDrones SHALL return to their pre-simulation home positions as defined in the DroneManager's drone registry, and THE API SHALL return HTTP status 200 with a response body confirming the new simulation state.
5. IF a start, pause, or stop command is issued for a simulation_id that does not exist, THEN THE API SHALL return HTTP status 404.
6. IF a pause command is issued for a Simulation that is not in Running state, THEN THE API SHALL return HTTP status 409 and a descriptive message.
7. IF a start command is issued for a Simulation in Completed state, or a stop command is issued for a Simulation in Created state, THEN THE API SHALL return HTTP status 409 and a descriptive message.
8. WHEN the Simulation transitions to a new state, THE Simulation SHALL publish a state-change event over the WebSocket at `/ws/simulations/{simulation_id}` containing the simulation_id, new state, and UTC timestamp.
9. IF `POST /api/simulations` is called with a `scene_id` that has no associated ShotPlan, THEN THE API SHALL return HTTP status 422 and a descriptive message.

---

### Requirement 7: Real-Time Simulation Streaming

**User Story:** As a director, I want the 3D simulation to update in real time as drones execute their shots, so that I can observe the live cinematography plan being carried out.

#### Acceptance Criteria

1. WHILE a Simulation is in Running state, THE WebSocket endpoint `/ws/simulations/{simulation_id}` SHALL emit drone position, orientation, active shot, and recording status updates at a minimum frequency of 10 Hz, regardless of whether the scene state has changed since the last emission.
2. WHEN a VirtualDrone begins executing a new Shot and a WebSocket client is connected, THE WebSocket SHALL emit a `shot_started` event containing the shot_id, drone_id, shot type, camera movement, and subject.
3. WHEN a VirtualDrone completes a Shot and a WebSocket client is connected, THE WebSocket SHALL emit a `shot_completed` event containing the shot_id, drone_id, shot type, camera movement, and subject.
4. WHEN the Simulation transitions to Paused or Completed state and a WebSocket client is connected, THE WebSocket server SHALL emit a state-change event containing the new simulation state, then close the connection.
5. IF a client connects to the WebSocket for a simulation_id that does not exist, THEN THE WebSocket server SHALL close the connection with status code 4004 and a descriptive message.
6. WHEN a client connects to the WebSocket for a simulation_id that is in Running state, THE WebSocket server SHALL emit a snapshot of the current state of all VirtualDrones — including position, orientation, active shot, and recording status — before emitting any subsequent incremental updates.
7. THE CA_Frontend SHALL establish a WebSocket connection to `/ws/simulations/{simulation_id}` within 2 seconds of the simulation entering Running state and SHALL update the 3D scene in response to each received event.

---

### Requirement 8: 3D Digital-Twin Simulation Environment

**User Story:** As a director, I want to see a 3D simulation of the virtual production environment, so that I can understand how the drones will position themselves and capture the scene.

#### Acceptance Criteria

1. THE Director_View SHALL render a 3D scene using React Three Fiber containing representations of all Characters, all VirtualDrones, and the environment stage.
2. WHILE a Simulation is in Running state, THE Director_View SHALL animate each VirtualDrone along its current Trajectory such that the visual position lags behind the WebSocket-reported position by no more than 100ms.
3. WHEN a ShotPlan is loaded, THE Director_View SHALL render each VirtualDrone's planned Trajectory as a visible 3D path so that the director can see planned movement arcs before and during simulation.
4. THE Director_View SHALL display a visual cone indicator on each VirtualDrone representing its camera's direction and field of view angle as specified in the active Shot's camera parameters.
5. WHEN a VirtualDrone is actively recording a Shot, THE Director_View SHALL display a red visual recording indicator on that drone.
6. THE Director_View SHALL label each VirtualDrone with its assigned name (e.g., "Drone A", "Drone B", "Drone C").
7. WHEN the Director_View receives a WebSocket state update, THE Director_View SHALL update each Character's position to match the state reported in the update.
8. THE Director_View SHALL support camera orbit, pan, and zoom controls so the director can inspect the environment from any angle.
9. WHEN the Simulation transitions to Paused state, THE Director_View SHALL freeze all VirtualDrone animations at their current positions until the Simulation resumes.

---

### Requirement 9: Individual Camera Feeds

**User Story:** As a director, I want to preview the first-person camera feed from each individual drone, so that I can evaluate the composition and framing of each shot.

#### Acceptance Criteria

1. THE CA_Frontend SHALL display a camera feed panel showing the virtual camera output rendered from the active Drone's perspective using React Three Fiber.
2. THE CA_Frontend SHALL always display a camera feed panel; WHEN no drone has been explicitly selected, THE CA_Frontend SHALL default the camera feed panel to the first available Drone's feed.
3. THE CA_Frontend SHALL allow the director to switch between camera feeds of different Drones by selecting the desired drone from a list or thumbnail grid.
4. WHEN a VirtualDrone executes a DOLLY_IN movement, THE Camera_Feed SHALL animate the virtual camera moving forward along its depth axis toward the subject. WHEN a VirtualDrone executes a DOLLY_OUT movement, THE Camera_Feed SHALL animate the virtual camera moving backward along its depth axis away from the subject.
5. WHEN a VirtualDrone executes a FOLLOW movement, THE Camera_Feed SHALL track the target Character's position continuously, keeping the character centered in the frame.
6. WHEN a VirtualDrone executes a PAN or TILT movement, THE Camera_Feed SHALL reflect the corresponding angular rotation of the virtual camera around its vertical or horizontal axis respectively.
7. WHEN a VirtualDrone executes an ORBIT movement, THE Camera_Feed SHALL render from the drone's perspective as it circles the subject, keeping the subject centered in frame as the surrounding environment rotates.
8. WHILE the Camera_Feed is active, THE Camera_Feed SHALL display an on-screen overlay indicating the current Shot_Type, Camera_Movement, and assigned subject for the active shot; IF no shot is active, the overlay SHALL display a standby indicator.

---

### Requirement 10: Shot Rationale and AI Transparency

**User Story:** As a director, I want to understand why the AI chose each shot, so that I can evaluate the creative decisions and build confidence in the system.

#### Acceptance Criteria

1. THE CA_Frontend SHALL display the natural-language rationale for each Shot at all times in the ShotPlan panel.
2. WHEN the director selects or hovers over a Shot, THE CA_Frontend SHALL apply a visually distinct highlight (e.g., border, background change, or expanded detail row) to that Shot's rationale, differentiating it from unselected shots.
3. THE CA_Frontend SHALL display the CinematicBeat associated with each Shot in the ShotPlan panel, so that the director can trace each shot back to a specific narrative moment.
4. THE CA_Frontend SHALL display the `research_sources` used for the current ShotPlan, scoped to the current scene, showing each query text and its reference count; IF a Shot has no associated rationale, THE CA_Frontend SHALL display "No rationale provided" in place of the rationale text.
5. WHEN a Shot becomes active during simulation playback, THE CA_Frontend SHALL apply the same visually distinct highlight to that Shot in the ShotPlan panel and scroll it into view if not already visible.
6. THE ShotPlan SHALL include a `cinematographer_notes` field containing an overall summary of the creative approach taken for the scene.
7. THE CA_Frontend SHALL display the `cinematographer_notes` summary at the top of the ShotPlan panel.

---

### Requirement 11: Director Control Room UI

**User Story:** As a director, I want the CA interface to feel like a professional virtual film production control room, so that the tool is intuitive and inspiring to use during creative work.

#### Acceptance Criteria

1. THE CA_Frontend SHALL organize the interface into clearly labeled panels: Scene Input, Scene Analysis, Shot Plan, Director View (3D simulation), and Camera Feeds.
2. THE CA_Frontend SHALL use Tailwind CSS and shadcn/ui components consistently throughout the interface.
3. THE CA_Frontend SHALL animate panel transitions and state changes using Framer Motion with animation durations between 150ms and 400ms to provide fluid visual feedback.
4. THE CA_Frontend SHALL display the simulation state (Created / Running / Paused / Completed) in a persistent top-level status bar that remains visible at all times.
5. THE CA_Frontend SHALL provide Play, Pause, and Stop controls; THE Play control SHALL be enabled only when Simulation state is Created or Paused; THE Pause control SHALL be enabled only when Simulation state is Running; THE Stop control SHALL be enabled only when Simulation state is Running or Paused.
6. WHEN the Simulation is in Paused state, THE CA_Frontend SHALL render paused VirtualDrone representations in the Director_View with a visually distinct treatment (e.g., greyed-out color or pause icon overlay) that differs from their running appearance.
7. THE CA_Frontend SHALL use Lucide icons for all iconographic UI elements.
8. THE CA_Frontend SHALL render all panels visible, non-overlapping, and fully functional at viewport widths of 1280px and above.

---

### Requirement 12: Health and Observability

**User Story:** As a platform operator, I want a health check endpoint, so that I can confirm the API is running and connected to its dependencies.

#### Acceptance Criteria

1. WHEN the `GET /health` endpoint is requested and all dependencies (database and AI services) are reachable, THE API SHALL return HTTP status 200 and a JSON body with a status field indicating the service is healthy.
2. WHEN any dependency is unavailable, THE `GET /health` endpoint SHALL return HTTP status 503 and a JSON body identifying which dependency is unhealthy.
3. THE API SHALL log all incoming HTTP requests and outgoing responses at INFO level, including method, path, status code, and latency in milliseconds.
4. THE API SHALL log all AI agent invocations at DEBUG level, including the agent name, input token count, and response latency in milliseconds.
5. WHEN the Gemini or Parallel AI service is unavailable at health check time, THE `GET /health` endpoint SHALL return HTTP status 503 and identify the unavailable AI service in the response body.

---

### Requirement 13: Data Persistence

**User Story:** As a director, I want my analyzed scenes and shot plans to be persisted, so that I can retrieve them after navigating away or refreshing the application.

#### Acceptance Criteria

1. WHEN a scene analysis is completed successfully, THE API SHALL persist the scene analysis object to PostgreSQL with a unique scene_id.
2. WHEN a ShotPlan is generated successfully, THE API SHALL persist the ShotPlan to PostgreSQL associated with the corresponding scene_id.
3. WHEN a Simulation is created, THE API SHALL persist the Simulation record with its Created state to PostgreSQL.
4. WHEN an existing scene_id is requested via `GET /api/scenes/{scene_id}`, THE API SHALL retrieve and return the scene analysis from PostgreSQL.
5. WHEN an existing scene_id's shots are requested via `GET /api/scenes/{scene_id}/shots`, THE API SHALL retrieve and return the persisted ShotPlan from PostgreSQL.
6. IF a database write fails during scene analysis, shot plan generation, or simulation creation, THEN THE API SHALL return HTTP status 500 and a descriptive error message, and SHALL NOT persist any partial record for that operation.

---

### Requirement 14: Monorepo and Package Structure

**User Story:** As a developer, I want the codebase organized as a monorepo with shared packages, so that the frontend and backend share type definitions and schema validation without duplication.

#### Acceptance Criteria

1. THE Monorepo SHALL contain the following top-level directories: `apps/web` (Next.js frontend), `apps/api` (FastAPI backend), `packages/shared-types`, `packages/cinematography-schema`, and `packages/eslint-config`.
2. THE `packages/shared-types` package SHALL define TypeScript types and enumerations for: Scene, Character, Shot, ShotPlan, Drone, DroneStatus, Simulation, SimulationState, Shot_Type, and Camera_Movement.
3. THE `packages/cinematography-schema` package SHALL define and export the Pydantic v2 schema for ShotPlan validation, and SHALL be importable by `apps/api` without circular dependencies.
4. THE CA_Frontend SHALL import all domain types from `packages/shared-types` and SHALL NOT redefine those types locally.
5. THE Monorepo SHALL use pnpm workspaces for JavaScript and TypeScript dependency management, with workspace packages resolvable via the `workspace:*` protocol.
6. THE `apps/api` directory SHALL use uv for Python dependency management and SHALL include a `pyproject.toml` file defining all runtime and development dependencies.
7. THE `packages/eslint-config` package SHALL export a shared ESLint configuration used by `apps/web` and any other TypeScript packages in the Monorepo.

---

### Requirement 15: Round-Trip Schema Validation

**User Story:** As a developer, I want the ShotPlan to survive serialization and deserialization without data loss, so that persisted plans are always equivalent to the in-memory representation.

#### Acceptance Criteria

1. THE ShotPlan_Serializer SHALL serialize a ShotPlan object to a JSON string in which all fields defined by the cinematography-schema are present with their correct types and values.
2. WHEN a ShotPlan is serialized to JSON and then deserialized, THE resulting ShotPlan SHALL equal the original in: all field types, all field values, all enumeration field values, all optional fields (present or absent), and all numeric field values within floating-point precision.
3. THE ShotPlan_Serializer SHALL produce identical JSON output when a valid ShotPlan is serialized, deserialized, and then serialized again, with the same field names, values, and types as the first serialization.
4. IF a JSON payload does not conform to the cinematography-schema, THEN THE ShotPlan_Deserializer SHALL return a structured validation error that includes the field path and a description of the violation for each non-conforming field.
5. IF deserialization of a structurally valid JSON payload fails for any reason other than schema non-conformance, THEN THE ShotPlan_Deserializer SHALL return a descriptive error identifying the failure cause.
