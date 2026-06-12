// 引入localforage
<script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>

<script>
// 初始化IndexedDB
localforage.config({
  name: 'baijingConsulting',
  storeName: 'consultantData',
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE] // 自动降级
});

// 加载咨询师数据（优化版）
async function loadAndRenderConsultantData() {
  try {
    // 优先从服务器获取
    let consultantData = await getConsultantFromServer(1);
    
    // 如果服务器数据为空，从IndexedDB获取
    if (!Object.keys(consultantData).length) {
      consultantData = await localforage.getItem('mainConsultant') || {};
    }
    
    // 合并默认数据
    const defaultData = {
      name: '张XX',
      title: '高级管理咨询师 | 战略落地专家',
      introduction: '15年企业管理咨询经验...',
      avatar: 'https://picsum.photos/200/200?random=1',
      cases: [{
        id: 1,
        name: '某制造企业战略重构项目',
        industry: '制造业',
        description: '通过重新定位核心业务...'
      }]
    };
    
    const data = { ...defaultData, ...consultantData };
    renderConsultantCard(data);
    
  } catch (e) {
    console.error('加载数据失败：', e);
    // 最终降级到默认数据
    const defaultData = { /* 默认数据 */ };
    renderConsultantCard(defaultData);
  }
}

// 保存咨询师数据（同步到服务器和本地）
async function saveConsultantData(data) {
  try {
    // 同步到服务器
    const serverSaved = await saveConsultantToServer(data);
    if (serverSaved) {
      // 服务器保存成功，更新本地缓存
      await localforage.setItem('mainConsultant', data);
    }
  } catch (err) {
    // 网络异常，仅保存到本地
    await localforage.setItem('mainConsultant', data);
    console.warn('数据已保存到本地，网络恢复后会自动同步');
  }
}
</script>
