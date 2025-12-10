// app.js - Combined logic for your Kanban/List board with task-flow rules

// -------------------- DATA STORE -------------------- //

let nextTaskIdNumber = 5; // Starting high for testing
let currentSort = { column: 'id', direction: 'asc' }; // List View Sorting State

// Status groups for routing / validation
const FRONT_ROUTE_STATUSES = ['qmow', 'swo', 'anav', 'reo'];
const TRANSMIT_STATUSES    = ['released', 'qm-xmit', 'swo-xmit', 'awaiting-ack'];
const BACK_ROUTE_STATUSES  = ['qm-br', 'swo-br', 'anav-br', 'reo-br'];
const ACTIVE_STATUSES      = ['active', 'approved-not-active', 'wasp-deletion', 'filed'];

// Allowed status transitions based on your description
const STATUS_TRANSITIONS = {
    // Front Route
    'qmow'        : ['anav', 'swo'],          // Front Route QMOW -> ANAV or SWO
    'anav'        : ['swo', 'reo'],           // ANAV -> SWO or REO
    'swo'         : ['anav', 'reo'],          // SWO -> ANAV or REO
    'reo'         : ['released', 'qmow'],     // REO -> Transmit Released OR back to QMOW

    // Transmit section
    'released'    : ['qm-xmit'],              // Released -> QM XMIT
    'qm-xmit'     : ['swo-xmit'],             // QM XMIT -> SWO XMIT
    'swo-xmit'    : ['awaiting-ack'],         // SWO XMIT -> Awaiting Ack
    'awaiting-ack': ['qm-br'],                // Awaiting Ack -> QM BR (Back Route starts)

    // Back Route (normal flow)
    'qm-br'       : ['swo-br'],               // QM BR -> SWO BR
    // SWO BR either completes Back Route, or (optionally) goes to ANAV BR if extra review is required
    'swo-br'      : ['anav-br', 'active', 'approved-not-active'], 
    // If ANAV/REO BR are required:
    'anav-br'     : ['reo-br'],
    'reo-br'      : ['active', 'approved-not-active'],

    // Active/WASP/Filed
    'active'         : ['wasp-deletion'],     // When completed by time duration
    'approved-not-active': ['active', 'wasp-deletion'],
    'wasp-deletion'  : ['filed'],             // Manual move
    'filed'          : []                     // Terminal – can be archived/cleaned after 3 months
};

// This map controls whether the "Needs full back-route" toggle should be shown
// We show it when the task is in QM-BR or SWO-BR (entry to back-route)
const SHOW_BR_TOGGLE_STATUSES = ['qm-br', 'swo-br'];

