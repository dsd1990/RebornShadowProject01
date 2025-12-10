// List view rendering & sorting

/**
 * Create a list view row using the template.
 */
function createListRowElement(task) {
    const template = document.getElementById("list-row-template");

    const calculatedPriority = calculatePriority(task);
    const assigneeName = ASSIGNEE_MAP[task.assigneeId]
        ? ASSIGNEE_MAP[task.assigneeId].name
        : "N/A";

    // Fallback if template missing
    if (!template) {
        const row = document.createElement("tr");
        row.classList.add("list-task-row");
        row.dataset.taskId = task.id;
        row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.unitName} - ${task.operationName}</td>
            <td>${task.status.toUpperCase()}</td>
            <td>${task.dtg}</td>
            <td><span class="priority-badge ${getPriorityClass(
                calculatedPriority
            )}">${calculatedPriority}</span></td>
            <td>${assigneeName}</td>
        `;
        return row;
    }

    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector(".list-task-row");
    row.dataset.taskId = task.id;

    const idCell = row.querySelector(".list-task-id");
    const titleCell = row.querySelector(".list-task-title");
    const statusCell = row.querySelector(".list-task-status");
    const dtgCell = row.querySelector(".list-task-dtg");
    const priorityBadge = row.querySelector(".priority-badge");
    const assigneeCell = row.querySelector(".list-task-assignee");

    if (idCell) idCell.textContent = task.id;
    if (titleCell) titleCell.textContent = `${task.unitName} - ${task.operationName}`;
    if (statusCell) statusCell.textContent = task.status.toUpperCase();
    if (dtgCell) dtgCell.textContent = task.dtg;

    if (priorityBadge) {
        priorityBadge.textContent = calculatedPriority;
        priorityBadge.classList.add(getPriorityClass(calculatedPriority));
    }

    if (assigneeCell) assigneeCell.textContent = assigneeName;

    return row;
}

/**
 * Render tasks into the List View table body.
 */
function renderListView(tasks) {
    const tbody = document.querySelector("#taskTable .list-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    tasks.forEach(task => {
        const row = createListRowElement(task);
        tbody.appendChild(row);
    });

    // Re-attach dblclick listeners for modal
    setupModalListeners();
}

/**
 * Return a sortable value for a given task & column.
 */
function getSortValue(task, column) {
    switch (column) {
        case "id":
            return parseInt(task.id.replace("MI-", ""), 10) || 0;
        case "title":
            return `${task.unitName} - ${task.operationName}`;
        case "status":
            return task.status;
        case "dtgDate":
            return task.dtgDate ? task.dtgDate.getTime() : 0;
        case "priority": {
            const priorityOrder = { ShortNotice: 3, NoActionTaken: 2, Routine: 1 };
            return priorityOrder[calculatePriority(task)] || 0;
        }
        case "assignee":
            return ASSIGNEE_MAP[task.assigneeId]
                ? ASSIGNEE_MAP[task.assigneeId].name
                : "";
        default:
            return "";
    }
}

/**
 * Sort ALL_TASKS based on currentSort and render list.
 */
function sortAndRenderList() {
    const sortedTasks = [...ALL_TASKS].sort((a, b) => {
        const valA = getSortValue(a, currentSort.column);
        const valB = getSortValue(b, currentSort.column);

        let comparison = 0;
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;

        return currentSort.direction === "asc" ? comparison : -comparison;
    });

    renderListView(sortedTasks);
}

/**
 * Setup header click handlers for sorting.
 */
function setupListSorting() {
    document.querySelectorAll("#taskTable th.sortable").forEach(header => {
        header.addEventListener("click", () => {
            const sortBy = header.getAttribute("data-sort-by");
            let sortDir = header.getAttribute("data-sort-dir") || "asc";

            if (currentSort.column === sortBy) {
                sortDir = currentSort.direction === "asc" ? "desc" : "asc";
            } else {
                sortDir = "asc";
            }

            currentSort = { column: sortBy, direction: sortDir };

            // Reset header states
            document.querySelectorAll("#taskTable th.sortable").forEach(h => {
                h.removeAttribute("data-sort-dir");
                h.classList.remove("sorted-asc", "sorted-desc");
            });

            header.setAttribute("data-sort-dir", sortDir);
            header.classList.add(`sorted-${sortDir}`);

            sortAndRenderList();
        });
    });
}
