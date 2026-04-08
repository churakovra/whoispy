"use strict";
// Render room users and update from WebSocket messages.
(() => {
    const roomCard = document.querySelector(".room-card");
    const usersList = document.getElementById("users-list");
    const emptyState = document.getElementById("empty-state");
    const statusText = document.getElementById("room-connection-status");
    const readyButton = document.getElementById("ready-button");
    const startGameButton = document.getElementById("start-game-button");
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
    let currentUserId = null;
    let hostUserId = roomCard.dataset.hostUserId || null;
    const renderReadyButton = () => {
        if (!readyButton) {
            return;
        }
        readyButton.textContent = isCurrentUserReady ? "Not Ready" : "Ready";
    };
    const renderStartGameButton = () => {
        if (!startGameButton || !currentUserId || !hostUserId) {
            return;
        }
        // Only show Start Game button for host
        if (currentUserId !== hostUserId) {
            startGameButton.classList.add("hidden");
            return;
        }
        // Check if all players are ready
        const users = Array.from(usersMap.values());
        const allReady = users.length > 0 && users.every(user => user.ready);
        if (allReady) {
            startGameButton.classList.remove("hidden");
        } else {
            startGameButton.classList.add("hidden");
        }
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
            // Show host indicator for the host user
            if (user.id === hostUserId) {
                const hostIndicator = document.createElement("span");
                hostIndicator.className = "user-host-indicator";
                hostIndicator.textContent = "Host";
                row.appendChild(hostIndicator);
            }
            const state = document.createElement("span");
            state.className = "user-state";
            state.textContent = user.ready ? "Ready" : "Not ready";
            row.appendChild(name);
            row.appendChild(state);
            usersList.appendChild(row);
        });
        emptyState.classList.toggle("hidden", users.length > 0);
        renderStartGameButton();
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
            // Update current user ID if provided
            if (payload?.user_id) {
                currentUserId = payload.user_id;
                renderStartGameButton();
            }
            // Update host user ID if provided
            if (payload?.host_user_id) {
                hostUserId = payload.host_user_id;
                renderStartGameButton();
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
        if (startGameButton) {
            startGameButton.addEventListener("click", () => {
                // Send start game action to server
                socket.send(JSON.stringify({ action: "start_game" }));
            });
        }
    }
    catch (_b) {
        statusText.textContent = "WebSocket unavailable";
    }
})();
