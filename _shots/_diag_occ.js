// 诊断：取回4格物品 + 塞满后的占格明细
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

// 角色2 场景重放
run(`const id2=createRole("调查员 · 二"); switchRole(id2);`);
run(`addItem(0,1); addItem(1,1);`);            // 钞票1 + 药草1 = 2格
run(`addSlot(); addSlot();`);                  // bagSlots 12->14
run(`WORLD.warehouse[52]=1; takeFromWarehouse(52,1);`); // 取回防弹背心(4格)
run(`addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1);`);
const diag = run(`JSON.stringify({
  bagSlots: curRole().bagSlots,
  groups: curRole().groups.map(g=>({n:ITEMS[g.itemId].name, qty:g.qty, cells:g.cells})),
  used: statsData().used,
  wh: WORLD.warehouse
})`);
console.log(diag);