// Example static data
const ALL_TASKS = [
    {
        id: "MI-001", status: "qmow", group: "Front-Route", unitName: "USS Surface Ship", 
        operationName: "OTS Ops", dtg: "101330Z DEC 25", dtgDate: new Date('2025-12-10T13:30:00Z'),
        opStartISO: "2025-12-10T04:30:00Z", opEndISO: "2025-12-15T18:00:00Z", opStartDisplay: "10 DEC 04:30Z", 
        opEndDisplay: "15 DEC 18:00Z", creationTime: "2025-12-05T08:00:00Z", 
        timeInCurrentStatus: "2025-12-05T08:00:00Z", assigneeId: "user_a",
        description: "Review planned surface movements and confirm asset availability.",
        needsFullBackRoute: false, // Toggle for ANAV/REO BR
        attachments: [], history: [{ timestamp: "2025-12-05T08:00:00Z", action: "Created task." }]
    },
    {
        id: "MI-002", status: "anav", group: "Front-Route", unitName: "CGC Cutter", 
        operationName: "SAR Mission", dtg: "130900Z DEC 25", dtgDate: new Date('2025-12-13T09:00:00Z'),
        opStartISO: "2025-12-13T09:00:00Z", opEndISO: "2025-12-13T23:00:00Z", opStartDisplay: "13 JAN 09:00Z", 
        opEndDisplay: "13 JAN 23:00Z", creationTime: "2025-12-09T10:00:00Z", 
        timeInCurrentStatus: "2025-12-09T10:00:00Z",
        assigneeId: "user_b", description: "Coordinate flight paths and rescue recovery.",
        needsFullBackRoute: false,
        attachments: [], history: [{ timestamp: "2025-12-09T10:00:00Z", action: "Created task." }]
    },
    {
        id: "MI-003", status: "qmow", group: "Front-Route", unitName: "RFA Carrier", 
        operationName: "Routine Transit", dtg: "201000Z DEC 25", dtgDate: new Date('2025-12-20T10:00:00Z'),
        opStartISO: "2025-12-20T10:00:00Z", opEndISO: "2025-12-25T16:00:00Z", opStartDisplay: "20 DEC 10:00Z", 
        opEndDisplay: "25 DEC 16:00Z", creationTime: "2025-12-09T08:00:00Z", 
        timeInCurrentStatus: "2025-12-09T08:00:00Z",
        assigneeId: "user_c", description: "Standard administrative message.",
        needsFullBackRoute: false,
        attachments: [], history: [{ timestamp: "2025-12-09T08:00:00Z", action: "Created task." }]
    },
    {
        id: "MI-004", status: "qmow", group: "Front-Route", unitName: "USS Test", 
        operationName: "Short Notice", dtg: "101330Z DEC 25", dtgDate: new Date('2025-12-10T13:30:00Z'),
        opStartISO: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 mins from now
        opEndISO: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        opStartDisplay: "10 DEC 05:15Z", 
        opEndDisplay: "11 DEC 17:15Z", creationTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(), 
        timeInCurrentStatus: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        assigneeId: "user_a", description: "testing the short notice priority coding.",
        needsFullBackRoute: true,
        attachments: [{ fileName: 'Requirements_Draft.txt', fileType: 'txt', filePath: 'reqs-draft.txt', isEditable: true }], 
        history: [
            { timestamp: "2025-12-09T18:00:00Z", action: "Created task." },
            { timestamp: "2025-12-09T20:00:00Z", action: "Status changed to QMOW by User A." }
        ]
    }
];

// Simple assignee map (unchanged)
const ASSIGNEE_MAP = {
    'user_a': { name: 'User A', avatar: 'A', color: '0000FF' },
    'user_b': { name: 'User B', avatar: 'B', color: 'FF0000' },
    'user_c': { name: 'User C', avatar: 'C', color: '008000' },
};


// -------------------- DTG / UTILITIES -------------------- //

const MONTH_MAP = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
};

function validateAndConvertDTG(dtgString) {
    const cleanedDtg = dtgString.trim().toUpperCase().replace(/\s+/g, '');
    const regex = /^(\d{2})(\d{4})Z([A-Z]{3})(\d{2})$/; 
    const match = cleanedDtg.match(regex);

    if (!match) return null;

    const [_, day, time, monthAbbr, year] = match;
    const hour = time.substring(0, 2);
    const minute = time.substring(2, 4);
    const monthNum = MONTH_MAP[monthAbbr];

    if (!monthNum) return null;

    const fullYear = `20${year}`;
    const date = new Date(Date.UTC(fullYear, monthNum - 1, day, hour, minute, 0));

    if (date.getUTCDate() != day || date.getUTCMonth() != monthNum - 1) return null;
    return date;
}

function getNextTaskId() {
    const id = `MI-${nextTaskIdNumber.toString().padStart(3, '0')}`;
    nextTaskIdNumber++;
    return id;
}

