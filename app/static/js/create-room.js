"use strict";
// Handle room access toggle and password field visibility
(() => {
    const closedToggle = document.getElementById("room-closed-toggle");
    const passwordField = document.getElementById("password-field");
    const passwordInput = passwordField?.querySelector("input[name='room_password']");
    const roomAccessInput = document.getElementById("room-access");
    const accessHint = document.getElementById("room-access-hint");
    // Update UI based on toggle state
    const setAccess = () => {
        const isClosed = closedToggle?.checked === true;
        if (passwordField) {
            passwordField.hidden = !isClosed;
            passwordField.style.display = isClosed ? "" : "none";
        }
        if (passwordInput) {
            passwordInput.required = isClosed;
            if (!isClosed)
                passwordInput.value = "";
        }
        if (roomAccessInput) {
            roomAccessInput.value = isClosed ? "closed" : "open";
        }
        if (accessHint) {
            accessHint.textContent = isClosed ? "Closed room" : "Open room";
        }
    };
    // Normalize integer inputs to enforce min/max values
    const normalizeInt = (input) => {
        const digits = String(input.value).replace(/[^\d]/g, "");
        if (!digits) {
            input.value = "";
            return;
        }
        const min = Number(input.min || "1");
        const max = Number(input.max || "999999");
        const parsed = Number.parseInt(digits, 10);
        const clamped = Math.min(Math.max(parsed, min), max);
        input.value = String(clamped);
    };
    // Initialize toggle event listener
    if (closedToggle) {
        closedToggle.addEventListener("change", setAccess);
        setAccess(); // Set initial state
    }
    // Handle number input validation
    const integerInputs = document.querySelectorAll("input[type='number']");
    Array.from(integerInputs).forEach((input) => {
        input.addEventListener("input", () => normalizeInt(input));
        input.addEventListener("blur", () => {
            if (!input.value) {
                input.value = input.getAttribute("value") || input.min || "1";
            }
            normalizeInt(input);
        });
    });
})();
