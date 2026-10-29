// 验证多角色背包：独立格子/独立物品/切换互不干扰
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

// 初始：1 个角色
out.initialRoles = run(`WORLD.order.length`);            // 期望 1
out.initialCurrent = run(`WORLD.roles[WORLD.current].name`); // 调查员 · 一
out.initialBag = run(`WORLD.roles[WORLD.current].bagSlots`); // 12

// 角色1 放物品
run(`addItem(0,1); addItem(0,1); addItem(26,1);`);       // 钞票x2 堆叠 + 撬棍2格
out.role1AfterAdd = run(`JSON.stringify(WORLD.roles[WORLD.current].groups.map(g=>[ITEMS[g.itemId].name,g.qty,g.cells]))`);
out.role1Bag = run(`WORLD.roles[WORLD.current].bagSlots`);

// 新增角色2 并切换
run(`const id2=createRole("调查员 · 二"); switchRole(id2);`);
out.role2Bag = run(`WORLD.roles[WORLD.current].bagSlots`);
out.role2Groups = run(`WORLD.roles[WORLD.current].groups.length`); // 期望 0（空）
out.role2Occupied = run(`statsData().used`);              // 期望 0

// 角色2 加 1 格（应只影响自己）
run(`addSlot();`);
out.role2BagAfter = run(`WORLD.roles[WORLD.current].bagSlots`); // 13
out.role1BagUnaffected = run(`WORLD.roles["role1"].bagSlots`);  // 期望 12

// 角色2 放一个物品
run(`addItem(1,1);`);
out.role2GroupsNow = run(`WORLD.roles[WORLD.current].groups.length`); // 1

// 切回角色1：物品仍应保留
run(`switchRole("role1");`);
out.backToRole1 = run(`JSON.stringify(WORLD.roles[WORLD.current].groups.map(g=>[ITEMS[g.itemId].name,g.qty,g.cells]))`);
out.role1BagFinal = run(`WORLD.roles[WORLD.current].bagSlots`); // 12

// 角色栏渲染：应包含两个角色
run(`renderRoleTabs();`);
const tabsHtml = store["roleTabs"].innerHTML;
out.tabCount = (tabsHtml.match(/class="role-tab/g) || []).length; // 2
out.tabsContainNames = tabsHtml.includes("调查员 · 一") && tabsHtml.includes("调查员 · 二");

console.log(JSON.stringify(out, null, 2));
