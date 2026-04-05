// Glitch effect for the 's' in the title
(() => {
  const letter: HTMLElement | null = document.getElementById("glitch-s");
  if (!letter) return;

  const trigger = (): void => {
    letter.classList.add("is-glitching");
    window.setTimeout(() => {
      letter.classList.remove("is-glitching");
      schedule();
    }, 360);
  };

  const schedule = (): void => {
    const delay: number = 2000 + Math.floor(Math.random() * 3001);
    window.setTimeout(trigger, delay);
  };

  schedule();
})();