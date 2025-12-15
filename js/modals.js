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

    // External Review checkboxes
    ["er-required-n34", "er-required-n57", "er-complete-n34", "er-complete-n57"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.removeEventListener("change", handleExternalReviewCheckboxChange);
        el.addEventListener("change", handleExternalReviewCheckboxChange);
    });
}


// ----- External Review (N34 / N5/7) UI -----

function ensureExternalReviewShape(task) {
    if (!task.externalReview) {
        task.externalReview = {
            required: { n34: false, n57: false },
            complete: { n34: false, n57: false }
        };
        return;
    }
    if (!task.externalReview.required) task.externalReview.required = { n34: false, n57: false };
    if (!task.externalReview.complete) task.externalReview.complete = { n34: false, n57: false };
    if (typeof task.externalReview.required.n34 !== "boolean") task.externalReview.required.n34 = false;
    if (typeof task.externalReview.required.n57 !== "boolean") task.externalReview.required.n57 = false;
    if (typeof task.externalReview.complete.n34 !== "boolean") task.externalReview.complete.n34 = false;
    if (typeof task.externalReview.complete.n57 !== "boolean") task.externalReview.complete.n57 = false;
}

function renderExternalReviewUI(task) {
    const section = document.getElementById("modal-external-review-section");
    if (!section) return;

    ensureExternalReviewShape(task);
    section.setAttribute("data-current-task-id", task.id);

    const reqN34 = document.getElementById("er-required-n34");
    const reqN57 = document.getElementById("er-required-n57");
    const doneN34 = document.getElementById("er-complete-n34");
    const doneN57 = document.getElementById("er-complete-n57");
    const hint = document.getElementById("er-hint");

    if (!reqN34 || !reqN57 || !doneN34 || !doneN57) return;

    // Sync values
    reqN34.checked = !!task.externalReview.required.n34;
    reqN57.checked = !!task.externalReview.required.n57;

    doneN34.checked = !!task.externalReview.complete.n34;
    doneN57.checked = !!task.externalReview.complete.n57;

    const requiresAny = !!(task.externalReview.required.n34 || task.externalReview.required.n57);
    const inQMOW = task.status === "qmow";
    const inExternal = task.status === "external-review";

    // Requirement flags are set ONLY in QMOW
    reqN34.disabled = !inQMOW;
    reqN57.disabled = !inQMOW;

    // Completion flags are editable ONLY while in External Review (and only if required)
    doneN34.disabled = !(inExternal && task.externalReview.required.n34);
    doneN57.disabled = !(inExternal && task.externalReview.required.n57);

    // Hide completion rows that aren't required (keeps UI clean)
    const n34Row = doneN34.closest("p");
    const n57Row = doneN57.closest("p");
    if (n34Row) n34Row.style.display = task.externalReview.required.n34 ? "" : "none";
    if (n57Row) n57Row.style.display = task.externalReview.required.n57 ? "" : "none";

    if (!requiresAny) {
        if (n34Row) n34Row.style.display = "none";
        if (n57Row) n57Row.style.display = "none";
    }

    // Hint text
    if (hint) {
        if (inQMOW) {
            hint.textContent = "Set External Review requirements here (QMOW only).";
        } else if (!requiresAny) {
            hint.textContent = "No external review required for this task.";
        } else if (!inExternal) {
            hint.textContent = "This task is flagged for external review. Move it into External Review after ANAV/SWO when ready.";
        } else {
            const n34Done = !task.externalReview.required.n34 || task.externalReview.complete.n34;
            const n57Done = !task.externalReview.required.n57 || task.externalReview.complete.n57;
            hint.textContent = (n34Done && n57Done)
                ? "External review complete. Move the task back to any missing Front Route review (ANAV/SWO), or forward to REO if both are already done."
                : "Complete the required external review checkbox(es) above before moving the task out of External Review.";
        }
    }
}

