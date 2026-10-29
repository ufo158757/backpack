// 验证仓库取回不突破堆叠上限：拆组 / 部分放入 / 空间不足
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

// 1) 仓库 100 张钞票（stack=60），空背包全取 -> 拆 60+40，均不超上限
run(`WORLD.warehouse[0]=100; takeFromWarehouse(0,100);`);
out.splitFull = run(`JSON.stringify({groups:curRole().groups.map(g=>({n:ITEMS[g.itemId].name,q:g.qty,st:ITEMS[g.itemId].stack})), wh:WORLD.warehouse[0]||0})`);
// 期望 2 组 60/40，仓库 0

// 2) 已有组 59，再取 100 -> 59+1=60，新组 60，新组 39
run(`WORLD.roles[WORLD.current].groups=[]; WORLD.roles[WORLD.current].nextId=1; addItem(0,59); WORLD.warehouse[0]=100; takeFromWarehouse(0,100);`);
out.stackToExisting = run(`JSON.stringify(curRole().groups.map(g=>g.qty).sort((a,b)=>b-a))`);
// 期望 [60,60,39]

// 3) 空间不足部分成功：背包仅剩 1 格，仓库 100 -> 放入 60，仓库留 40
run(`WORLD.roles[WORLD.current].groups=[]; WORLD.roles[WORLD.current].nextId=1; WORLD.warehouse={};`);
run(`for(let i=0;i<11;i++) addItem(3,1);`);      // 11 个食物占 11 格
run(`WORLD.warehouse[0]=100; takeFromWarehouse(0,100);`);
out.partial = run(`JSON.stringify({used:statsData().used, ammoGroups:curRole().groups.filter(g=>g.itemId===0).map(g=>g.qty), whLeft:WORLD.warehouse[0]||0})`);
// 期望 占12格、钞票组[60]、仓库 40

// 4) 物品库路径：addItem(id,1) 返回 1
run(`WORLD.roles[WORLD.current].groups=[]; WORLD.roles[WORLD.current].nextId=1;`);
out.libAdd = run(`addItem(0,1)`); // 1

console.log(JSON.stringify(out, null, 2));
