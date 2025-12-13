// Modals: task detail & create task, metadata edit, status changes, txt editor

// ----- Core modal wiring -----

function setupModalListeners() {
    // Double-click cards or list rows to open detail modal
    document.querySelectorAll(".task-card, .list-task-row").forEach(element => {
        element.removeEventListener("dblclick", openTaskDetailModal);
        element.addEventListener("dblclick", openTaskDetailModal);
    });

    // Open create-task modal
    const openCreateTaskBtn = document.getElementById("openCreateTaskModal");
    if (openCreateTaskBtn) {
        openCreateTaskBtn.removeEventListener("click", openCreateModal);
        openCreateTaskBtn.addEventListener("click", openCreateModal);
    }

    // Close buttons (both modals)
    document.querySelectorAll(".close-modal-btn").forEach(btn => {
        btn.removeEventListener("click", closeModalHandler);
        btn.addEventListener("click", closeModalHandler);
    });

    // Click outside modal content to close
    document.querySelectorAll(".task-modal-overlay").forEach(overlay => {
        overlay.removeEventListener("click", outsideModalClickClose);
        overlay.addEventListener("click", outsideModalClickClose);
    });

    // New task form submit
    const newTaskForm = document.getElementById("newTaskForm");
    if (newTaskForm) {
        newTaskForm.removeEventListener("submit", handleNewTaskSubmit);
        newTaskForm.addEventListener("submit", handleNewTaskSubmit);
    }

    // Metadata edit button
    const editBtn = document.querySelector("#modal-metadata-section .edit-metadata-btn");
    if (editBtn) {
        editBtn.removeEventListener("click", toggleMetadataEdit);
        editBtn.addEventListener("click", toggleMetadataEdit);
    }

    // Status dropdown
    const statusDropdown = document.querySelector(".task-status-dropdown");
    if (statusDropdown) {
        statusDropdown.removeEventListener("change", handleStatusChange);
        statusDropdown.addEventListener("change", handleStatusChange);
    }
}

function openCreateModal() {
    const modal = document.getElementById("createTaskModal");
    if (modal) {
        modal.classList.add("is-visible");
    }
}

function closeModalHandler(e) {
    const modalId = e.target.getAttribute("data-close-modal");
    if (!modalId) return;

    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("is-visible");

    if (modalId === "createTaskModal") {
        resetCreateTaskForm();
    }
}

function outsideModalClickClose(e) {
    const overlay = e.currentTarget;
    if (e.target !== overlay) return;

    overlay.classList.remove("is-visible");

    if (overlay.id === "createTaskModal") {
        resetCreateTaskForm();
    }
}

function resetCreateTaskForm() {
    const form = document.getElementById("newTaskForm");
    if (form) form.reset();

    const validationMsg = document.getElementById("dtg-validation-msg");
    if (validationMsg) validationMsg.textContent = "";

    const attachmentList = document.getElementById("newTaskAttachmentList");
    if (attachmentList) attachmentList.innerHTML = "";
}

// ----- Task Detail Modal -----

function openTaskDetailModal(e) {
    e.stopPropagation();

    const taskId = e.currentTarget.getAttribute("data-task-id");
    const task = ALL_TASKS.find(t => t.id === taskId);
    if (!task) return;

    const assignee = ASSIGNEE_MAP[task.assigneeId];
    const calculatedPriority = calculatePriority(task);
    const metadataSection = document.getElementById("modal-metadata-section");

    if (!metadataSection) return;

    // Ensure edit mode is off when opening
    metadataSection.setAttribute("data-editing", "false");
    const editBtn = metadataSection.querySelector(".edit-metadata-btn");
    if (editBtn) editBtn.textContent = "Edit Task Info";

    // Header
    document.getElementById("modal-task-title").textContent =
        `${task.unitName} - ${task.operationName}`;
    document.getElementById("modal-task-key").textContent = task.id;

    // Description
    document.getElementById("modal-description").textContent = task.description || "";

    // Metadata
    document.getElementById("modal-unit-name").textContent = task.unitName;
    document.getElementById("modal-op-name").textContent = task.operationName;
    document.getElementById("modal-dtg").textContent = task.dtg;
    document.getElementById("modal-duration").textContent =
        `${task.opStartDisplay} - ${task.opEndDisplay}`;
    document.getElementById("modal-assignee").textContent = assignee ? assignee.name : "N/A";
    document.getElementById("modal-priority").textContent = calculatedPriority;

    // Status dropdown
    const statusDropdown = document.querySelector(".task-status-dropdown");
    if (statusDropdown) {
        statusDropdown.value = task.status;
        statusDropdown.setAttribute("data-current-task-id", task.id);
    }

    // History
    renderTaskHistory(task);

    const detailModal = document.getElementById("taskDetailModal");
    if (detailModal) {
        detailModal.classList.add("is-visible");
    }

    const txtEditorArea = document.getElementById("txtEditorArea");
    if (txtEditorArea) {
        txtEditorArea.classList.add("hidden");
    }
}

