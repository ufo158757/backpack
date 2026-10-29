// 验证：弹药 cat=weapon，武器分类筛选包含弹药
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "人物背包系统.html");
const html = fs.readFileSync(htmlPath, "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const code = blocks[blocks.length - 1];

function makeEl() {
  return {
    innerHTML: "", textContent: "", value: "", dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {},
    addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
    focus() {},
  };
}
const store = {};
const documentMock = {
  getElementById: id => (store[id] || (store[id] = makeEl())),
  addEventListener() {}, createElement: () => makeEl(),
};
const context = { document: documentMock, console, setTimeout, clearTimeout };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context);
const run = expr => vm.runInContext(expr, context);

const out = {};
out.ammoCat = run(`ITEMS[73].cat`); // weapon
out.weaponFilter = run(`(()=>{ WORLD.filter="weapon"; return ITEMS.filter(it=>it.cat==="weapon").map(it=>it.name); })()`);
out.ammoInWeapon = run(`ITEMS.some(it=>it.name==="弹药"&&it.cat==="weapon")`);
console.log(JSON.stringify(out, null, 2));
