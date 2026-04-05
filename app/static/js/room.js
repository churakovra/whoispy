"use strict";
// Render room users and update from WebSocket messages.
(() => {
    const roomCard = document.querySelector(".room-card");
    const usersList = document.getElementById("users-list");
    const emptyState = document.getElementById("empty-state");
    const statusText = document.getElementById("room-connection-status");
    const readyButton = document.getElementById("ready-button");
    if (!roomCard || !usersList || !emptyState || !statusText) {
        return;
    }
    const roomId = roomCard.dataset.roomId || "";
    if (!roomId) {
        statusText.textContent = "Room id is missing";
        return;
    }
    const usersMap = new Map();
    let isCurrentUserReady = false;
    const renderReadyButton = () => {
        if (!readyButton) {
            return;
        }
        readyButton.textContent = isCurrentUserReady ? "Not Ready" : "Ready";
    };
    const renderUsers = () => {
        usersList.innerHTML = "";
        const users = Array.from(usersMap.values());
        users.forEach((user) => {
            const row = document.createElement("li");
            row.className = `user-row ${user.ready ? "user-row-ready" : "user-row-not-ready"}`;
            const name = document.createElement("span");
            name.className = "user-name";
            name.textContent = user.name;
            const state = document.createElement("span");
            state.className = "user-state";
            state.textContent = user.ready ? "Ready" : "Not ready";
            row.appendChild(name);
            row.appendChild(state);
            usersList.appendChild(row);
        });
        emptyState.classList.toggle("hidden", users.length > 0);
    };
    const setUsers = (users) => {
        usersMap.clear();
        users.forEach((user) => {
            if (!user || typeof user.id === "undefined")
                return;
            usersMap.set(String(user.id), {
                id: String(user.id),
                name: String(user.name || "Player"),
                ready: Boolean(user.ready),
            });
        });
        renderUsers();
    };
    const updateUser = (user) => {
        if (!user || typeof user.id === "undefined")
            return;
        const id = String(user.id);
        const current = usersMap.get(id);
        usersMap.set(id, {
            id,
            name: String(user.name || current?.name || "Player"),
            ready: Boolean(typeof user.ready === "undefined" ? current?.ready : user.ready),
        });
        renderUsers();
    };
    const removeUser = (idValue) => {
        usersMap.delete(String(idValue));
        renderUsers();
    };
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/room/${encodeURIComponent(roomId)}`;
    statusText.textContent = "Connecting...";
    renderReadyButton();
    try {
        const socket = new WebSocket(wsUrl);
        socket.addEventListener("open", () => {
            statusText.textContent = "Connected";
        });
        socket.addEventListener("close", () => {
            statusText.textContent = "Disconnected";
        });
        socket.addEventListener("error", () => {
            statusText.textContent = "Connection error";
        });
        socket.addEventListener("message", (event) => {
            let payload = null;
            try {
                payload = JSON.parse(event.data);
            }
            catch (_a) {
                return;
            }
            if (Array.isArray(payload?.users)) {
                setUsers(payload.users);
                return;
            }
            const eventType = payload?.event;
            if (eventType === "user_joined" || eventType === "user_updated" || eventType === "user_ready") {
                updateUser(payload.user);
            }
            if (eventType === "user_left") {
                removeUser(payload.user_id);
            }
        });
        if (readyButton) {
            readyButton.addEventListener("click", () => {
                isCurrentUserReady = !isCurrentUserReady;
                socket.send(JSON.stringify({ action: "set_ready", ready: isCurrentUserReady }));
                renderReadyButton();
            });
        }
    }
    catch (_b) {
        statusText.textContent = "WebSocket unavailable";
    }
})();
