// Global state & initial data

// Next task number (MI-005, MI-006, etc.)
let nextTaskIdNumber = 5;

// List view sorting state
let currentSort = { column: 'id', direction: 'asc' };

// Core task data
const ALL_TASKS = [
    {
        id: "MI-001",
        status: "qmow",
        group: "Front-Route",
        unitName: "USS Surface Ship",
        operationName: "OTS Ops",
        dtg: "101330Z DEC 25",
        dtgDate: new Date("2025-12-10T13:30:00Z"),
        opStartISO: "2025-12-10T04:30:00Z",
        opEndISO: "2025-12-15T18:00:00Z",
        opStartDisplay: "10 DEC 04:30Z",
        opEndDisplay: "15 DEC 18:00Z",
        creationTime: "2025-12-05T08:00:00Z",
        timeInCurrentStatus: "2025-12-05T08:00:00Z",
        assigneeId: "user_a",
        description: "Review planned surface movements and confirm asset availability.",
        attachments: [],
        history: [
            { timestamp: "2025-12-05T08:00:00Z", action: "Created task." }
        ]
    },
    {
        id: "MI-002",
        status: "anav",
        group: "Front-Route",
        unitName: "CGC Cutter",
        operationName: "SAR Mission",
        dtg: "130900Z DEC 25",
        dtgDate: new Date("2025-12-13T09:00:00Z"),
        opStartISO: "2025-12-13T09:00:00Z",
        opEndISO: "2025-12-13T23:00:00Z",
        opStartDisplay: "13 JAN 09:00Z",
        opEndDisplay: "13 JAN 23:00Z",
        creationTime: "2025-12-09T10:00:00Z",
        timeInCurrentStatus: "2025-12-09T10:00:00Z",
        assigneeId: "user_b",
        description: "Coordinate flight paths and rescue recovery.",
        attachments: [],
        history: [
            { timestamp: "2025-12-09T10:00:00Z", action: "Created task." }
        ]
    },
    {
        id: "MI-003",
        status: "qmow",
        group: "Front-Route",
        unitName: "RFA Carrier",
        operationName: "Routine Transit",
        dtg: "201000Z DEC 25",
        dtgDate: new Date("2025-12-20T10:00:00Z"),
        opStartISO: "2025-12-20T10:00:00Z",
        opEndISO: "2025-12-25T16:00:00Z",
        opStartDisplay: "20 DEC 10:00Z",
        opEndDisplay: "25 DEC 16:00Z",
        creationTime: "2025-12-09T08:00:00Z",
        timeInCurrentStatus: "2025-12-09T08:00:00Z",
        assigneeId: "user_c",
        description: "Standard administrative message.",
        attachments: [],
        history: [
            { timestamp: "2025-12-09T08:00:00Z", action: "Created task." }
        ]
    },
    {
        id: "MI-004",
        status: "qmow",
        group: "Front-Route",
        unitName: "USS Test",
        operationName: "Short Notice",
        dtg: "101330Z DEC 25",
        dtgDate: new Date("2025-12-10T13:30:00Z"),
        opStartISO: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 mins from now
        opEndISO: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        opStartDisplay: "10 DEC 05:15Z",
        opEndDisplay: "11 DEC 17:15Z",
        creationTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        timeInCurrentStatus: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        assigneeId: "user_a",
        description: "testing the short notice priority coding.",
        attachments: [
            {
                fileName: "Requirements_Draft.txt",
                fileType: "txt",
                filePath: "reqs-draft.txt",
                isEditable: true
            }
        ],
        history: [
            { timestamp: "2025-12-09T18:00:00Z", action: "Created task." },
            { timestamp: "2025-12-09T20:00:00Z", action: "Status changed to QMOW by User A." }
        ]
    }
];

// Assignee info
const ASSIGNEE_MAP = {
    user_a: { name: "User A", avatar: "A", color: "0000FF" },
    user_b: { name: "User B", avatar: "B", color: "FF0000" },
    user_c: { name: "User C", avatar: "C", color: "008000" }
};

// Front-route status list (used for NoActionTaken logic)
const FRONT_ROUTE_STATUSES = ["qmow", "swo", "anav", "reo"];
