// 核心交互路径验证（初始态 -> 添加物品 -> 堆叠/多格 -> 详情 -> 统计）
const results = {};

// 1) 可堆叠物品：药草(id2) 加两次 -> 应堆叠为 qty=2，占1格
addItem(2, 1);
addItem(2, 1);

// 2) 多格物品：急救包(id26, 2格) 加1个
addItem(26, 1);

// 3) 4格物品：防弹背心(id52) 加1个
addItem(52, 1);

// 收集状态
results.groups = STATE.groups.map(g => ({
  id: g.id,
  name: ITEMS[g.itemId].name,
  qty: g.qty,
  stack: ITEMS[g.itemId].stack,
  cells: g.cells,
  value: g.qty * ITEMS[g.itemId].value
}));
results.stats = statsData();
results.occupiedSorted = [...occupiedSet()].sort((a, b) => a - b);

// 4) 打开第一组的详情弹窗
const firstGroup = STATE.groups[0];
openDetail(firstGroup.id);
results.detailOpen = document.getElementById("detailModal").classList.contains("show");
results.detailTitle = document.querySelector("#detailCard h2")?.textContent;
results.detailStats = Array.from(document.querySelectorAll("#detailCard .m-stat b")).map(b => b.textContent);

// 5) 移除一个，验证堆叠减一
const qtyBefore = firstGroup.qty;
removeOne(firstGroup.id);
const afterRemoval = STATE.groups.find(g => g.id === firstGroup.id);
results.removalQty = afterRemoval ? afterRemoval.qty : 0;
results.removedCompletely = !afterRemoval;

return results;
