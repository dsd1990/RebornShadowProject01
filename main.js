// High-level wiring: view toggle & initialization

function setupViewToggle() {
    document.querySelectorAll(".view-toggle-btn").forEach(button => {
        button.addEventListener("click", e => {
            const targetView = e.target.getAttribute("data-view");

            // Deactivate all views / buttons
            document.querySelectorAll(".view-container").forEach(view => {
                view.style.display = "none";
                view.classList.remove("active");
            });
            document.querySelectorAll(".view-toggle-btn").forEach(btn => {
                btn.classList.remove("active");
            });

            // Activate clicked button
            e.target.classList.add("active");

            let viewElement;
            if (targetView === "kanban") {
                viewElement = document.getElementById("kanbanView");
                renderKanbanBoard();
            } else if (targetView === "list1") {
                viewElement = document.getElementById("listView1");
                sortAndRenderList();
            } else if (targetView === "list2") {
                viewElement = document.getElementById("listView2");
            }

            if (viewElement) {
                viewElement.style.display = "block";
                viewElement.classList.add("active");
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupViewToggle();
    setupListSorting();
    renderKanbanBoard();
    setupNewTaskAttachmentListeners();
    setupTxtEditor();
});