function renderTaskHistory(task) {
    const historyListEl = document.getElementById("modal-history-list");
    if (!historyListEl) return;

    historyListEl.innerHTML = "";

    const sortedHistory = [...task.history].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const template = document.getElementById("history-item-template");

    sortedHistory.forEach(item => {
        if (template) {
            const fragment = template.content.cloneNode(true);
            const tsEl = fragment.querySelector(".timestamp");
            const actionEl = fragment.querySelector(".action");
            if (tsEl) tsEl.textContent = formatTimestampForHistory(item.timestamp);
            if (actionEl) actionEl.textContent = item.action;
            historyListEl.appendChild(fragment);
        } else {
            const div = document.createElement("div");
            div.classList.add("history-item");
            div.innerHTML = `
                <span class="timestamp">${formatTimestampForHistory(item.timestamp)}</span>
                <span class="action">${item.action}</span>
            `;
            historyListEl.appendChild(div);
        }
    });
}

// ----- Status change from dropdown -----

function handleStatusChange(e) {
    const newStatus = e.target.value;
    const taskId = e.target.getAttribute("data-current-task-id");
    const taskIndex = ALL_TASKS.findIndex(t => t.id === taskId);

    if (taskIndex === -1) return;

    const task = ALL_TASKS[taskIndex];
    const oldStatus = task.status;

    if (oldStatus === newStatus) return;

    task.status = newStatus;
    task.timeInCurrentStatus = new Date().toISOString();
    task.history.push({
        timestamp: new Date().toISOString(),
        action: `Status manually changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by User A.`
    });

    renderKanbanBoard();
    sortAndRenderList();
    renderTaskHistory(task);
}

// ----- Metadata edit -----

function toggleMetadataEdit(e) {
    const metadataSection = document.getElementById("modal-metadata-section");
    if (!metadataSection) return;

    const editBtn = e.target;
    const isEditing = metadataSection.getAttribute("data-editing") === "true";

    const unitSpan = metadataSection.querySelector("#modal-unit-name");
    const opSpan = metadataSection.querySelector("#modal-op-name");
    const dtgSpan = metadataSection.querySelector("#modal-dtg");
    const statusDropdown = document.querySelector(".task-status-dropdown");

    if (!unitSpan || !opSpan || !dtgSpan || !statusDropdown) return;

    const taskId = statusDropdown.getAttribute("data-current-task-id");
    const task = ALL_TASKS.find(t => t.id === taskId);
    if (!task) return;

    if (isEditing) {
        // Save mode
        const unitInput = metadataSection.querySelector("#input-unit-name");
        const opInput = metadataSection.querySelector("#input-op-name");
        const dtgInputEl = metadataSection.querySelector("#input-dtg");

        if (!unitInput || !opInput || !dtgInputEl) return;

        const newUnitName = unitInput.value;
        const newOpName = opInput.value;
        const newDtg = dtgInputEl.value;

        let changesMade = false;
        let historyAction = "Metadata updated:";

        if (newUnitName !== task.unitName) {
            task.unitName = newUnitName;
            historyAction += ` Unit changed to ${newUnitName}.`;
            changesMade = true;
        }

        if (newOpName !== task.operationName) {
            task.operationName = newOpName;
            historyAction += ` Operation changed to ${newOpName}.`;
            changesMade = true;
        }

        if (newDtg.toUpperCase() !== task.dtg) {
            const dtgDate = validateAndConvertDTG(newDtg);
            if (!dtgDate) {
                alert("Invalid DTG format. Changes were NOT saved.");
                return;
            }
            task.dtg = newDtg.toUpperCase();
            task.dtgDate = dtgDate;
            historyAction += ` DTG changed to ${newDtg.toUpperCase()}.`;
            changesMade = true;
        }

        if (changesMade) {
            task.history.push({
                timestamp: new Date().toISOString(),
                action: historyAction
            });
        }

        metadataSection.setAttribute("data-editing", "false");
        editBtn.textContent = "Edit Task Info";

        // Restore spans to plain text
        unitSpan.textContent = task.unitName;
        opSpan.textContent = task.operationName;
        dtgSpan.textContent = task.dtg;

        renderKanbanBoard();
        sortAndRenderList();
        renderTaskHistory(task);
    } else {
        // Enter edit mode
        metadataSection.setAttribute("data-editing", "true");
        editBtn.textContent = "Save Changes";

        unitSpan.innerHTML = `<input type="text" id="input-unit-name" value="${task.unitName}">`;
        opSpan.innerHTML = `<input type="text" id="input-op-name" value="${task.operationName}">`;
        dtgSpan.innerHTML = `<input type="text" id="input-dtg" value="${task.dtg}">`;
    }
}

