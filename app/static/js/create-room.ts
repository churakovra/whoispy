// Handle room access toggle and password field visibility
(() => {
  const closedToggle: HTMLInputElement | null = document.getElementById("room-closed-toggle") as HTMLInputElement | null;
  const passwordField: HTMLElement | null = document.getElementById("password-field");
  const passwordInput: HTMLInputElement | null = passwordField?.querySelector("input[name='room_password']") as HTMLInputElement | null;
  const roomAccessInput: HTMLInputElement | null = document.getElementById("room-access") as HTMLInputElement | null;
  const accessHint: HTMLElement | null = document.getElementById("room-access-hint");

  // Update UI based on toggle state
  const setAccess = (): void => {
    const isClosed: boolean = closedToggle?.checked === true;
    if (passwordField) {
      passwordField.hidden = !isClosed;
      passwordField.style.display = isClosed ? "" : "none";
    }
    if (passwordInput) {
      passwordInput.required = isClosed;
      if (!isClosed) passwordInput.value = "";
    }
    if (roomAccessInput) {
      roomAccessInput.value = isClosed ? "closed" : "open";
    }
    if (accessHint) {
      accessHint.textContent = isClosed ? "Closed room" : "Open room";
    }
  };

  // Normalize integer inputs to enforce min/max values
  const normalizeInt = (input: HTMLInputElement): void => {
    const digits: string = String(input.value).replace(/[^\d]/g, "");
    if (!digits) {
      input.value = "";
      return;
    }
    const min: number = Number(input.min || "1");
    const max: number = Number(input.max || "999999");
    const parsed: number = Number.parseInt(digits, 10);
    const clamped: number = Math.min(Math.max(parsed, min), max);
    input.value = String(clamped);
  };

  // Initialize toggle event listener
  if (closedToggle) {
    closedToggle.addEventListener("change", setAccess);
    setAccess(); // Set initial state
  }

  // Handle number input validation
  const integerInputs: NodeListOf<HTMLInputElement> = document.querySelectorAll("input[type='number']");
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