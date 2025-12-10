// Drag & drop behavior for Kanban cards

let draggedItemId = null;

function handleDragStart(e) {
    draggedItemId = e.currentTarget.getAttribute("data-task-id");
    e.dataTransfer.setData("text/plain", draggedItemId);
    setTimeout(() => {
        e.currentTarget.style.opacity = "0.5";
    }, 0);
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = "1";
    draggedItemId = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
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
    const taskIndex = ALL_TASKS.findIndex(t => t.id === draggedItemId);

    if (taskIndex === -1) return;

    const task = ALL_TASKS[taskIndex];
    const oldStatus = task.status;

    if (oldStatus !== newStatus) {
        task.status = newStatus;
        task.timeInCurrentStatus = new Date().toISOString();
        task.history.push({
            timestamp: new Date().toISOString(),
            action: `Status changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by User A (Drag & Drop).`
        });
    }

    // Re-render Kanban (and re-wire listeners)
    renderKanbanBoard();
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