function handleExternalReviewCheckboxChange(e) {
    const section = document.getElementById("modal-external-review-section");
    if (!section) return;

    const taskId = section.getAttribute("data-current-task-id");
    if (!taskId) return;

    const task = ALL_TASKS.find(t => t.id === taskId);
    if (!task) return;

    ensureExternalReviewShape(task);

    const id = e.target && e.target.id;

    const pushHistory = (action) => {
        if (!Array.isArray(task.history)) task.history = [];
        task.history.push({ timestamp: new Date().toISOString(), action });
    };

    if (id === "er-required-n34" || id === "er-required-n57") {
        // Requirements can only be edited while in QMOW
        if (task.status !== "qmow") {
            renderExternalReviewUI(task);
            alert("External review requirements can only be edited while the task is in QMOW.");
            return;
        }

        if (id === "er-required-n34") {
            task.externalReview.required.n34 = !!e.target.checked;
            if (!task.externalReview.required.n34) task.externalReview.complete.n34 = false;
            pushHistory(`External review requirement updated: N34 required = ${task.externalReview.required.n34 ? "YES" : "NO"}.`);
        } else {
            task.externalReview.required.n57 = !!e.target.checked;
            if (!task.externalReview.required.n57) task.externalReview.complete.n57 = false;
            pushHistory(`External review requirement updated: N5/7 required = ${task.externalReview.required.n57 ? "YES" : "NO"}.`);
        }

        renderExternalReviewUI(task);
        renderTaskHistory(task);
        renderKanbanBoard();
        sortAndRenderList();
        return;
    }

    if (id === "er-complete-n34" || id === "er-complete-n57") {
        // Completion can only be edited while in External Review (and only if required)
        if (task.status !== "external-review") {
            renderExternalReviewUI(task);
            alert("External review completion can only be set while the task is in External Review.");
            return;
        }

        if (id === "er-complete-n34") {
            if (!task.externalReview.required.n34) {
                renderExternalReviewUI(task);
                alert("N34 is not required for this task.");
                return;
            }
            task.externalReview.complete.n34 = !!e.target.checked;
            pushHistory(`External review progress: N34 marked ${task.externalReview.complete.n34 ? "COMPLETE" : "INCOMPLETE"}.`);
        } else {
            if (!task.externalReview.required.n57) {
                renderExternalReviewUI(task);
                alert("N5/7 is not required for this task.");
                return;
            }
            task.externalReview.complete.n57 = !!e.target.checked;
            pushHistory(`External review progress: N5/7 marked ${task.externalReview.complete.n57 ? "COMPLETE" : "INCOMPLETE"}.`);
        }

        renderExternalReviewUI(task);
        renderTaskHistory(task);
        return;
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

    // External Review (N34 / N5/7)
    renderExternalReviewUI(task);

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

    // Defensive: tasks created/loaded without history should still render safely
    if (!Array.isArray(task.history)) task.history = [];

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

    // Enforce workflow rules via flowRules.js
    if (typeof applyStatusChange !== "function") {
        console.warn("applyStatusChange() is not available. Status change aborted.");
        e.target.value = oldStatus;
        alert("Workflow engine not loaded. Please refresh and try again.");
        return;
    }

    const ok = applyStatusChange(task, newStatus, {
        actor: "User A",
        reason: `Status manually changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by User A (Modal Dropdown).`
    });

    if (!ok) {
        // Revert the dropdown to reflect the actual task status
        e.target.value = oldStatus;
        alert("That move is not allowed by the workflow rules.");
        return;
    }

    // In case post-transition hooks auto-advanced the task (e.g., BR completion), sync dropdown
    e.target.value = task.status;

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
                "Invalid DTG format. Must be DDHHMMZMMMYY (e.g., 101330Z DEC 25)";
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
        externalReview: { required: { n34: false, n57: false }, complete: { n34: false, n57: false } },
        frontRouteReviews: { anav: false, swo: false },
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
