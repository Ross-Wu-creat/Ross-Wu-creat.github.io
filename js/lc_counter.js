// lc_counter.js - LeanCloud 计数逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否启用 LeanCloud 并配置了必要的 app_id 和 app_key
    if (typeof themeConfig === 'undefined' || !themeConfig.leancloud || !themeConfig.leancloud.enable || !themeConfig.leancloud.app_id || !themeConfig.leancloud.app_key) {
        console.warn('LeanCloud counter is not configured properly.');
        return;
    }

    // 初始化 LeanCloud SDK
    AV.init({
        appId: themeConfig.leancloud.app_id,
        appKey: themeConfig.leancloud.app_key,
        serverURLs: themeConfig.leancloud.server_url || undefined // 国际版可不填
    });

    // 获取当前页面的路径，用于文章统计
    var Counter = AV.Object.extend('Counter');
    var pageUrl = window.location.pathname; // 对于文章页，通常使用路径作为唯一标识
    var isPostPage = document.querySelector('body.post'); // 假设文章页的 body 有 'post' class

    // 1. 更新并显示站点 PV 和 UV (通常在首页或全局需要)
    function updateSiteStats() {
        // 更新站点总PV
        new AV.Query(Counter).equalTo('key', 'site_pv').first().then(function(sitePvCounter) {
            if (sitePvCounter) {
                sitePvCounter.increment('value', 1);
                return sitePvCounter.save();
            } else {
                var newSitePvCounter = new Counter();
                newSitePvCounter.set('key', 'site_pv');
                newSitePvCounter.set('value', 1);
                return newSitePvCounter.save();
            }
        }).then(function(sitePvCounter) {
            document.getElementById('leancloud-site-pv').innerText = sitePvCounter.get('value');
        }).catch(console.error);

        // 更新站点总UV (基于IP，简单实现)
        // 更严谨的UV需借助LeanCloud的云引擎或前端生成UUID存LocalStorage
        function getVisitorId() {
            let vid = localStorage.getItem('visitor_id');
            if (!vid) {
                vid = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('visitor_id', vid);
            }
            return vid;
        }

        function updateUV() {
            var uvKey = 'site_uv_' + getVisitorId();

            // 检查是否已经记录过这个访客
            new AV.Query(Counter).equalTo('key', uvKey).first().then(function(uvCounter) {
                if (!uvCounter) {
                    // 记录访客标识
                    var newUvKeyCounter = new Counter();
                    newUvKeyCounter.set('key', uvKey);
                    newUvKeyCounter.set('value', 1);
                    newUvKeyCounter.save();

                    // 更新总 UV
                    new AV.Query(Counter).equalTo('key', 'site_uv').first().then(function(siteUvCounter) {
                        if (siteUvCounter) {
                            siteUvCounter.increment('value', 1);
                            return siteUvCounter.save();
                        } else {
                            var newSiteUvCounter = new Counter();
                            newSiteUvCounter.set('key', 'site_uv');
                            newSiteUvCounter.set('value', 1);
                            return newSiteUvCounter.save();
                        }
                    }).then(function(siteUvCounter) {
                        document.getElementById('leancloud-site-uv').innerText = siteUvCounter.get('value');
                    });
                }
            }).catch(console.error);
        }

    }

    // 2. 更新并显示文章阅读数 (PV)
    function updatePostViews() {
        if (!isPostPage) return; // 非文章页不执行文章计数

        var postViewsElement = document.getElementById('leancloud-post-views');
        if (!postViewsElement) return;

        var postUrl = postViewsElement.getAttribute('data-url') || pageUrl;

        new AV.Query(Counter).equalTo('key', 'post_' + postUrl).first().then(function(postCounter) {
            if (postCounter) {
                postCounter.increment('value', 1);
                return postCounter.save();
            } else {
                var newPostCounter = new Counter();
                newPostCounter.set('key', 'post_' + postUrl);
                newPostCounter.set('value', 1);
                newPostCounter.set('title', document.title); // 可选：存储文章标题
                return newPostCounter.save();
            }
        }).then(function(postCounter) {
            postViewsElement.innerText = postCounter.get('value');
        }).catch(console.error);
    }

    // 获取访客标识的简单实现 (更推荐使用云引擎或更复杂的方法统计UV)
    function getVisitorId() {
        // 尝试从本地存储获取
        var visitorId = localStorage.getItem('leancloud_visitor_id');
        if (!visitorId) {
            // 简单生成一个标识符，并非真正的唯一用户标识
            visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + new Date().getTime();
            localStorage.setItem('leancloud_visitor_id', visitorId);
        }
        return visitorId;
    }

    // 执行更新
    updateSiteStats();
    updatePostViews();

});