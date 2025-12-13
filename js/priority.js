// Priority calculation & helpers

/**
 * Calculates priority category for a task:
 * - ShortNotice: opStart within 72 hours (future)
 * - NoActionTaken: still front route after 72 hours from creation
 * - Routine: everything else
 */
function calculatePriority(task) {
    const now = Date.now();
    const opStart = task.opStartISO ? new Date(task.opStartISO).getTime() : null;
    const timeToStart = opStart ? opStart - now : null;
    const timeSinceCreation = task.creationTime ? now - new Date(task.creationTime).getTime() : 0;
    const seventyTwoHours = 72 * 60 * 60 * 1000;

    if (opStart && timeToStart < seventyTwoHours && timeToStart > 0) {
        return "ShortNotice";
    }

    if (FRONT_ROUTE_STATUSES.includes(task.status) && timeSinceCreation > seventyTwoHours) {
        return "NoActionTaken";
    }

    return "Routine";
}

/**
 * Maps priority category to CSS class.
 */
function getPriorityClass(calculatedPriority) {
    if (calculatedPriority === "ShortNotice") return "high";
    if (calculatedPriority === "NoActionTaken") return "medium";
    return "low";
}
