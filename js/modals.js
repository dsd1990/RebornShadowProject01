// Modals: task detail & create task, metadata edit, status changes, txt editor


// ------------------------------
// Return-to-QMOW Reason Modal (Option A)
// ------------------------------
function ensureReturnToQMOWModalExists() {
    if (document.getElementById("returnToQMOWModal")) return;

    const overlay = document.createElement("div");
    overlay.id = "returnToQMOWModal";
    overlay.className = "task-modal-overlay";

    overlay.innerHTML = `
        <div class="task-modal-content" style="max-width:700px; min-height:auto; height:auto;">
            <div class="modal-header">
                <h2 style="margin:0;">Return to QMOW — Feedback Required</h2>
                <button class="close-modal-btn" data-close-modal="returnToQMOWModal" aria-label="Close">&times;</button>
            </div>
            <div style="margin-bottom:10px; color:#5e6c84; font-size:13px;" id="returnToQMOWContext"></div>
            <textarea id="returnToQMOWReason"
                class="comment-input"
                style="min-height:120px;"
                placeholder="Provide feedback for QMOW (required)..."></textarea>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                <button type="button" class="edit-metadata-btn" data-close-modal="returnToQMOWModal" id="returnToQMOWCancelBtn">Cancel</button>
                <button type="button" class="edit-metadata-btn" style="background:#36b37e; color:#fff;" id="returnToQMOWSubmitBtn">Submit & Move</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Enable existing close behaviors
    overlay.addEventListener("click", outsideModalClickClose);

    // Wire close buttons through existing handler
    overlay.querySelectorAll(".close-modal-btn").forEach((btn) => {
        btn.addEventListener("click", closeModalHandler);
    });
    overlay.querySelectorAll("[data-close-modal='returnToQMOWModal']").forEach((btn) => {
        btn.addEventListener("click", closeModalHandler);
    });
}

/**
 * Opens the "Return to QMOW" reason modal.
 * Calls onSubmit(reasonText) if submitted; onCancel() if cancelled.
 */
function openReturnToQMOWReasonModal({ task, fromStatus, sourceLabel, onSubmit, onCancel }) {
    ensureReturnToQMOWModalExists();

    const modal = document.getElementById("returnToQMOWModal");
    const reasonEl = document.getElementById("returnToQMOWReason");
    const contextEl = document.getElementById("returnToQMOWContext");

    if (!modal || !reasonEl || !contextEl) return;

    contextEl.textContent = `${task.id}: ${task.unitName} - ${task.operationName} | From ${fromStatus.toUpperCase()} → QMOW | Source: ${sourceLabel}`;
    reasonEl.value = "";
    modal.classList.add("is-visible");

    let submitBtn = document.getElementById("returnToQMOWSubmitBtn");
    let cancelBtn = document.getElementById("returnToQMOWCancelBtn");
    if (!submitBtn || !cancelBtn) return;

    // Reset listeners by cloning buttons (submit/cancel) + close (X) button
    const submitClone = submitBtn.cloneNode(true);
    submitBtn.replaceWith(submitClone);
    const cancelClone = cancelBtn.cloneNode(true);
    cancelBtn.replaceWith(cancelClone);

    const closeBtn = modal.querySelector(".close-modal-btn[data-close-modal='returnToQMOWModal']");
    if (closeBtn) {
        const closeClone = closeBtn.cloneNode(true);
        closeBtn.replaceWith(closeClone);
    }

    // Re-grab fresh nodes
    const submit = document.getElementById("returnToQMOWSubmitBtn");
    const cancel = document.getElementById("returnToQMOWCancelBtn");
    const close = modal.querySelector(".close-modal-btn[data-close-modal='returnToQMOWModal']");

    if (!submit || !cancel) return;

    // Remove any prior input handler
    if (reasonEl._qmowInputHandler) {
        reasonEl.removeEventListener("input", reasonEl._qmowInputHandler);
        reasonEl._qmowInputHandler = null;
    }

    // Remove any prior overlay capture handler
    if (modal._qmowOverlayCaptureHandler) {
        modal.removeEventListener("click", modal._qmowOverlayCaptureHandler, true);
        modal._qmowOverlayCaptureHandler = null;
    }

    const setSubmitEnabled = (enabled) => {
        submit.disabled = !enabled;
        // Keep visuals obvious even if CSS doesn't style :disabled
        submit.style.opacity = enabled ? "1" : "0.55";
        submit.style.cursor = enabled ? "pointer" : "not-allowed";
    };

    const inputHandler = () => {
        const hasText = (reasonEl.value || "").trim().length > 0;
        setSubmitEnabled(hasText);
    };

    reasonEl._qmowInputHandler = inputHandler;
    reasonEl.addEventListener("input", inputHandler);
    inputHandler(); // initialize disabled state

    const cleanup = () => {
        // Unhook listeners specific to this prompt session
        if (reasonEl._qmowInputHandler) {
            reasonEl.removeEventListener("input", reasonEl._qmowInputHandler);
            reasonEl._qmowInputHandler = null;
        }
        if (modal._qmowOverlayCaptureHandler) {
            modal.removeEventListener("click", modal._qmowOverlayCaptureHandler, true);
            modal._qmowOverlayCaptureHandler = null;
        }
    };

    const cancelAndClose = () => {
        modal.classList.remove("is-visible");
        cleanup();
        if (typeof onCancel === "function") onCancel();
    };

    const submitAndClose = () => {
        const text = (reasonEl.value || "").trim();
        if (!text) return; // submit is disabled unless text exists
        modal.classList.remove("is-visible");
        cleanup();
        onSubmit(text);
    };

    submit.addEventListener("click", submitAndClose);
    cancel.addEventListener("click", cancelAndClose);
    if (close) close.addEventListener("click", cancelAndClose);

    // Clicking on overlay background should cancel (and revert dropdown/drag action)
    const overlayCaptureHandler = (evt) => {
        if (evt.target === modal) {
            evt.preventDefault();
            evt.stopPropagation();
            cancelAndClose();
        }
    };
    modal._qmowOverlayCaptureHandler = overlayCaptureHandler;
    modal.addEventListener("click", overlayCaptureHandler, true);
}


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


    // Only moves TO QMOW require mandatory feedback prompt
    if (newStatus === "qmow" && oldStatus !== "qmow") {
        openReturnToQMOWReasonModal({
            task,
            fromStatus: oldStatus,
            sourceLabel: "Modal Dropdown",
            onSubmit: (feedbackText) => {
                const ok2 = applyStatusChange(task, "qmow", {
                    actor: "User A",
                    reason: `Returned to QMOW from ${oldStatus.toUpperCase()} by User A (Modal Dropdown). Feedback: ${feedbackText}`,
                    eventType: "return_to_qmow",
                    meta: { from: oldStatus, to: "qmow", feedback: feedbackText, source: "modal_dropdown" }
                });

                if (!ok2) {
                    e.target.value = oldStatus;
                    alert("That move is not allowed by the workflow rules.");
                    return;
                }

                e.target.value = task.status;
                renderKanbanBoard();
                sortAndRenderList();
                renderTaskHistory(task);
            },
            onCancel: () => {
                e.target.value = oldStatus;
            }
        });

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
