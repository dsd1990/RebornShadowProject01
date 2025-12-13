// General utilities (DTG, timestamps, IDs)

// Month map for DTG parsing
const MONTH_MAP = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12"
};

/**
 * Validates the DTG string (DDHHMMZMMYY) and converts it into a Date object (UTC).
 * Returns null if invalid.
 */
function validateAndConvertDTG(dtgString) {
    if (!dtgString) return null;

    const cleanedDtg = dtgString.trim().toUpperCase().replace(/\s+/g, "");
    const regex = /^(\d{2})(\d{4})Z([A-Z]{3})(\d{2})$/; // DDHHMMZMMMYY (MMM for month)
    const match = cleanedDtg.match(regex);

    if (!match) return null;

    const [, day, time, monthAbbr, year] = match;
    const hour = time.substring(0, 2);
    const minute = time.substring(2, 4);
    const monthNum = MONTH_MAP[monthAbbr];

    if (!monthNum) return null;

    const fullYear = `20${year}`;
    const date = new Date(
        Date.UTC(fullYear, Number(monthNum) - 1, Number(day), Number(hour), Number(minute), 0)
    );

    if (
        date.getUTCDate() !== Number(day) ||
        date.getUTCMonth() !== Number(monthNum) - 1
    ) {
        return null;
    }

    return date;
}

/**
 * Generates the next sequential Task ID (e.g., MI-004).
 * Uses and updates global nextTaskIdNumber.
 */
function getNextTaskId() {
    const id = `MI-${nextTaskIdNumber.toString().padStart(3, "0")}`;
    nextTaskIdNumber++;
    return id;
}

/**
 * Converts ISO timestamp to readable local time for history display.
 */
function formatTimestampForHistory(isoString) {
    const date = new Date(isoString);
    const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    };
    return date.toLocaleString("en-US", options);
}
