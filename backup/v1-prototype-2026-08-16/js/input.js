// Keyboard + mouse state. Mouse coords are converted to internal-resolution
// pixels in game.js; worldX/worldY are the mouse position in tile units.
const Input = {
  keys: {},
  pressed: {},          // edge-triggered, cleared once per rendered frame
  mouseX: VIEW_W / 2, mouseY: VIEW_H / 2,
  worldX: 0, worldY: 0,
  mouseDown: false,     // left button held
  rPressed: false,      // right button edge (melee swing)
};

window.addEventListener('keydown', e => {
  Input.keys[e.code] = true;
  if (!e.repeat) Input.pressed[e.code] = true;
  if (['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { Input.keys[e.code] = false; });
window.addEventListener('blur', () => { Input.keys = {}; Input.mouseDown = false; });
window.addEventListener('contextmenu', e => e.preventDefault());