function formatTimestampForHistory(isoString) {
    const date = new Date(isoString);
    const options = { year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleString('en-US', options);
}


// -------------------- PRIORITY / STATUS HELPERS -------------------- //

function calculatePriority(task) {
    const now = Date.now();
    const opStart = new Date(task.opStartISO).getTime();
    const timeToStart = opStart - now;
    const timeSinceCreation = now - new Date(task.creationTime).getTime();
    const seventyTwoHours = 72 * 60 * 60 * 1000;

    if (timeToStart < seventyTwoHours && timeToStart > 0) {
        return 'ShortNotice';
    }

    if (FRONT_ROUTE_STATUSES.includes(task.status) && timeSinceCreation > seventyTwoHours) {
        return 'NoActionTaken';
    }

    return 'Routine';
}

function getPriorityClass(calculatedPriority) {
    if (calculatedPriority === 'ShortNotice') return 'high'; 
    if (calculatedPriority === 'NoActionTaken') return 'medium'; 
    return 'low';
}

function getTaskById(taskId) {
    return ALL_TASKS.find(t => t.id === taskId);
}

function canTransition(oldStatus, newStatus, task) {
    const allowedTargets = STATUS_TRANSITIONS[oldStatus] || [];

    // Special case for Back Route full vs not full
    if (oldStatus === 'swo-br' && (newStatus === 'anav-br' || newStatus === 'active' || newStatus === 'approved-not-active')) {
        if (newStatus === 'anav-br') {
            return task.needsFullBackRoute === true;  // Only allow if toggle is on
        } else {
            // active / approved-not-active directly from SWO-BR only if not full BR
            return task.needsFullBackRoute === false;
        }
    }

    return allowedTargets.includes(newStatus);
}


// -------------------- KANBAN RENDERING -------------------- //

function createKanbanCardHTML(task) {
    const calculatedPriority = calculatePriority(task);
    const priorityClass = getPriorityClass(calculatedPriority);

    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}" data-priority="${calculatedPriority}">
            <div class="task-priority ${priorityClass}"></div>

            <div class="task-title-group">
                <div class="task-title">${task.unitName} - ${task.operationName}</div>
            </div>

            <div class="task-meta task-op-details">
                <div class="meta-item dtg-info">
                    <label>ID:</label> 
                    <span class="dtg-value">${task.id}</span> 
                </div>
            </div>
        </div>
    `;
}

function renderKanbanBoard() {
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = '';
        const countSpan = list.closest('.kanban-column')?.querySelector('.task-count');
        if (countSpan) countSpan.textContent = '(0)';
    });

    const counts = {};

    ALL_TASKS.forEach(task => {
        const list = document.querySelector(`.task-list[data-status="${task.status}"]`);
        if (list) {
            list.innerHTML += createKanbanCardHTML(task);
            counts[task.status] = (counts[task.status] || 0) + 1;
        }
    });

    Object.keys(counts).forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (column) {
            column.querySelector('.task-count').textContent = `(${counts[status]})`;
        }
    });

    setupModalListeners();
    setupDragAndDropListeners(); 
}


// -------------------- LIST VIEW RENDERING -------------------- //

function renderListView(tasks) {
    const tbody = document.querySelector('#taskTable .list-tbody');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    tasks.forEach(task => {
        const calculatedPriority = calculatePriority(task);
        const assigneeName = ASSIGNEE_MAP[task.assigneeId] ? ASSIGNEE_MAP[task.assigneeId].name : 'N/A';

        const row = document.createElement('tr');
        row.classList.add('list-task-row');
        row.setAttribute('data-task-id', task.id);

        row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.unitName} - ${task.operationName}</td>
            <td>${task.status.toUpperCase()}</td>
            <td>${task.dtg}</td>
            <td><span class="priority-badge ${getPriorityClass(calculatedPriority)}">${calculatedPriority}</span></td>
            <td>${assigneeName}</td>
        `;
        tbody.appendChild(row);
    });

    setupModalListeners(); 
}

function setupListSorting() {
    document.querySelectorAll('#taskTable th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.getAttribute('data-sort-by');
            let sortDir = header.getAttribute('data-sort-dir') || 'asc';

            if (currentSort.column === sortBy) {
                sortDir = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortDir = 'asc';
            }

            currentSort = { column: sortBy, direction: sortDir };

            document.querySelectorAll('#taskTable th.sortable').forEach(h => {
                h.removeAttribute('data-sort-dir');
                h.classList.remove('sorted-asc', 'sorted-desc');
            });

            header.setAttribute('data-sort-dir', sortDir);
            header.classList.add(`sorted-${sortDir}`);

            sortAndRenderList();
        });
    });
}