// ----- Create Task form submission -----

function handleNewTaskSubmit(e) {
    e.preventDefault();

    const dtgInput = document.getElementById("dtg").value;
    const validationMsg = document.getElementById("dtg-validation-msg");

    const dtgDate = validateAndConvertDTG(dtgInput);
    if (!dtgDate) {
        if (validationMsg) {
            validationMsg.textContent =
                "Invalid DTG format. Must be DDHHMMZMMYY (e.g., 101330Z DEC 25)";
            validationMsg.style.color = "red";
        }
        return;
    } else if (validationMsg) {
        validationMsg.textContent = "DTG format is valid.";
        validationMsg.style.color = "green";
    }

    const unitName = document.getElementById("unitName").value;
    const operationName = document.getElementById("operationName").value;
    const description = document.getElementById("description").value;
    const opStartLocal = document.getElementById("opStart").value;
    const opEndLocal = document.getElementById("opEnd").value;

    const opStartISO = new Date(opStartLocal).toISOString();
    const opEndISO = opEndLocal ? new Date(opEndLocal).toISOString() : "";

    const dateOptions = {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC"
    };

    const opStartDisplay = new Date(opStartLocal)
        .toLocaleString("en-US", dateOptions)
        .replace(/,/, "")
        .replace(/\sUTC/i, "Z");

    const opEndDisplay = opEndLocal
        ? new Date(opEndLocal)
              .toLocaleString("en-US", dateOptions)
              .replace(/,/, "")
              .replace(/\sUTC/i, "Z")
        : "";

    // Get new task ID once (so attachments share same ID)
    const newTaskId = getNextTaskId();

    // Process attachments from DOM list
    const attachments = [];
    document
        .querySelectorAll("#newTaskAttachmentList li")
        .forEach(li => {
            const nameEl = li.querySelector(".file-name");
            if (!nameEl) return;
            const fileName = nameEl.textContent.trim();
            if (!fileName) return;

            const fileType = fileName.toLowerCase().endsWith(".txt") ? "txt" : "doc";
            attachments.push({
                fileName,
                fileType,
                filePath: `task-${newTaskId}_${fileName}`,
                isEditable: fileType === "txt"
            });
        });

    const nowIso = new Date().toISOString();

    const newTask = {
        id: newTaskId,
        status: "qmow",
        group: "Front-Route",
        unitName,
        operationName,
        dtg: dtgInput.toUpperCase(),
        dtgDate,
        opStartISO,
        opEndISO,
        opStartDisplay,
        opEndDisplay,
        creationTime: nowIso,
        timeInCurrentStatus: nowIso,
        assigneeId: "user_a",
        description,
        attachments,
        history: [{ timestamp: nowIso, action: "Task created by User A." }]
    };

    ALL_TASKS.push(newTask);

    renderKanbanBoard();
    sortAndRenderList();

    const createModal = document.getElementById("createTaskModal");
    if (createModal) createModal.classList.remove("is-visible");

    resetCreateTaskForm();
}

// ----- TXT Editor / Tabs -----

function setupTxtEditor() {
    const editTxtBtn = document.querySelector(".attachments-section .edit-btn");
    const txtEditorArea = document.getElementById("txtEditorArea");
    const editorTabContent = document.getElementById("editor-tab");
    const historyTabContent = document.getElementById("history-tab");

    if (editTxtBtn && txtEditorArea) {
        editTxtBtn.addEventListener("click", () => {
            txtEditorArea.classList.toggle("hidden");
        });
    }

    document
        .querySelectorAll(".editor-tabs .tab-btn")
        .forEach(button => {
            button.addEventListener("click", e => {
                const tabName = e.target.getAttribute("data-tab");

                document
                    .querySelectorAll(".editor-tabs .tab-btn")
                    .forEach(btn => btn.classList.remove("active"));

                e.target.classList.add("active");

                if (editorTabContent) {
                    editorTabContent.style.display =
                        tabName === "editor" ? "block" : "none";
                }
                if (historyTabContent) {
                    historyTabContent.style.display =
                        tabName === "history" ? "block" : "none";
                }
            });
        });
}
