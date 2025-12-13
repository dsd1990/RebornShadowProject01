// Drag & drop behavior for Kanban cards

let draggedItemId = null;
let allowedDropStatuses = null;

function clearDropZoneHighlights() {
    document.querySelectorAll(".task-list").forEach(list => {
        list.classList.remove("drop-allowed", "drop-disallowed", "drag-over");
    });
    allowedDropStatuses = null;
}

function highlightAllowedDropZones(task) {
    clearDropZoneHighlights();

    // If the workflow engine isn't loaded yet, don't block drag/drop (fallback behavior)
    if (typeof isTransitionAllowed !== "function") return;

    const lists = Array.from(document.querySelectorAll(".task-list"));
    const fromStatus = task.status;

    const allowed = new Set();
    lists.forEach(list => {
        const toStatus = list.getAttribute("data-status");
        if (!toStatus) return;
        if (isTransitionAllowed(task, fromStatus, toStatus)) allowed.add(toStatus);
    });

    allowedDropStatuses = allowed;
    lists.forEach(list => {
        const toStatus = list.getAttribute("data-status");
        if (allowed.has(toStatus)) list.classList.add("drop-allowed");
        else list.classList.add("drop-disallowed");
    });
}

function handleDragStart(e) {
    draggedItemId = e.currentTarget.getAttribute("data-task-id");
    e.dataTransfer.setData("text/plain", draggedItemId);

    // Visual hint on the dragged card
    setTimeout(() => {
        e.currentTarget.style.opacity = "0.5";
    }, 0);

    const task = ALL_TASKS.find(t => t.id === draggedItemId);
    if (task) highlightAllowedDropZones(task);
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = "1";
    draggedItemId = null;
    clearDropZoneHighlights();
}

function handleDragOver(e) {
    const targetList = e.currentTarget;
    const newStatus = targetList.getAttribute("data-status");

    // If we have computed allowed destinations, only allow drop on allowed columns.
    if (allowedDropStatuses && !allowedDropStatuses.has(newStatus)) return;

    e.preventDefault();
    targetList.classList.add("drag-over");
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    if (!draggedItemId) return;

    const targetList = e.currentTarget;
    const newStatus = targetList.getAttribute("data-status");
    const task = ALL_TASKS.find(t => t.id === draggedItemId);

    if (!task) {
        clearDropZoneHighlights();
        return;
    }

    // If allowed destinations were computed, hard-block invalid drops.
    if (allowedDropStatuses && !allowedDropStatuses.has(newStatus)) {
        alert("That move is not allowed by the workflow rules.");
        clearDropZoneHighlights();
        return;
    }

    const oldStatus = task.status;
    if (oldStatus === newStatus) {
        clearDropZoneHighlights();
        return;
    }

    // Enforce workflow rules via flowRules.js
    if (typeof applyStatusChange !== "function") {
        console.warn("applyStatusChange() is not available. Falling back to direct status change.");
        task.status = newStatus;
        task.timeInCurrentStatus = new Date().toISOString();
        if (!Array.isArray(task.history)) task.history = [];
        task.history.push({
            timestamp: new Date().toISOString(),
            action: `Status changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by User A (Drag & Drop).`
        });
    } else {
        const ok = applyStatusChange(task, newStatus, {
            actor: "User A",
            reason: `Status changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by User A (Drag & Drop).`
        });

        if (!ok) {
            alert("That move is not allowed by the workflow rules.");
            clearDropZoneHighlights();
            return;
        }
    }

    clearDropZoneHighlights();
    renderKanbanBoard();
    sortAndRenderList();
}

/**
 * Attach drag/drop listeners to task cards and columns.
 */
function setupDragAndDropListeners() {
    const taskLists = document.querySelectorAll(".task-list");
    const taskCards = document.querySelectorAll(".task-card");

    // Cards
    taskCards.forEach(card => {
        card.removeEventListener("dragstart", handleDragStart);
        card.removeEventListener("dragend", handleDragEnd);

        card.addEventListener("dragstart", handleDragStart);
        card.addEventListener("dragend", handleDragEnd);
    });

    // Columns
    taskLists.forEach(list => {
        list.removeEventListener("dragover", handleDragOver);
        list.removeEventListener("dragleave", handleDragLeave);
        list.removeEventListener("drop", handleDrop);

        list.addEventListener("dragover", handleDragOver);
        list.addEventListener("dragleave", handleDragLeave);
        list.addEventListener("drop", handleDrop);
    });
}
