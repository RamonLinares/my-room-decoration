import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const app = document.querySelector<HTMLElement>('#app');
const welcome = document.querySelector<HTMLElement>('#welcome');
const begin = document.querySelector<HTMLButtonElement>('#begin');
const beginStory = document.querySelector<HTMLButtonElement>('#begin-story');

if (!canvas || !app || !welcome || !begin || !beginStory) {
  throw new Error('Missing required room editor markup.');
}

let game: import('./game/Game').Game | undefined;
let loading = false;
let storyRequested = false;

const setWelcomeModal = (active: boolean) => {
  for (const child of [...app.children]) {
    if (child === welcome) continue;
    child.toggleAttribute('inert', active);
    if (active) child.setAttribute('aria-hidden', 'true');
    else child.removeAttribute('aria-hidden');
  }
};

const openRoom = async () => {
  if (loading || game) return;
  loading = true;
  begin.disabled = true;
  begin.textContent = 'Opening your room…';
  welcome.setAttribute('aria-busy', 'true');
  try {
    const { Game } = await import('./game/Game');
    setWelcomeModal(false);
    game = new Game(canvas);
    await game.initialize();
    game.start();
    begin.disabled = false;
    begin.textContent = 'Open the door';
    welcome.removeAttribute('aria-busy');
    begin.click();
    if (storyRequested) {
      document.querySelector<HTMLButtonElement>('#open-stories')?.click();
      document.querySelector<HTMLButtonElement>('[data-story-id="cozy-reading-corner"]')?.click();
    }
  } catch (error) {
    console.error('Could not open the room editor.', error);
    begin.disabled = false;
    begin.textContent = 'Try opening again';
    welcome.removeAttribute('aria-busy');
    begin.addEventListener('click', openRoom, { once: true });
    document.querySelector<HTMLElement>('#editor-status')!.textContent =
      'The room could not open. Please try again.';
  } finally {
    loading = false;
  }
};

setWelcomeModal(true);
begin.focus({ preventScroll: true });
begin.addEventListener('click', openRoom, { once: true });
beginStory.addEventListener('click', () => {
  storyRequested = true;
  void openRoom();
}, { once: true });
welcome.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const target = event.target === begin ? beginStory : begin;
  if ((event.shiftKey && event.target === begin) || (!event.shiftKey && event.target === beginStory)) {
    event.preventDefault();
    target.focus({ preventScroll: true });
  }
});

// Release WebGL, audio, observers, and persistence handles when the page leaves.
// This matters on mobile tab churn and keeps repeated sessions from competing
// for a small device's graphics-context budget.
window.addEventListener('pagehide', () => game?.dispose(), { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose();
  });
}
