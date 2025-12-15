// flowRules.js
// Allowed transitions, automatic follow-on behavior, and lifecycle logic

/**
 * Map a status to its workflow group label.
 * (Used for display + future filtering.)
 */
function getGroupForStatus(status) {
  const frontRoute =
    typeof FRONT_ROUTE_STATUSES !== "undefined"
      ? FRONT_ROUTE_STATUSES
      : ["qmow", "swo", "anav", "reo"];

  const transmit = ["released", "qm-xmit", "swo-xmit", "awaiting-ack"];
  const backRoute = ["qm-br", "swo-br", "anav-br", "reo-br"];
  const lifecycle = ["approved", "active", "wasp-deletions", "filed"];

  if (frontRoute.includes(status)) return "Front-Route";
  if (transmit.includes(status)) return "Transmit-Section";
  if (backRoute.includes(status)) return "Back-Route";
  if (lifecycle.includes(status)) return "Lifecycle";
  return "Unknown";
}

/**
 * Workflow guard: can this task move from fromStatus -> toStatus?
 */
function isTransitionAllowed(task, fromStatus, toStatus) {
  if (!toStatus) return false;
  if (fromStatus === toStatus) return true;

  const fullBR = !!task.backRouteFullRequired;

  switch (fromStatus) {
    // Front Route
    case "qmow":
      return ["anav", "swo"].includes(toStatus);

    // ✅ UPDATED: allow returning to QMOW
    case "anav":
      return ["swo", "reo", "qmow"].includes(toStatus);

    // ✅ UPDATED: allow returning to QMOW
    case "swo":
      return ["anav", "reo", "qmow"].includes(toStatus);

    case "reo":
      // Back to QMOW or into Transmit: Released
      return ["qmow", "released"].includes(toStatus);

    // Transmit
    case "released":
      return toStatus === "qm-xmit";
    case "qm-xmit":
      return toStatus === "swo-xmit";
    case "swo-xmit":
      return toStatus === "awaiting-ack";
    case "awaiting-ack":
      return toStatus === "qm-br";

    // Back Route
    case "qm-br":
      return toStatus === "swo-br";
    case "swo-br":
      // If full Back Route not required, completion is automatic (no manual transition)
      if (fullBR) return toStatus === "anav-br";
      return false;
    case "anav-br":
      return fullBR && toStatus === "reo-br";
    case "reo-br":
      // Completion triggers automatic move; no manual destination from here
      return false;

    // Lifecycle
    case "wasp-deletions":
      // Manual move to Filed
      return toStatus === "filed";

    default:
      return false;
  }
}

/**
 * Decide whether the task should be Approved, Active, or WASP Deletions
 * based on opStart/opEnd and current time.
 */
function determineLifecycleStatus(task) {
  const now = Date.now();
  const start = task.opStartISO ? new Date(task.opStartISO).getTime() : null;
  const end = task.opEndISO ? new Date(task.opEndISO).getTime() : null;

  if (start && now < start) return "approved";
  if (start && (!end || now <= end)) return "active";
  return "wasp-deletions";
}

function handleBackRouteCompletion(task, completionStatus) {
  const lifecycleStatus = determineLifecycleStatus(task);
  const nowIso = new Date().toISOString();

  const oldStatus = completionStatus;
  task.status = lifecycleStatus;
  task.group = getGroupForStatus(lifecycleStatus);
  task.timeInCurrentStatus = nowIso;

  if (!Array.isArray(task.history)) task.history = [];
  task.history.push({
    timestamp: nowIso,
    action: `Back Route complete at ${oldStatus.toUpperCase()}; moved to ${lifecycleStatus.toUpperCase()} based on operation dates.`,
  });
}

/**
 * Post-transition hook for any automatic follow-on behavior.
 */
function handlePostStatusTransition(task, oldStatus, newStatus) {
  // Ensure group matches status
  task.group = getGroupForStatus(newStatus);

  // If we arrived into a BR status, check if that completes the Back Route
  if (newStatus === "swo-br" && !task.backRouteFullRequired) {
    // Back Route ends at SWO BR (no ANAV/REO BR required)
    handleBackRouteCompletion(task, newStatus);
  } else if (newStatus === "reo-br" && task.backRouteFullRequired) {
    // Full Back Route path required; completion at REO BR
    handleBackRouteCompletion(task, newStatus);
  }
}

/**
 * Central helper to update status safely, record history, and apply flow rules.
 */
function applyStatusChange(task, newStatus, options = {}) {
  const oldStatus = task.status;

  if (!isTransitionAllowed(task, oldStatus, newStatus)) {
    console.warn(`Transition ${oldStatus} -> ${newStatus} not allowed for ${task.id}`);
    return false;
  }

  const nowIso = new Date().toISOString();
  task.status = newStatus;
  task.group = getGroupForStatus(newStatus);
  task.timeInCurrentStatus = nowIso;

  const actor = options.actor || "User A";
  const actionText =
    options.reason ||
    `Status changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by ${actor}.`;

  if (!Array.isArray(task.history)) task.history = [];

  // ✅ UPDATED: allow tagged/typed history events while preserving "action"
  const entry = { timestamp: nowIso, action: actionText };
  if (options.eventType) entry.type = options.eventType;
  if (options.meta && typeof options.meta === "object") {
    Object.assign(entry, options.meta);
  }

  task.history.push(entry);

  handlePostStatusTransition(task, oldStatus, newStatus);
  return true;
}

/**
 * Periodic lifecycle enforcement for Approved/Active tasks.
 * Call this before rendering Kanban/List views if desired.
 */
function enforceLifecycleAutoMoves() {
  ALL_TASKS.forEach((task) => {
    if (!["approved", "active"].includes(task.status)) return;

    const desired = determineLifecycleStatus(task);
    if (desired === task.status) return;

    const oldStatus = task.status;
    const nowIso = new Date().toISOString();

    task.status = desired;
    task.group = getGroupForStatus(desired);
    task.timeInCurrentStatus = nowIso;

    if (!Array.isArray(task.history)) task.history = [];
    task.history.push({
      timestamp: nowIso,
      action: `Lifecycle auto-update from ${oldStatus.toUpperCase()} to ${desired.toUpperCase()} based on operation dates.`,
    });
  });
}
