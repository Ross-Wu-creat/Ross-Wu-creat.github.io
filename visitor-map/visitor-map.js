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

class MapNavigator {
  constructor(chart, backBtn) {
    this.chart = chart;
    this.backBtn = backBtn;
    this.history = ['world'];
    this.levels = {
      world: { path: '/visitor-map/maps/world.json', field: 'country' },
      china: { path: '/visitor-map/maps/china.json', field: 'region', filter: 'China' },
      province: name => ({
        path: `/visitor-map/maps/provinces/${name}.json`,
        field: 'city',
        filter: name
      })
    };
    this.initEvents();
  }

  initEvents() {
    this.chart.on('click', params => this.handleClick(params.name));
    this.backBtn.addEventListener('click', () => this.goBack());
  }

  handleClick(name) {
    const current = this.getCurrentLevel();

    if (current === 'world' && name === 'China') {
      this.history.push('china');
      this.loadMap('china');
      this.backBtn.style.display = 'block';
    } else if (current === 'china') {
      this.history.push(name);
      this.loadMap('province', name);
    }
  }

  goBack() {
    this.history.pop();
    const previous = this.getCurrentLevel();

    if (previous === 'world') {
      this.loadMap('world');
      this.backBtn.style.display = 'none';
    } else if (previous === 'china') {
      this.loadMap('china');
    } else {
      this.loadMap('province', previous);
    }
  }

  getCurrentLevel() {
    return this.history[this.history.length - 1];
  }

  loadMap(level, name) {
    const config = typeof this.levels[level] === 'function'
      ? this.levels[level](name)
      : this.levels[level];

    fetch(config.path)
      .then(res => res.json())
      .then(json => {
        loadStats(config.field, config.filter).then(data => {
          this.drawMap(name || level, json, data);
        });
      });
  }

  drawMap(mapName, mapJson, data) {
    echarts.registerMap(mapName, mapJson);
    this.chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: params => `${params.name}: ${params.value || 0}`
      },
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
        map: mapName,
        roam: true,
        label: { show: false },
        data: data
      }]
    });
  }
}


saveVisitorLocation();

const chart = echarts.init(document.getElementById('visitor-map'));
const backBtn = document.getElementById('back-to-prev');
const navigator = new MapNavigator(chart, backBtn);

navigator.loadMap('world');
