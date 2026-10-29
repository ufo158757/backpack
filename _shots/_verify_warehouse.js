// 验证共享仓库：存入/全部存入/跨角色共享/取回/空间不足保护
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

// 0) 初始：仓库空
out.whInitial = run(`JSON.stringify(WORLD.warehouse)`); // {}

// 1) 角色1 放 钞票x2、药草x1，单组存入仓库
run(`addItem(0,1); addItem(0,1); addItem(1,1);`);       // 钞票2 + 药草1
const g1 = run(`WORLD.roles[WORLD.current].groups[0].id`); // 钞票组
run(`storeToWarehouse(${g1});`);
out.afterStoreOne = run(`JSON.stringify({wh:WORLD.warehouse, groups:WORLD.roles[WORLD.current].groups.map(g=>[ITEMS[g.itemId].name,g.qty])})`);
// 期望 wh:{"0":2}, 背包剩 药草1

// 2) 全部存入（药草）
run(`storeAllToWarehouse();`);
out.afterStoreAll = run(`JSON.stringify({wh:WORLD.warehouse, groups:WORLD.roles[WORLD.current].groups.length})`);
// 期望 wh:{"0":2,"1":1}, 背包空

// 3) 切到角色2，仓库数据共享不变
run(`const id2=createRole("调查员 · 二"); switchRole(id2);`);
out.sharedWh = run(`JSON.stringify(WORLD.warehouse)`); // {"0":2,"1":1}

// 4) 角色2 从仓库取回 钞票1 + 药草1
run(`takeFromWarehouse(0,1); takeFromWarehouse(1,1);`);
out.afterTake = run(`JSON.stringify({wh:WORLD.warehouse, role2:WORLD.roles[WORLD.current].groups.map(g=>[ITEMS[g.itemId].name,g.qty])})`);
// 期望 wh:{"0":1}, 角色2 有 钞票1、药草1

// 5) 空间不足保护：角色2 背包只剩3格（钞票1+药草1占2格），试取回 4格物品 防弹背心
run(`addSlot(); addSlot();`); // 加到14格不影响测试，直接构造满：简化用仓库放防弹背心
run(`WORLD.warehouse[52]=1;`);
const before52 = run(`WORLD.warehouse[52]`);
run(`takeFromWarehouse(52,1);`);
out.spaceGuard = run(`JSON.stringify({wh52:WORLD.warehouse[52]||0, unchanged: WORLD.warehouse[52]===1})`);
// 防弹背心4格，角色2背包现有钞票(1格)+药草(1格)=2格，12-2=10格空间，4格放得下……需要占满才行

// 5b) 真正占满：把角色2背包塞到只剩3格以下，再取4格物品应失败
run(`addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1); addItem(3,1);`);
// 食物1格x8 → 2+8=10格占用，剩2格，防弹背心4格放不下
const wh52before = run(`WORLD.warehouse[52]`);
run(`takeFromWarehouse(52,1);`);
out.spaceGuard2 = run(`JSON.stringify({wh52:WORLD.warehouse[52], kept:WORLD.warehouse[52]===${wh52before}, used:statsData().used})`);
// 期望 wh52 不变（取回失败），used=10

// 6) 仓库视图渲染
run(`WORLD.view="wh"; renderWarehouse();`);
const whHtml = store["whList"].innerHTML;
out.whRendered = whHtml.includes("class=\"wh-item\"") && whHtml.includes("取 1") && whHtml.includes("全取");
out.whLabel = store["whSlotLabel"].textContent;

console.log(JSON.stringify(out, null, 2));