function getSortValue(task, column) {
    switch (column) {
        case 'id':
            return parseInt(task.id.replace('MI-', ''), 10);
        case 'title':
            return `${task.unitName} - ${task.operationName}`;
        case 'status':
            return task.status;
        case 'dtgDate':
            return task.dtgDate ? task.dtgDate.getTime() : 0; 
        case 'priority': {
            const priorityOrder = { 'ShortNotice': 3, 'NoActionTaken': 2, 'Routine': 1 };
            return priorityOrder[calculatePriority(task)] || 0;
        }
        case 'assignee':
            return ASSIGNEE_MAP[task.assigneeId] ? ASSIGNEE_MAP[task.assigneeId].name : '';
        default:
            return '';
    }
}

function sortAndRenderList() {
    const sortedTasks = [...ALL_TASKS].sort((a, b) => {
        const valA = getSortValue(a, currentSort.column);
        const valB = getSortValue(b, currentSort.column);

        let comparison = 0;
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;

        return currentSort.direction === 'asc' ? comparison : comparison * -1;
    });

    renderListView(sortedTasks);
}


// -------------------- VIEW TOGGLE -------------------- //

function setupViewToggle() {
    document.querySelectorAll('.view-toggle-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetView = e.target.getAttribute('data-view');

            document.querySelectorAll('.view-container').forEach(view => {
                view.style.display = 'none';
                view.classList.remove('active');
            });
            document.querySelectorAll('.view-toggle-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            e.target.classList.add('active');

            let viewElement;
            if (targetView === 'kanban') {
                viewElement = document.getElementById('kanbanView');
                renderKanbanBoard(); 
            } else if (targetView === 'list1') {
                viewElement = document.getElementById('listView1');
                sortAndRenderList();
            } else if (targetView === 'list2') {
                viewElement = document.getElementById('listView2');
            }

            if (viewElement) {
                viewElement.style.display = 'block';
                viewElement.classList.add('active');
            }
        });
    });
}


// -------------------- DRAG & DROP (KANBAN) -------------------- //

let draggedItemId = null;

function handleDragStart(e) {
    draggedItemId = e.currentTarget.getAttribute('data-task-id');
    e.dataTransfer.setData('text/plain', draggedItemId);
    setTimeout(() => { e.currentTarget.style.opacity = '0.5'; }, 0); 
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedItemId = null;
}

function handleDragOver(e) {
    e.preventDefault(); 
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (draggedItemId) {
        const targetList = e.currentTarget;
        const newStatus = targetList.getAttribute('data-status');
        const draggedElement = document.querySelector(`[data-task-id="${draggedItemId}"]`);

        if (draggedElement) {
            const taskIndex = ALL_TASKS.findIndex(t => t.id === draggedItemId);
            if (taskIndex !== -1) {
                const task = ALL_TASKS[taskIndex];
                const oldStatus = task.status;

                // Enforce routing rules
                if (!canTransition(oldStatus, newStatus, task)) {
                    alert(`Invalid move from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} based on the workflow rules.`);
                    return;
                }

                // Update task data
                task.status = newStatus;
                task.timeInCurrentStatus = new Date().toISOString(); 
                task.history.push({
                    timestamp: new Date().toISOString(),
                    action: `Status changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by User A (Drag & Drop).`
                });

                // Auto-routing: when leaving back-route to ACTIVE or APPROVED-NOT-ACTIVE,
                // decide which based on opStart/opEnd and "now".
                if (newStatus === 'active' || newStatus === 'approved-not-active') {
                    autoResolveActiveBucket(task);
                }
            }

            renderKanbanBoard(); 
        }
    }
}

