// 验证角色输入弹窗：无 window.prompt 依赖，新建/重命名/空名保护
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

// 0) 源码不再依赖 window.prompt
out.noPromptInCode = !/window\.prompt/.test(code);

// 1) 新建角色：打开弹窗 -> 输入 -> 确定
run(`openRoleModal(null)`);
out.modalOpenedAdd = run(`document.getElementById("roleModal").classList.contains("show")`);
store["roleInput"].value = "调查员 · 阿武";
run(`submitRole()`);
out.addedRole = run(`WORLD.roles["role2"] && WORLD.roles["role2"].name`);
out.currentIsNew = run(`WORLD.roles[WORLD.current].name`); // 阿武
out.modalClosedAfterAdd = run(`!document.getElementById("roleModal").classList.contains("show")`);

// 2) 重命名：打开弹窗（应预填当前名）-> 改 -> 确定
run(`openRoleModal("role1")`);
out.renamePrefill = store["roleInput"].value; // 调查员 · 一
store["roleInput"].value = "星溯";
run(`submitRole()`);
out.renamed = run(`WORLD.roles["role1"].name`); // 星溯

// 3) 空名保护：不应创建新角色
const beforeCount = run(`WORLD.order.length`);
run(`openRoleModal(null)`);
store["roleInput"].value = "   ";
run(`submitRole()`);
out.emptyRejected = run(`WORLD.order.length`) === beforeCount; // true

// 4) Enter 键绑定存在（代码审查标记）
out.hasEnterSubmit = /roleInput"\)\.addEventListener\("keydown/.test(code);

console.log(JSON.stringify(out, null, 2));
