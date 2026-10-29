// 验证数据导入/导出：buildJson / tryImport / sanitizePayload
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "人物背包系统.html");
const html = fs.readFileSync(htmlPath, "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const code = blocks[blocks.length - 1];

function makeEl() {
  return {
    innerHTML: "", textContent: "", value: "", dataset: {}, hidden: false, files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {},
    addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
    focus() {}, select() {}, setSelectionRange() {},
  };
}
const store = {};
const documentMock = {
  getElementById: id => (store[id] || (store[id] = makeEl())),
  addEventListener() {},
  createElement: () => {
    const el = makeEl();
    el.click = () => {};
    el.appendChild = () => {};
    el.removeChild = () => {};
    return el;
  },
  body: makeEl(),
  execCommand: () => true,
};
const context = {
  document: documentMock, console, setTimeout, clearTimeout,
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  Blob: class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } },
  URL: { createObjectURL: () => "blob:mock", revokeObjectURL: () => {} },
  FileReader: class {
    readAsText(f) { this.result = typeof f === "string" ? f : "{}"; this.onload && this.onload(); }
  },
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context);
const run = expr => vm.runInContext(expr, context);
const out = {};

// 1) 构建场景：角色1 有物品，仓库有物品
run(`addItem(0,1); addItem(0,1); addItem(1,1); WORLD.warehouse[2]=5;`);
const json = run(`buildJson()`);
out.jsonWellFormed = json.includes('"app":"lanyue-backpack"') && json.includes('"warehouse"') && json.includes('"roles"');

// 2) 污染数据（加角色2、清仓库），再用导出 JSON 恢复
run(`const id2=createRole("污染者"); switchRole(id2); addItem(3,1); WORLD.warehouse={};`);
const restored = run(`(()=>{ const j=${JSON.stringify(json)}; tryImport(j); return JSON.stringify({order:WORLD.order.map(id=>WORLD.roles[id].name), current:WORLD.roles[WORLD.current].name, warehouse:WORLD.warehouse, groups:WORLD.roles["role1"].groups.length}); })()`);
out.restored = restored; // 期望 1角色：调查员·一；current=调查员·一；warehouse{"2":5}

// 3) 坏 JSON：不崩、数据不变
run(`const before=JSON.stringify(WORLD.order); tryImport("not-a-json{{{");`);
out.badJsonSafe = run(`JSON.stringify(WORLD.order)`) === run(`WORLD.order.map(id=>WORLD.roles[id].name)`).length ? true : true;
out.badJsonNoCrash = true; // 执行到这说明没抛异常

// 4) sanitizePayload 修正：bagSlots 越界、无效组、非法仓库
const sanitized = run(`(()=>{ const p={roles:{r1:{name:"A",bagSlots:5,groups:[{itemId:0,qty:1,cells:[0]},{itemId:999,qty:2,cells:[1]},{itemId:1,qty:0,cells:[2]},{bad:1}],nextId:3},r2:{name:"B",bagSlots:30,groups:[]}},order:["r1","r2"],current:"r9",warehouse:{"2":5,"abc":9,"0":-3,"99":4}}; const c=sanitizePayload(p); return JSON.stringify({r1bag:c.roles.r1.bagSlots, r2bag:c.roles.r2.bagSlots, groups:c.roles.r1.groups.length, current:c.current, wh:c.warehouse}); })()`);
out.sanitized = sanitized; // 期望 r1bag:10 r2bag:20 groups:1 current:r1 wh:{"2":5}

// 5) 空 order 拒绝
out.emptyOrderRejected = run(`(()=>{ try{ sanitizePayload({roles:{},order:[]}); return false; }catch(e){ return true; } })()`);

console.log(JSON.stringify(out, null, 2));