function setupDragAndDropListeners() {
    const taskLists = document.querySelectorAll('.task-list'); 
    const taskCards = document.querySelectorAll('.task-card');

    taskCards.forEach(card => {
        card.removeEventListener('dragstart', handleDragStart);
        card.removeEventListener('dragend', handleDragEnd);
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    taskLists.forEach	list => {
        list.removeEventListener('dragover', handleDragOver);
        list.removeEventListener('dragleave', handleDragLeave);
        list.removeEventListener('drop', handleDrop);
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop', handleDrop);
    });
}


// -------------------- MODAL LOGIC -------------------- //

function setupModalListeners() {
    document.querySelectorAll('.task-card, .list-task-row').forEach(element => {
        element.removeEventListener('dblclick', openTaskDetailModal); 
        element.addEventListener('dblclick', openTaskDetailModal);
    });

    const openCreateTaskBtn = document.getElementById('openCreateTaskModal');
    if (openCreateTaskBtn) {
        openCreateTaskBtn.removeEventListener('click', openCreateModal);
        openCreateTaskBtn.addEventListener('click', openCreateModal);
    }

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.removeEventListener('click', closeModalHandler);
        btn.addEventListener('click', closeModalHandler);
    });

    document.querySelectorAll('.task-modal-overlay').forEach(overlay => {
        overlay.removeEventListener('click', outsideModalClickClose);
        overlay.addEventListener('click', outsideModalClickClose);
    });

    const newTaskForm = document.getElementById('newTaskForm');
    if (newTaskForm) {
        newTaskForm.removeEventListener('submit', handleNewTaskSubmit);
        newTaskForm.addEventListener('submit', handleNewTaskSubmit);
    }

    const editBtn = document.querySelector('#modal-metadata-section .edit-metadata-btn');
    if (editBtn) {
        editBtn.removeEventListener('click', toggleMetadataEdit);
        editBtn.addEventListener('click', toggleMetadataEdit);
    }

    const statusDropdown = document.querySelector('.task-status-dropdown');
    if (statusDropdown) {
        statusDropdown.removeEventListener('change', handleStatusChange);
        statusDropdown.addEventListener('change', handleStatusChange);
    }

    const brToggle = document.getElementById('brToggle');
    if (brToggle) {
        brToggle.removeEventListener('change', handleBackRouteToggleChange);
        brToggle.addEventListener('change', handleBackRouteToggleChange);
    }
}

function openCreateModal() {
     document.getElementById('createTaskModal')?.classList.add('is-visible');
}

function closeModalHandler(e) {
    const modalId = e.target.getAttribute('data-close-modal');
    if(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('is-visible');
        if (modalId === 'createTaskModal') {
            const form = document.getElementById('newTaskForm');
            if (form) form.reset();
            const validationMsg = document.getElementById('dtg-validation-msg');
            if (validationMsg) validationMsg.textContent = ''; 
            const list = document.getElementById('newTaskAttachmentList');
            if (list) list.innerHTML = '';
        }
    }
}

function outsideModalClickClose(e) {
    const overlay = e.currentTarget;
    if (e.target === overlay) {
        overlay.classList.remove('is-visible');
        if (overlay.id === 'createTaskModal') {
            const form = document.getElementById('newTaskForm');
            if (form) form.reset();
            const validationMsg = document.getElementById('dtg-validation-msg');
            if (validationMsg) validationMsg.textContent = '';
            const list = document.getElementById('newTaskAttachmentList');
            if (list) list.innerHTML = '';
        }
    }
}

function openTaskDetailModal(e) {
    e.stopPropagation(); 
    const taskId = e.currentTarget.getAttribute('data-task-id');
    const task = getTaskById(taskId);

    if (task) {
        const assignee = ASSIGNEE_MAP[task.assigneeId];
        const calculatedPriority = calculatePriority(task);
        const metadataSection = document.getElementById('modal-metadata-section');

        metadataSection.setAttribute('data-editing', 'false');
        document.querySelector('.edit-metadata-btn').textContent = 'Edit Task Info';

        document.getElementById('modal-task-title').textContent = `${task.unitName} - ${task.operationName}`;
        document.getElementById('modal-task-key').textContent = task.id;

        document.getElementById('modal-description').textContent = task.description;
        document.getElementById('modal-unit-name').textContent = task.unitName;
        document.getElementById('modal-op-name').textContent = task.operationName;
        document.getElementById('modal-dtg').textContent = task.dtg;
        document.getElementById('modal-duration').textContent = `${task.opStartDisplay} - ${task.opEndDisplay}`;
        document.getElementById('modal-assignee').textContent = assignee ? assignee.name : 'N/A';
        document.getElementById('modal-priority').textContent = calculatedPriority;

        const statusDropdown = document.querySelector('.task-status-dropdown');
        if (statusDropdown) {
            statusDropdown.value = task.status;
            statusDropdown.setAttribute('data-current-task-id', task.id);
        }

        renderTaskHistory(task);
        renderBackRouteToggle(task);

        document.getElementById('taskDetailModal').classList.add('is-visible');
        const txtEditorArea = document.getElementById('txtEditorArea');
        if (txtEditorArea) txtEditorArea.classList.add('hidden'); 
    }
}

