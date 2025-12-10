// Attachment handling for Create Task modal (drag & drop + click)

function setupNewTaskAttachmentListeners() {
    const dropZone = document.getElementById("newTaskDropZone");
    const fileInput = document.getElementById("newTaskFileSelect");
    const attachmentList = document.getElementById("newTaskAttachmentList");

    if (!dropZone || !fileInput || !attachmentList) return;

    // Click to open file dialog
    dropZone.addEventListener("click", e => {
        if (e.target.closest(".drop-zone-area") && !e.target.closest("li")) {
            fileInput.click();
        }
    });

    fileInput.addEventListener("change", e => {
        handleFiles(e.target.files, attachmentList);
    });

    // Drag visuals
    dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("drag-over-active");
    });

    dropZone.addEventListener("dragenter", e => {
        e.preventDefault();
        dropZone.classList.add("drag-over-active");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over-active");
    });

    dropZone.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.classList.remove("drag-over-active");
        const files = e.dataTransfer.files;
        handleFiles(files, attachmentList);
    });
}

function handleFiles(files, attachmentList) {
    if (!files || !attachmentList) return;

    const existingFiles = Array.from(
        attachmentList.querySelectorAll(".file-name")
    ).map(el => el.textContent);

    const template = document.getElementById("new-task-attachment-item-template");

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (existingFiles.includes(file.name)) {
            alert(`File "${file.name}" is already listed.`);
            continue;
        }

        let li;
        if (template) {
            const fragment = template.content.cloneNode(true);
            li = fragment.querySelector("li.attachment-item");
            const nameSpan = li.querySelector(".file-name");
            if (nameSpan) nameSpan.textContent = file.name;
        } else {
            li = document.createElement("li");
            li.classList.add("attachment-item");
            li.innerHTML = `
                <span class="file-name">${file.name}</span>
                <button type="button" class="remove-file-btn">&times;</button>
            `;
        }

        const removeBtn = li.querySelector(".remove-file-btn");
        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                li.remove();
            });
        }

        attachmentList.appendChild(li);
    }
}
