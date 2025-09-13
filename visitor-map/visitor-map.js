// LeanCloud 初始化
AV.init({
    appId: themeConfig.leancloud.app_id,
    appKey: themeConfig.leancloud.app_key,
    serverURLs: themeConfig.leancloud.server_url || undefined // 国际版可不填
});

function getVisitorId() {
  let vid = localStorage.getItem('visitor_id');
  if (!vid) {
    vid = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('visitor_id', vid);
  }
  return vid;
}

// 保存访客位置
function saveVisitorLocation() {
  const vid = getVisitorId();
  fetch('https://ipapi.co/json/') // 可换成国内 API
    .then(res => res.json())
    .then(data => {
      const Visitor = AV.Object.extend('Visitor');
      const visitor = new Visitor();
      visitor.set('vid', vid);
      visitor.set('country', data.country_name);
      visitor.set('region', data.region);
      visitor.set('city', data.city);
      visitor.save();
    });
}

// 获取统计数据
function loadVisitorStats() {
  const query = new AV.Query('Visitor');
  query.limit(1000);
  return query.find().then(results => {
    const stats = {};
    results.forEach(v => {
      const country = v.get('country') || 'Unknown';
      stats[country] = (stats[country] || 0) + 1;
    });
    return Object.keys(stats).map(name => ({ name, value: stats[name] }));
  });
}

// 绘制地图
function drawMap(data) {
  const chart = echarts.init(document.getElementById('visitor-map'));
  const option = {
    tooltip: { trigger: 'item' },
    visualMap: {
      min: 0,
      max: Math.max(...data.map(d => d.value)),
      text: ['高', '低'],
      realtime: false,
      calculable: true,
      inRange: { color: ['#e0ffff', '#006edd'] }
    },
    series: [{
      name: '访客数',
      type: 'map',
      map: 'world',
      roam: true,
      data: data
    }]
  };
  chart.setOption(option);
}

// 执行
saveVisitorLocation();
loadVisitorStats().then(drawMap);
