import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const app = document.querySelector<HTMLElement>('#app');
const welcome = document.querySelector<HTMLElement>('#welcome');
const begin = document.querySelector<HTMLButtonElement>('#begin');

if (!canvas || !app || !welcome || !begin) {
  throw new Error('Missing required room editor markup.');
}

let game: import('./game/Game').Game | undefined;
let loading = false;

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
    game.start();
    begin.disabled = false;
    begin.textContent = 'Open the door';
    welcome.removeAttribute('aria-busy');
    begin.click();
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
welcome.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  begin.focus({ preventScroll: true });
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose();
  });
}
