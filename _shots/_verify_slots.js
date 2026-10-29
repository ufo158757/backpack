// 验证背包格加减：上限20、下限10、末格占用时禁止减格
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

// 1) 从 12 加到 20（8次成功，第9次应停在20）
for (let i = 0; i < 9; i++) run(`addSlot()`);
out.afterAddTo20 = run(`BAG_SLOTS`); // 期望 20

// 2) 从 20 减到 10（10次成功，第11次应停在10）
for (let i = 0; i < 11; i++) run(`removeSlot()`);
out.afterRemoveTo10 = run(`BAG_SLOTS`); // 期望 10

// 3) 重置到 15，构造末格被占用的情形，减格应被拒绝
run(`BAG_SLOTS=15; STATE.groups=[{id:99,itemId:0,qty:1,cells:[14]}];`);
run(`removeSlot()`);
out.removalBlockedByOccupied = run(`BAG_SLOTS`); // 期望仍 15
// 清空后再减应成功
run(`STATE.groups=[]; removeSlot();`);
out.removalAfterClear = run(`BAG_SLOTS`); // 期望 14

console.log(JSON.stringify(out, null, 2));
