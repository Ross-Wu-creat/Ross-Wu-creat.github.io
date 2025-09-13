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

function saveVisitorLocation() {
  const vid = getVisitorId();
  fetch('https://ipapi.co/json/')
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

function loadStats(field, filterValue) {
  const query = new AV.Query('Visitor');
  if (filterValue) query.equalTo(field, filterValue);
  query.limit(1000);
  return query.find().then(results => {
    const stats = {};
    results.forEach(v => {
      const key = v.get(field) || '未知';
      stats[key] = (stats[key] || 0) + 1;
    });
    return Object.keys(stats).map(name => ({ name, value: stats[name] }));
  });
}

const chart = echarts.init(document.getElementById('visitor-map'));
const backBtn = document.getElementById('back-to-prev');
let currentLevel = 'world';
let historyStack = [];

function drawMap(mapName, mapJson, data) {
  echarts.registerMap(mapName, mapJson);
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}' // b = 国家名，c = 访问量
    },
    visualMap: {
      min: 0,
      max: Math.max(...data.map(d => d.value)),
      text: ['高', '低'],
      realtime: false,
      calculable: true,
      inRange: {
        color: ['#e0ffff', '#006edd']
      }
    },
    series: [{
      name: '访客数',
      type: 'map',
      map: mapName,
      roam: true,
      label: {
        show: false // 关闭默认标签
      },
      data: data
    }]
  });
}


function loadMap(level, name) {
  let path, field, filter;
  if (level === 'world') {
    path = '/visitor-map/maps/world.json';
    field = 'country';
  } else if (level === 'china') {
    path = '/visitor-map/maps/china.json';
    field = 'region';
    filter = 'China';
  } else if (level === 'province') {
    path = `/visitor-map/maps/provinces/${name}.json`;
    field = 'city';
    filter = name;
  }

  fetch(path)
    .then(res => res.json())
    .then(json => {
      loadStats(field, filter).then(data => {
        drawMap(name || level, json, data);
        currentLevel = level;
      });
    });
}

chart.on('click', params => {
  if (currentLevel === 'world' && params.name === 'China') {
    historyStack.push('China');
    loadMap('china');
    backBtn.style.display = 'block';
  } else if (currentLevel === 'china') {
    historyStack.push(params.name);
    loadMap('province', params.name);
  }
});

backBtn.addEventListener('click', () => {
  historyStack.pop();
  if (currentLevel === 'china') {
    loadMap('world');
    backBtn.style.display = 'none';
  } else if (currentLevel === 'province') {
    loadMap('china');
  }
});

saveVisitorLocation();
loadMap('world');