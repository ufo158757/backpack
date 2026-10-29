// 验证角色名称自定义：renameRole + 角色栏渲染含重命名按钮
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

// 1) 用自定义名称新增角色
run(`createRole("阿武"); createRole("江月沧");`);
out.order = run(`WORLD.order.map(id=>WORLD.roles[id].name)`);

// 2) 重命名现有角色
run(`renameRole("role1","星溯");`);
out.renamed = run(`WORLD.roles["role1"].name`); // 星溯

// 3) 重命名空白名不应清空
run(`renameRole("role2","   ");`);
out.blankKept = run(`WORLD.roles["role2"].name`); // 阿武

// 4) 角色栏渲染：每个角色含重命名按钮 + 自定义名
run(`switchRole("role1"); renderRoleTabs();`);
const tabsHtml = store["roleTabs"].innerHTML;
out.renameBtnCount = (tabsHtml.match(/class="rt-rename"/g) || []).length; // 3
out.namesShown = ["星溯","阿武","江月沧"].every(n => tabsHtml.includes(n));
out.tabTagIsDiv = /<div class="role-tab/.test(tabsHtml);

console.log(JSON.stringify(out, null, 2));