function renderTaskHistory(task) {
    const historyListEl = document.getElementById('modal-history-list');
    historyListEl.innerHTML = '';

    const sortedHistory = [...task.history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedHistory.forEach(item => {
        const listItem = document.createElement('div');
        listItem.classList.add('history-item');
        listItem.innerHTML = `
            <span class="timestamp">${formatTimestampForHistory(item.timestamp)}</span>
            <span class="action">${item.action}</span>
        `;
        historyListEl.appendChild(listItem);
    });
}

function handleStatusChange(e) {
    const newStatus = e.target.value;
    const taskId = e.target.getAttribute('data-current-task-id');
    const task = getTaskById(taskId);

    if (!task) return;

    const oldStatus = task.status;
    if (oldStatus === newStatus) return;

    // Enforce routing rules for manual dropdown change
    if (!canTransition(oldStatus, newStatus, task)) {
        alert(`Invalid move from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} based on the workflow rules.`);
        e.target.value = oldStatus;
        return;
    }

    task.status = newStatus;
    task.timeInCurrentStatus = new Date().toISOString();
    task.history.push({
        timestamp: new Date().toISOString(),
        action: `Status manually changed from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} by User A.`
    });

    if (newStatus === 'active' || newStatus === 'approved-not-active') {
        autoResolveActiveBucket(task);
    }

    renderKanbanBoard();
    renderTaskHistory(task);
    renderBackRouteToggle(task);
}

function toggleMetadataEdit(e) {
    const metadataSection = document.getElementById('modal-metadata-section');
    const editBtn = e.target;
    const isEditing = metadataSection.getAttribute('data-editing') === 'true';

    const statusDropdown = document.querySelector('.task-status-dropdown');
    const taskId = statusDropdown?.getAttribute('data-current-task-id');
    const task = getTaskById(taskId);
    if (!task) return;

    if (isEditing) {
        const newUnitName = metadataSection.querySelector('#input-unit-name').value;
        const newOpName = metadataSection.querySelector('#input-op-name').value;
        const newDtg = metadataSection.querySelector('#input-dtg').value;

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
            if (dtgDate) {
                task.dtg = newDtg.toUpperCase();
                task.dtgDate = dtgDate;
                historyAction += ` DTG changed to ${newDtg.toUpperCase()}.`;
                changesMade = true;
            } else {
                alert("Invalid DTG format. Changes were NOT saved.");
                return;
            }
        }

        if (changesMade) {
            task.history.push({
                timestamp: new Date().toISOString(),
                action: historyAction
            });
        }

        metadataSection.setAttribute('data-editing', 'false');
        editBtn.textContent = 'Edit Task Info';

        openTaskDetailModal({ currentTarget: { getAttribute: () => taskId } });
        renderKanbanBoard(); 

    } else {
        metadataSection.setAttribute('data-editing', 'true');
        editBtn.textContent = 'Save Changes';

        const currentUnit = task.unitName;
        const currentOp = task.operationName;
        const currentDtg = task.dtg;

        metadataSection.querySelector('#modal-unit-name').innerHTML = `<input type="text" id="input-unit-name" value="${currentUnit}">`;
        metadataSection.querySelector('#modal-op-name').innerHTML = `<input type="text" id="input-op-name" value="${currentOp}">`;
        metadataSection.querySelector('#modal-dtg').innerHTML = `<input type="text" id="input-dtg" value="${currentDtg}">`;
    }
}


// -------------------- BACK ROUTE TOGGLE & ACTIVE BUCKET -------------------- //

