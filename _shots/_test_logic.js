// 隔离验证 HTML 内真实脚本的背包核心逻辑（堆叠/多格连续格/空间不足/移除）
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const htmlPath = path.join(__dirname, "人物背包系统.html");
const html = fs.readFileSync(htmlPath, "utf8");

// 取最后一个 <script> 块（业务逻辑）
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const code = blocks[blocks.length - 1];

// 最小 DOM mock，足以支撑脚本顶层渲染调用
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
  addEventListener() {},
  createElement: () => makeEl(),
};
const context = {
  document: documentMock, console, setTimeout, clearTimeout,
};
context.globalThis = context;
vm.createContext(context);

// 1) 载入页面真实脚本（定义 ITEMS / STATE / addItem / removeOne 等）
vm.runInContext(code, context);

// 2) 驱动核心路径，返回真实 STATE 结果
const verify = `
addItem(2,1); addItem(2,1);            // 药草：两次，应堆叠为 qty=2, 占1格
addItem(26,1);                          // 急救包：2格物品
addItem(52,1);                          // 防弹背心：4格物品
JSON.stringify({
  groups: STATE.groups.map(g=>({
    name: ITEMS[g.itemId].name,
    qty: g.qty, stack: ITEMS[g.itemId].stack,
    cells: g.cells, val: g.qty*ITEMS[g.itemId].value
  })),
  stats: statsData(),
  occupied: [...occupiedSet()].sort((a,b)=>a-b)
});
`;
console.log("== 放置/堆叠后 ==");
console.log(vm.runInContext(verify, context));

// 3) 空间不足场景：塞满背包
const fill = `
let added=0, full=false;
for(let k=0;k<12;k++){ if(addItem(84,1)) added++; else { full=true; break; } }
JSON.stringify({added, full, used: statsData().used});
`;
console.log("== 逐步塞满至不足 ==");
console.log(vm.runInContext(fill, context));

// 4) 移除：移除一组中的 1 个 / 清空整组
const removal = `
const g0=STATE.groups[0];
const before=JSON.stringify(STATE.groups.map(g=>[ITEMS[g.itemId].name,g.qty,g.cells]));
removeOne(g0.id);
removeAll(STATE.groups[0].id);
JSON.stringify({before, after: STATE.groups.map(g=>[ITEMS[g.itemId].name,g.qty,g.cells]), stats: statsData()});
`;
console.log("== 移除后 ==");
console.log(vm.runInContext(removal, context));
