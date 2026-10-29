// 验证两处修复：data-id 下标正确性 + 背包格扩容 + 物品可加入
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

const out = {};

// A) data-id 下标正确性
vm.runInContext(`renderLibrary()`, context);
const libHtml = store["libList"].innerHTML;
const dataIds = [...libHtml.matchAll(/data-id="(\d+)"/g)].map(m => +m[1]);
out.itemCount = dataIds.length;
out.firstSix = dataIds.slice(0, 6);
out.allNumeric = dataIds.every(Number.isInteger);
out.hasUndefined = /data-id="undefined"/.test(libHtml);

// B) 用 data-id 0（钞票）加入背包
vm.runInContext(`addItem(${dataIds[0]},1); addItem(${dataIds[0]},1);`, context);
out.added = vm.runInContext(
  `JSON.stringify(STATE.groups.map(g=>({name:ITEMS[g.itemId].name,qty:g.qty,cells:g.cells})))`, context
);

// C) 扩容：加 3 格
vm.runInContext(`addSlot(); addSlot(); addSlot();`, context);
out.slotsAfter = vm.runInContext(`BAG_SLOTS`, context);
vm.runInContext(`renderBackpack()`, context);
const bagHtml = store["bagGrid"].innerHTML;
out.bagCellCount = (bagHtml.match(/class="cell/g) || []).length;

// D) 扩容后仍能放新物品（用唯一物品 id，跳过 add 按钮的重复 id）
vm.runInContext(`addItem(${dataIds[2]},1);`, context);
out.afterExpand = vm.runInContext(
  `JSON.stringify({used: statsData().used, groups: STATE.groups.map(g=>[ITEMS[g.itemId].name,g.cells])})`, context
);

console.log(JSON.stringify(out, null, 2));