function renderBackRouteToggle(task) {
    const containerId = 'back-route-toggle-container';
    let container = document.getElementById(containerId);

    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.marginTop = '10px';
        container.style.fontSize = '13px';
        const metaSection = document.getElementById('modal-metadata-section');
        metaSection.appendChild(container);
    }

    if (!SHOW_BR_TOGGLE_STATUSES.includes(task.status)) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <label>
            <input type="checkbox" id="brToggle" ${task.needsFullBackRoute ? 'checked' : ''}>
            Requires full Back Route (ANAV BR & REO BR)
        </label>
    `;

    const brToggle = document.getElementById('brToggle');
    if (brToggle) {
        brToggle.removeEventListener('change', handleBackRouteToggleChange);
        brToggle.addEventListener('change', handleBackRouteToggleChange);
    }
}

function handleBackRouteToggleChange(e) {
    const statusDropdown = document.querySelector('.task-status-dropdown');
    const taskId = statusDropdown?.getAttribute('data-current-task-id');
    const task = getTaskById(taskId);
    if (!task) return;

    task.needsFullBackRoute = e.target.checked;
    task.history.push({
        timestamp: new Date().toISOString(),
        action: `Back Route requirement updated: ${task.needsFullBackRoute ? 'Full ANAV/REO BR required' : 'SWO BR only'} by User A.`
    });

    renderTaskHistory(task);
}

// Decide whether a task should go to ACTIVE or APPROVED-NOT-ACTIVE
// Based on time vs opStart/opEnd
function autoResolveActiveBucket(task) {
    const now = Date.now();
    const opStart = new Date(task.opStartISO).getTime();
    const opEnd   = task.opEndISO ? new Date(task.opEndISO).getTime() : null;

    // If we are before opStart, it's "approved but not yet active"
    if (now < opStart) {
        if (task.status !== 'approved-not-active') {
            task.status = 'approved-not-active';
            task.history.push({
                timestamp: new Date().toISOString(),
                action: `Auto-routed to APPROVED BUT NOT ACTIVE based on operation start time.`
            });
        }
    } else if (opEnd && now < opEnd) {
        // In the middle of the operational window => active
        if (task.status !== 'active') {
            task.status = 'active';
            task.history.push({
                timestamp: new Date().toISOString(),
                action: `Auto-routed to ACTIVE based on current time within operation window.`
            });
        }
    } else if (opEnd && now >= opEnd) {
        // Operation is finished => WASP deletion
        if (task.status !== 'wasp-deletion') {
            task.status = 'wasp-deletion';
            task.history.push({
                timestamp: new Date().toISOString(),
                action: `Auto-routed to WASP DELETION: operation has completed based on time duration.`
            });
        }
    }
}


// -------------------- NEW TASK FORM -------------------- //

function handleNewTaskSubmit(e) {
    e.preventDefault();

    const dtgInput = document.getElementById('dtg').value;
    const validationMsg = document.getElementById('dtg-validation-msg');

    const dtgDate = validateAndConvertDTG(dtgInput);
    if (!dtgDate) {
        validationMsg.textContent = 'Invalid DTG format. Must be DDHHMMZMMYY (e.g., 101330Z DEC 25)';
        validationMsg.style.color = 'red';
        return;
    } else {
        validationMsg.textContent = 'DTG format is valid.';
        validationMsg.style.color = 'green';
    }

    const unitName = document.getElementById('unitName').value;
    const operationName = document.getElementById('operationName').value;
    const description = document.getElementById('description').value;
    const opStartLocal = document.getElementById('opStart').value;
    const opEndLocal = document.getElementById('opEnd').value;

    const newAttachments = [];
    document.querySelectorAll('#newTaskAttachmentList li').forEach(li => {
        const fileName = li.querySelector('.file-name').textContent;
        newAttachments.push({
            fileName: fileName,
            fileType: fileName.endsWith('.txt') ? 'txt' : 'doc',
            filePath: `task-${getNextTaskId()}_${fileName}`, 
            isEditable: fileName.endsWith('.txt')
        });
    });

    const opStartISO = new Date(opStartLocal).toISOString();
    const opEndISO = opEndLocal ? new Date(opEndLocal).toISOString() : '';

    const dateOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' };
    const opStartDisplay = new Date(opStartLocal).toLocaleString('en-US', dateOptions).replace(/,/, '').replace(/\sUTC/i, 'Z');
    const opEndDisplay = opEndLocal ? new Date(opEndLocal).toLocaleString('en-US', dateOptions).replace(/,/, '').replace(/\sUTC/i, 'Z') : '';

    // All new tasks start at Front Route QMOW
    const newTaskId = getNextTaskId();
    const newTask = {
        id: newTaskId,
        status: "qmow",
        group: "Front-Route",
        unitName: unitName, 
        operationName: operationName,
        dtg: dtgInput.toUpperCase(),
        dtgDate: dtgDate,
        opStartISO: opStartISO, 
        opEndISO: opEndISO,
        opStartDisplay: opStartDisplay, 
        opEndDisplay: opEndDisplay,
        creationTime: new Date().toISOString(),
        timeInCurrentStatus: new Date().toISOString(),
        assigneeId: "user_a", 
        description: description,
        needsFullBackRoute: false,
        attachments: newAttachments,
        history: [{ timestamp: new Date().toISOString(), action: "Task created by User A (initial status QMOW Front Route)." }]
    };

    ALL_TASKS.push(newTask);
    renderKanbanBoard();

    const createModal = document.getElementById('createTaskModal');
    if (createModal) createModal.classList.remove('is-visible');
    const form = document.getElementById('newTaskForm');
    if (form) form.reset();
    validationMsg.textContent = '';
    const list = document.getElementById('newTaskAttachmentList');
    if (list) list.innerHTML = ''; 
}


// -------------------- ATTACHMENT DRAG & DROP (CREATE TASK MODAL) -------------------- //

function setupNewTaskAttachmentListeners() {
    const dropZone = document.getElementById('newTaskDropZone');
    const fileInput = document.getElementById('newTaskFileSelect');
    const attachmentList = document.getElementById('newTaskAttachmentList');

    if (!dropZone || !fileInput || !attachmentList) return;

    dropZone.addEventListener('click', (e) => {
        if (e.target.closest('.drop-zone-area') && !e.target.closest('li')) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over-active');
    });
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over-active');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over-active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over-active');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    function handleFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const existingFiles = Array.from(attachmentList.querySelectorAll('.file-name')).map(el => el.textContent);
            if (existingFiles.includes(file.name)) {
                 alert(`File "${file.name}" is already listed.`);
                 continue;
            }

            const li = document.createElement('li');
            li.classList.add('attachment-item');
            li.innerHTML = `
                <span class="file-name">${file.name}</span>
                <button type="button" class="remove-file-btn">&times;</button>
            `;

            li.querySelector('.remove-file-btn').addEventListener('click', () => {
                li.remove();
            });

            attachmentList.appendChild(li);
        }
    }
}


// -------------------- TXT EDITOR TABS -------------------- //

function setupTxtEditorTabs() {
    const editTxtBtn = document.querySelector('.attachments-section .edit-btn');
    const txtEditorArea = document.getElementById('txtEditorArea');
    const editorTabContent = document.getElementById('editor-tab');
    const historyTabContent = document.getElementById('history-tab');

    if (editTxtBtn) {
        editTxtBtn.addEventListener('click', () => {
            if (txtEditorArea) txtEditorArea.classList.toggle('hidden');
        });
    }

    document.querySelectorAll('.editor-tabs .tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            document.querySelectorAll('.editor-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            if (editorTabContent) editorTabContent.style.display = (tabName === 'editor') ? 'block' : 'none';
            if (historyTabContent) historyTabContent.style.display = (tabName === 'history') ? 'block' : 'none';
        });
    });
}


// -------------------- INITIALIZATION -------------------- //

document.addEventListener('DOMContentLoaded', () => {
    setupViewToggle();
    setupListSorting();
    renderKanbanBoard(); 
    setupNewTaskAttachmentListeners(); 
    setupTxtEditorTabs();
});
