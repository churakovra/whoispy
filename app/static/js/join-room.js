"use strict";
// Check room access with a short delay and reveal password for closed rooms.
(() => {
    const form = document.querySelector(".join-form");
    const roomIdInput = document.getElementById("room-id-input");
    const passwordField = document.getElementById("join-password-field");
    const passwordInput = document.getElementById("join-password-input");
    const passwordStatus = document.getElementById("join-password-status");
    const statusText = document.getElementById("join-room-status");
    const submitButton = document.getElementById("join-submit-btn");
    if (!form || !roomIdInput || !passwordField || !passwordInput || !passwordStatus || !statusText || !submitButton) {
        return;
    }
    let requestTimer = 0;
    let activeRequestId = 0;
    let isCurrentRoomClosed = false;
    const setStatus = (text, tone = "default") => {
        statusText.textContent = text;
        statusText.classList.remove("is-error", "is-success");
        statusText.classList.toggle("hidden", !text);
        if (tone === "error") {
            statusText.classList.add("is-error");
        }
        if (tone === "success") {
            statusText.classList.add("is-success");
        }
    };
    const setPasswordStatus = (text, tone = "default") => {
        passwordStatus.textContent = text;
        passwordStatus.classList.remove("is-error");
        passwordStatus.classList.toggle("hidden", !text);
        if (tone === "error") {
            passwordStatus.classList.add("is-error");
        }
    };
    const setPasswordState = (isVisible) => {
        passwordField.hidden = !isVisible;
        passwordField.style.display = isVisible ? "" : "none";
        passwordInput.required = isVisible;
        if (!isVisible) {
            passwordInput.value = "";
        }
        setPasswordStatus("");
    };
    const setSubmitState = (isEnabled) => {
        submitButton.disabled = !isEnabled;
    };
    const resetFormState = () => {
        setPasswordState(false);
        setSubmitState(false);
        isCurrentRoomClosed = false;
        setStatus("Enter room id");
    };
    const parsePayload = async (response) => {
        const payload = await response.json();
        if (typeof payload === "string") {
            try {
                return JSON.parse(payload);
            }
            catch (_error) {
                return null;
            }
        }
        return payload;
    };
    const validatePassword = async (roomId, requestId) => {
        if (!isCurrentRoomClosed) {
            setSubmitState(true);
            return;
        }
        const trimmedPassword = passwordInput.value.trim();
        if (!trimmedPassword) {
            setSubmitState(false);
            setPasswordStatus("");
            return;
        }
        setSubmitState(false);
        setPasswordStatus("");
        try {
            const response = await fetch(`/room/${encodeURIComponent(roomId)}/validate`, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ room_password: trimmedPassword }),
            });
            if (requestId !== activeRequestId) {
                return;
            }
            if (!response.ok) {
                setPasswordStatus("Unable to validate password", "error");
                return;
            }
            const payload = await parsePayload(response);
            if (requestId !== activeRequestId) {
                return;
            }
            if (payload?.is_valid === true) {
                setSubmitState(true);
                setPasswordStatus("");
                return;
            }
            setSubmitState(false);
            if (payload?.is_valid === false) {
                setPasswordStatus("Wrong password", "error");
                return;
            }
            setPasswordStatus("Unable to validate password", "error");
        }
        catch (_error) {
            if (requestId !== activeRequestId) {
                return;
            }
            setSubmitState(false);
            setPasswordStatus("Unable to validate password", "error");
        }
    };
    const checkRoomAccess = async (roomId, requestId) => {
        setSubmitState(false);
        setStatus("Checking room...");
        try {
            const response = await fetch(`/room/${encodeURIComponent(roomId)}/status`, {
                headers: {
                    "Accept": "application/json",
                },
            });
            if (requestId !== activeRequestId) {
                return;
            }
            if (!response.ok) {
                setPasswordState(false);
                setStatus("Unable to check room", "error");
                return;
            }
            const payload = await parsePayload(response);
            if (requestId !== activeRequestId) {
                return;
            }
            if (!payload || typeof payload.is_closed !== "boolean") {
                isCurrentRoomClosed = false;
                setPasswordState(false);
                setStatus("Room not found", "error");
                return;
            }
            const isClosed = payload.is_closed === true;
            isCurrentRoomClosed = isClosed;
            setPasswordState(isClosed);
            if (isClosed) {
                setSubmitState(false);
                setStatus("");
                return;
            }
            setSubmitState(true);
            setStatus("");
        }
        catch (_error) {
            if (requestId !== activeRequestId) {
                return;
            }
            isCurrentRoomClosed = false;
            setPasswordState(false);
            setStatus("Unable to check room", "error");
        }
    };
    roomIdInput.addEventListener("input", () => {
        const roomId = roomIdInput.value.trim();
        activeRequestId += 1;
        window.clearTimeout(requestTimer);
        if (!roomId) {
            resetFormState();
            return;
        }
        setPasswordState(false);
        setSubmitState(false);
        setStatus("Checking room...");
        const requestId = activeRequestId;
        requestTimer = window.setTimeout(() => {
            void checkRoomAccess(roomId, requestId);
        }, 400);
    });
    passwordInput.addEventListener("input", () => {
        if (passwordField.hidden) {
            return;
        }
        activeRequestId += 1;
        window.clearTimeout(requestTimer);
        const roomId = roomIdInput.value.trim();
        const trimmedPassword = passwordInput.value.trim();
        if (!roomId) {
            resetFormState();
            return;
        }
        if (!trimmedPassword) {
            setSubmitState(false);
            setPasswordStatus("");
            return;
        }
        const requestId = activeRequestId;
        requestTimer = window.setTimeout(() => {
            void validatePassword(roomId, requestId);
        }, 400);
    });
    form.addEventListener("submit", () => {
        roomIdInput.value = roomIdInput.value.trim();
        passwordInput.value = passwordInput.value.trim();
        form.action = `/room/${encodeURIComponent(roomIdInput.value)}`;
    });
    resetFormState();
})();
