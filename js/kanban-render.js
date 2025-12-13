// Kanban rendering logic using <template>

function createKanbanCardElement(task) {
    const template = document.getElementById("kanban-card-template");

    // Fallback if template is missing
    if (!template) {
        const div = document.createElement("div");
        div.className = "task-card";
        div.draggable = true;
        div.dataset.taskId = task.id;

        const calcPriority = calculatePriority(task);
        div.dataset.priority = calcPriority;

        const priorityDiv = document.createElement("div");
        priorityDiv.className = `task-priority ${getPriorityClass(calcPriority)}`;
        div.appendChild(priorityDiv);

        const titleGroup = document.createElement("div");
        titleGroup.className = "task-title-group";
        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = `${task.unitName} - ${task.operationName}`;
        titleGroup.appendChild(title);
        div.appendChild(titleGroup);

        const meta = document.createElement("div");
        meta.className = "task-meta task-op-details";
        meta.innerHTML = `<div class="meta-item dtg-info">
                <label>ID:</label>
                <span class="dtg-value">${task.id}</span>
            </div>`;
        div.appendChild(meta);

        return div;
    }

    const fragment = template.content.cloneNode(true);
    const cardEl = fragment.querySelector(".task-card");

    const calcPriority = calculatePriority(task);
    const priorityClass = getPriorityClass(calcPriority);

    cardEl.dataset.taskId = task.id;
    cardEl.dataset.priority = calcPriority;

    const priorityEl = cardEl.querySelector(".task-priority");
    if (priorityEl) {
        priorityEl.classList.add(priorityClass);
    }

    const titleEl = cardEl.querySelector(".task-title-text");
    if (titleEl) {
        titleEl.textContent = `${task.unitName} - ${task.operationName}`;
    }

    const idEl = cardEl.querySelector(".task-id-text");
    if (idEl) {
        idEl.textContent = task.id;
    }

    return cardEl;
}

/**
 * Renders all tasks to the Kanban board.
 */
function renderKanbanBoard() {
    // Clear all task lists and reset counts
    document.querySelectorAll(".task-list").forEach(list => {
        list.innerHTML = "";
        const column = list.closest(".kanban-column");
        if (column) {
            const countSpan = column.querySelector(".task-count");
            if (countSpan) countSpan.textContent = "(0)";
        }
    });

    const counts = {};

    // Place each task in the correct column
    ALL_TASKS.forEach(task => {
        const list = document.querySelector(`.task-list[data-status="${task.status}"]`);
        if (!list) return;

        const card = createKanbanCardElement(task);
        list.appendChild(card);

        counts[task.status] = (counts[task.status] || 0) + 1;
    });

    // Update column counts
    Object.keys(counts).forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (column) {
            const countSpan = column.querySelector(".task-count");
            if (countSpan) {
                countSpan.textContent = `(${counts[status]})`;
            }
        }
    });

    // Re-attach listeners
    setupModalListeners();
    setupDragAndDropListeners();
}
