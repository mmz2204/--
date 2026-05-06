
    let tools = [];
    let categories = [];
    // 滚动导航标志，默认启用
    window.scrollNavDisabled = false;
    
    // 从静态JSON加载分类和工具数据
    async function loadDataFromAPI() {
        try {
            const response = await fetch('/data.json');
            const data = await response.json();
            
            categories = data.categories || [];
            
            // 转换工具数据格式以兼容现有代码
            tools = (data.tools || []).map(t => ({
                id: t.id,
                icon: t.icon || '🔧',
                name: t.name,
                desc: t.description || '',
                description: t.description || '',
                detailed_description: t.detailed_description || '',
                cat: t.category_id ? 'cat_' + t.category_id : 'other',
                category_id: t.category_id,
                hot: t.is_hot || false,
                foreign: t.is_foreign || false,
                uses: t.usage_count || 0,
                url: t.url || '#',
                type: t.type || t.tool_type || 1
            }));
            
            // 保存火热工具列表，后续渲染使用
            window.hotTools = (data.hotTools || []).map(t => ({
                id: t.id,
                icon: t.icon || '🔧',
                name: t.name,
                desc: t.description || '',
                description: t.description || '',
                detailed_description: t.detailed_description || '',
                cat: t.category_id ? 'cat_' + t.category_id : 'other',
                hot: t.is_hot || true,
                foreign: t.is_foreign || false,
                uses: t.usage_count || 0,
                url: t.url || '#',
                type: t.type || t.tool_type || 1
            }));
            
            renderAll();
            await loadFavorites();
            
            // 处理URL锚点，跳转到对应分类位置
            handleHashNavigation();
        } catch (error) {
            console.error('加载数据失败:', error);
            // 如果加载失败，尝试从API加载
            try {
                const [categoriesRes, toolsRes, hotToolsRes] = await Promise.all([
                    fetch('/api/categories'),
                    fetch('/api/tools'),
                    fetch('/api/tools/hot')
                ]);
                const categoriesData = await categoriesRes.json();
                const toolsData = await toolsRes.json();
                const hotToolsData = await hotToolsRes.json();
                
                categories = categoriesData.data || categoriesData || [];
                
                tools = (toolsData.data || toolsData || []).map(t => ({
                    id: t.id,
                    icon: t.icon || '🔧',
                    name: t.name,
                    desc: t.description || '',
                    description: t.description || '',
                    detailed_description: t.detailed_description || '',
                    cat: t.category_id ? 'cat_' + t.category_id : 'other',
                    hot: t.is_hot || false,
                    foreign: t.is_foreign || false,
                    uses: t.usage_count || 0,
                    url: t.url || '#',
                    type: t.type || t.tool_type || 1
                }));
                
                window.hotTools = (hotToolsData.data || hotToolsData || []).map(t => ({
                    id: t.id,
                    icon: t.icon || '🔧',
                    name: t.name,
                    desc: t.description || '',
                    description: t.description || '',
                    detailed_description: t.detailed_description || '',
                    cat: t.category_id ? 'cat_' + t.category_id : 'other',
                    hot: t.is_hot || true,
                    foreign: t.is_foreign || false,
                    uses: t.usage_count || 0,
                    url: t.url || '#',
                    type: t.type || t.tool_type || 1
                }));
                
                renderAll();
                await loadFavorites();
            } catch (error) {
                console.error('API加载也失败:', error);
            }
        }
    }

    let favorites = new Set(JSON.parse(localStorage.getItem('fav')||'[]'));
    function saveFav(){ localStorage.setItem('fav', JSON.stringify([...favorites])); }
    
    // 处理URL锚点导航
    function handleHashNavigation() {
        const hash = window.location.hash;
        if (hash.startsWith('#cat-section_')) {
            const categoryId = hash.replace('#cat-section_', '');
            if (categoryId && categoryId > 0) {
                // 立即尝试滚动到对应位置
                const tryScroll = () => {
                    const categorySection = document.getElementById('cat-section_' + categoryId);
                    if (categorySection) {
                        // 激活对应的导航项
                        const targetNav = document.querySelector('.nav-item[data-category-id="' + categoryId + '"]');
                        if (targetNav) {
                            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                            targetNav.classList.add('active');
                        }
                        // 立即滚动到对应分类区域
                        categorySection.scrollIntoView({ behavior: 'auto', block: 'center' });
                    } else {
                        // 如果元素还没加载，延迟重试
                        setTimeout(tryScroll, 100);
                    }
                };
                tryScroll();
            }
        }
    }

    // ── 最近浏览记录（最多10条）──
    let recentIds = JSON.parse(localStorage.getItem('recent')||'[]');
    
    // 复制域名到剪贴板
    function copyDomain() {
        const domain = 'tools.jianbox.cn';
        navigator.clipboard.writeText(domain).then(() => {
            const originalText = document.querySelector('.brand-sub').textContent;
            document.querySelector('.brand-sub').textContent = '✓ 已复制';
            setTimeout(() => {
                document.querySelector('.brand-sub').textContent = domain;
            }, 1500);
        }).catch(() => {
            alert('复制失败，请手动复制: ' + domain);
        });
    }
    
    // 获取或生成会话key（用于未登录用户）
    function getSessionKey() {
        let key = localStorage.getItem('session_key');
        if (!key) {
            key = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('session_key', key);
        }
        return key;
    }

    // 记录浏览历史
    async function recordRecent(id){
        const t = tools.find(x=>x.id===id);
        if(!t) return;

        // 更新本地缓存
        recentIds = [id, ...recentIds.filter(x=>x!==id)].slice(0,10);
        localStorage.setItem('recent', JSON.stringify(recentIds));
        renderRecentBar();

        // 根据登录状态选择存储方式
        const isLoggedIn = !!localStorage.getItem('admin_token');
        
        if(isLoggedIn){
            // 已登录：保存到数据库
            try {
                await fetch('/api/history', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
                    },
                    body: JSON.stringify({
                        tool_id: id,
                        tool_name: t.name,
                        tool_icon: t.icon
                    })
                });
            } catch(error) {
                console.error('保存浏览历史到数据库失败:', error);
            }
        } else {
            // 未登录：保存到localStorage缓存
            const history = JSON.parse(localStorage.getItem('local_history')||'[]');
            const newHistory = [{
                id: Date.now(),
                tool_id: id,
                tool_name: t.name,
                tool_icon: t.icon,
                created_at: new Date().toISOString()
            }, ...history.filter(h=>h.tool_id!==id)].slice(0,10);
            localStorage.setItem('local_history', JSON.stringify(newHistory));
        }
    }

    // 获取浏览历史
    async function loadHistory(){
        const isLoggedIn = !!localStorage.getItem('admin_token');
        
        if(isLoggedIn){
            // 已登录：从数据库获取
            try {
                const response = await fetch('/api/history', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
                    }
                });
                const result = await response.json();
                if(result.data && result.data.length > 0){
                    recentIds = result.data.map(h => h.ToolID);
                    localStorage.setItem('recent', JSON.stringify(recentIds));
                }
            } catch(error) {
                console.error('获取浏览历史失败:', error);
            }
        } else {
            // 未登录：从localStorage获取
            const history = JSON.parse(localStorage.getItem('local_history')||'[]');
            recentIds = history.map(h => h.tool_id);
            localStorage.setItem('recent', JSON.stringify(recentIds));
        }
        renderRecentBar();
    }

    async function loadFavorites(){
        const isLoggedIn = !!localStorage.getItem('admin_token');
        
        if(isLoggedIn){
            // 已登录：从数据库获取收藏
            try {
                const response = await fetch('/api/admin/favorites', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
                    }
                });
                const result = await response.json();
                if(result.data && result.data.length > 0){
                    // 只保留存在的工具ID
                    favorites = new Set();
                    result.data.forEach(f => {
                        if(f.tool && f.tool.id) {
                            favorites.add(f.tool.id);
                        }
                    });
                    saveFav();
                }
            } catch(error) {
                console.error('获取收藏列表失败:', error);
            }
        }
        // 清理无效收藏
        cleanupInvalidFavorites();
        updateBadge();
    }

    // 清空浏览历史
    async function clearHistory(){
        const isLoggedIn = !!localStorage.getItem('admin_token');
        
        if(isLoggedIn){
            // 已登录：清空数据库
            try {
                await fetch('/api/history', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
                    }
                });
            } catch(error) {
                console.error('清空浏览历史失败:', error);
            }
        } else {
            // 未登录：清空localStorage
            localStorage.removeItem('local_history');
        }
        
        recentIds = [];
        localStorage.setItem('recent', '[]');
        renderRecentBar();
    }

    function renderRecentBar(){
        const bar = document.getElementById('recentBar');
        // 清除旧 item，保留 label 和 divider
        bar.querySelectorAll('.recent-item').forEach(el=>el.remove());
        const empty = document.getElementById('recentEmpty');
        if(!recentIds.length){ empty.style.display=''; return; }
        empty.style.display='none';
        const divider = bar.querySelector('.recent-divider');
        recentIds.forEach(id=>{
            const t = tools.find(x=>x.id===id); if(!t) return;
            const btn = document.createElement('span');
            btn.className='recent-item';
            btn.innerHTML=`<span class="ri-icon">${t.icon}</span>${t.name}`;
            btn.onclick=()=>{ recordRecent(t.id); openTool(t); };
            bar.insertBefore(btn, divider.nextSibling);
        });
    }

    function toggleFav(id, btn, card){
        const isLoggedIn = !!localStorage.getItem('admin_token');
        const tool = tools.find(x=>x.id===id);
        if(!tool) return;

        if(favorites.has(id)){
            favorites.delete(id); btn.classList.remove('active');
            btn.textContent='☆'; card.classList.remove('favorited');
            if(isLoggedIn){
                fetch(`/api/admin/favorites/${id}`, {
                    method: 'DELETE',
                    headers: {'Authorization': 'Bearer ' + localStorage.getItem('admin_token')}
                }).catch(e=>console.log('取消收藏失败',e));
            }
        } else {
            if(!isLoggedIn){
                showLoginModal();
                return;
            }
            favorites.add(id); btn.classList.add('active');
            btn.textContent='★'; card.classList.add('favorited');
            fetch('/api/admin/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
                },
                body: JSON.stringify({
                    tool_id: tool.id,
                    tool_name: tool.name,
                    tool_icon: tool.icon,
                    tool_url: tool.url
                })
            }).catch(e=>console.log('添加收藏失败',e));
        }
        saveFav(); updateBadge();
        if(document.getElementById('view-fav').classList.contains('active')) renderFav();
    }

    // 清理无效的收藏（已删除的工具）
    function cleanupInvalidFavorites(){
        const validFavorites = new Set();
        const isLoggedIn = !!localStorage.getItem('admin_token');
        
        favorites.forEach(id => {
            const tool = tools.find(t => t.id === id);
            if(tool) {
                validFavorites.add(id);
            } else if(isLoggedIn) {
                // 如果已登录，同时从后端删除无效收藏
                fetch(`/api/admin/favorites/${id}`, {
                    method: 'DELETE',
                    headers: {'Authorization': 'Bearer ' + localStorage.getItem('admin_token')}
                }).catch(e => console.log('清理无效收藏失败', e));
            }
        });
        
        if(validFavorites.size !== favorites.size) {
            favorites = validFavorites;
            saveFav();
            console.log('已清理无效收藏');
        }
        return validFavorites;
    }

    function updateBadge(){
        const b=document.getElementById('favBadge');
        // 只计算存在的工具
        const validFavorites = cleanupInvalidFavorites();
        b.textContent=validFavorites.size;
        b.style.display=validFavorites.size?'':'none';
    }

    function fmtUses(n){
        return n>=10000?(n/10000).toFixed(1)+'w':n>=1000?(n/1000).toFixed(1)+'k':n+'';
    }

    function makeCard(t, showHot){
        const isFav=favorites.has(t.id);
        const card=document.createElement('div');
        card.className='card'+(isFav?' favorited':'');
        const hotBadge = (showHot && t.hot) ? `<span class="hot-badge"></span>` : '';
        const foreignBadge = t.foreign ? `<span class="foreign-badge">国外</span>` : '';
        const usesLine = (showHot && t.hot) ? `<div class="card-uses">🔥 ${fmtUses(t.uses)} 次使用</div>` : '';
        card.innerHTML=`
            ${hotBadge}
            ${foreignBadge}
            <button class="star-btn ${isFav?'active':''}" title="${isFav?'取消收藏':'收藏'}">
                ${isFav?'★':'☆'}
            </button>
            <div class="card-header">
                <div class="icon-small">${t.icon}</div>
                <h3>${t.name}</h3>
            </div>
            <p>${t.desc}</p>
            ${usesLine}
            <button class="btn-run">打开</button>
        `;
        card.querySelector('.star-btn').addEventListener('click', e=>{
            e.stopPropagation(); toggleFav(t.id, e.currentTarget, card);
        });
        card.querySelector('.btn-run').addEventListener('click', e=>{
            e.stopPropagation();
            recordRecent(t.id);
            openTool(t);
        });
        return card;
    }

    function renderGrid(id, list, showHot){
        const el=document.getElementById(id); el.innerHTML='';
        if(!list.length){
            el.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><p>没有找到相关工具</p></div>';
            return;
        }
        list.forEach(t=>el.appendChild(makeCard(t, showHot||false)));
    }

    function renderFav(){
        // 先清理无效收藏
        cleanupInvalidFavorites();
        const favTools=tools.filter(t=>favorites.has(t.id));
        document.getElementById('emptyFav').style.display=favTools.length?'none':'flex';
        renderGrid('grid-fav', favTools);
    }

    // 动态渲染导航栏
    function renderDynamicNav(){
        const navContainer = document.getElementById('dynamic-nav');
        navContainer.innerHTML = '';
        categories.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'nav-item';
            div.setAttribute('data-category-id', cat.id);
            div.onclick = (e) => switchNav(e.currentTarget, 'cat_' + cat.id);
            div.innerHTML = `<span>${cat.icon} ${cat.name}</span>`;
            navContainer.appendChild(div);
        });
    }

    // 动态渲染分类视图
    function renderDynamicViews(){
        const viewsContainer = document.getElementById('dynamic-views');
        viewsContainer.innerHTML = '';
        categories.forEach(cat => {
            const viewDiv = document.createElement('div');
            viewDiv.className = 'view';
            viewDiv.id = 'view-cat_' + cat.id;
            viewDiv.innerHTML = `
                <div class="section-title">${cat.icon} ${cat.name}</div>
                <div class="grid" id="grid-cat_${cat.id}"></div>
            `;
            viewsContainer.appendChild(viewDiv);
        });
    }

    // 动态渲染首页的分类区域
    function renderHomeCategories(){
        const container = document.getElementById('dynamic-categories');
        container.innerHTML = '';
        categories.forEach(cat => {
            const catTools = tools.filter(t => t.cat === 'cat_' + cat.id);
            if (catTools.length > 0) {
                const div = document.createElement('div');
                div.innerHTML = `
                    <div class="category-section" id="cat-section_${cat.id}">
                        <div class="section-title" style="margin-top:22px;">${cat.icon} ${cat.name}</div>
                        <div class="grid" id="grid-cat_${cat.id}_home"></div>
                    </div>
                `;
                container.appendChild(div);
                renderGrid('grid-cat_' + cat.id + '_home', catTools);
            }
        });
    }

    function renderAll(){
        // 确保滚动导航已启用
        window.scrollNavDisabled = false;
        
        const hotList = window.hotTools || [...tools].filter(t=>t.hot);
        renderGrid('grid-hot', hotList, true);
        
        // 动态渲染
        renderDynamicNav();
        renderDynamicViews();
        renderHomeCategories();
        
        // 渲染各分类视图
        categories.forEach(cat => {
            const catTools = tools.filter(t => t.cat === 'cat_' + cat.id);
            renderGrid('grid-cat_' + cat.id, catTools);
        });
        
        renderFav(); updateBadge(); renderRecentBar();
        
        // 延迟初始化滚动导航（等待DOM渲染完成）
        setTimeout(() => {
            if (window.scrollNavInitialized) return;
            window.scrollNavInitialized = true;
            setupScrollNavigation();
        }, 500);
    }
    
    // 滚动时自动选中导航栏
    function setupScrollNavigation() {
        const mainContent = document.querySelector('.tools-box');
        if (!mainContent) return;

        let isScrolling = false;

        mainContent.addEventListener('scroll', () => {
            // 如果正在进行点击导航，跳过滚动检测
            if (window.isClickNavigating) return;
            
            if (isScrolling) return;
            isScrolling = true;

            requestAnimationFrame(() => {
                const newCategoryId = updateNavigationOnScroll();

                // 如果找到了新的分类ID，才更新选中状态
                if (newCategoryId !== null && newCategoryId !== undefined && newCategoryId !== window.lastActiveCategoryId) {
                    // 延迟清除旧选中，给新选中让路
                    if (window.scrollTimeout) clearTimeout(window.scrollTimeout);

                    // 先设置新的选中状态
                    const navItems = document.querySelectorAll('.nav-item');
                    navItems.forEach(item => {
                        const itemCatId = item.getAttribute('data-category-id');
                        if (itemCatId === String(newCategoryId) || (newCategoryId === 'home' && item === document.querySelector('.nav-item:first-child'))) {
                            item.classList.add('active');
                        }
                    });

                    // 短暂延迟后移除其他项的选中状态（除了新的和首页）
                    window.scrollTimeout = setTimeout(() => {
                        navItems.forEach(item => {
                            const itemCatId = item.getAttribute('data-category-id');
                            if (itemCatId !== String(newCategoryId)) {
                                item.classList.remove('active');
                            }
                        });
                    }, 50);

                    window.lastActiveCategoryId = newCategoryId;
                }

                isScrolling = false;
            });
        });
    }

    function updateNavigationOnScroll() {
        // 如果在工具页面，禁用滚动导航
        if (window.scrollNavDisabled) return;
        
        const mainContent = document.querySelector('.tools-box');
        if (!mainContent) return;
        
        const scrollTop = mainContent.scrollTop;
        const aside = document.querySelector('aside');
        if (!aside) return;
        
        // 获取侧边栏导航项
        const navItems = aside.querySelectorAll('.nav-item');
        if (navItems.length === 0) return;
        
        // 查找最近的分类标题（只在首页视图中）
        const activeView = document.querySelector('.view.active');
        if (!activeView || activeView.id !== 'view-all') return;
        
        const sectionTitles = activeView.querySelectorAll('.section-title');
        if (sectionTitles.length === 0) return;
        
        let closestCategoryId = null;
        let minDistance = Infinity;
        let closestTitleTop = Infinity;
        
        sectionTitles.forEach(title => {
            const rect = title.getBoundingClientRect();
            const mainRect = mainContent.getBoundingClientRect();
            const titleTop = rect.top - mainRect.top + scrollTop;
            
            // 计算标题顶部距离视口顶部的距离
            const distanceToTop = titleTop - scrollTop;
            
            // 找到进入视口的标题（在视口顶部150px范围内）
            if (distanceToTop >= -50 && distanceToTop <= 200) {
                if (titleTop < closestTitleTop) {
                    closestTitleTop = titleTop;
                    // 提取纯文本名称（移除图标）
                    const titleText = title.textContent.trim();
                    // 尝试匹配分类
                    const matchedCat = categories.find(cat => {
                        const catNameWithIcon = cat.icon + ' ' + cat.name;
                        return titleText === catNameWithIcon || titleText.includes(cat.name);
                    });
                    if (matchedCat) {
                        closestCategoryId = matchedCat.id;
                    }
                }
            }
        });
        
        // 如果没有找到分类，检查是否在顶部（首页）
        if (!closestCategoryId && scrollTop < 100) {
            closestCategoryId = 'home';
        }

        // 返回分类ID，由setupScrollNavigation处理选中状态
        if (closestCategoryId === 'home') {
            // 选中首页
            const homeNav = document.querySelector('.nav-item:first-child');
            if (homeNav) homeNav.classList.add('active');
            return 'home';
        } else if (closestCategoryId !== null && closestCategoryId !== undefined) {
            // 选中对应分类
            const targetNav = document.querySelector('.nav-item[data-category-id="' + closestCategoryId + '"]');
            if (targetNav) {
                targetNav.classList.add('active');
                return closestCategoryId;
            }
        }
        return null;
    }

    function switchNav(el, view){
        // 重置 SEO 标签为首页
        resetSEOTags();
        
        // 立即清除滚动导航的延迟定时器，避免状态冲突
        if (window.scrollTimeout) {
            clearTimeout(window.scrollTimeout);
        }
        
        // 标记正在进行点击导航，禁用滚动导航检测
        window.isClickNavigating = true;
        
        // 立即清除所有导航项的选中状态
        document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
        el.classList.add('active');
        
        // 如果是"我的收藏"，切换到收藏视图
        if (view === 'fav') {
            document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
            const targetView = document.getElementById('view-' + view);
            if(targetView) {
                targetView.classList.add('active');
            }
            renderFav();
            // 恢复滚动导航检测
            setTimeout(() => {
                window.isClickNavigating = false;
            }, 1000);
            return;
        }
        
        // 如果是分类导航，在首页视图中滚动到对应的位置
        if (view.startsWith('cat_')) {
            // 切换到首页视图
            document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
            const viewAll = document.getElementById('view-all');
            if (viewAll) {
                viewAll.classList.add('active');
            }
            
            // 获取分类ID
            const categoryId = view.replace('cat_', '');
            
            // 更新滚动导航的最后选中状态
            window.lastActiveCategoryId = categoryId;
            
            // 查找分类名称
            const category = categories.find(cat => cat.id == categoryId);
            if (category) {
                // 查找对应的分类标题元素
                const titleText = category.icon + ' ' + category.name;
                
                // 查找所有分类标题，找到匹配的
                const allTitles = viewAll.querySelectorAll('.section-title');
                let targetTitle = null;
                allTitles.forEach(title => {
                    if (title.textContent.trim() === titleText) {
                        targetTitle = title;
                    }
                });
                
                // 如果找到目标标题，滚动到该位置
                if (targetTitle) {
                    const mainContent = document.querySelector('.tools-box');
                    if (mainContent) {
                        // 计算滚动位置（标题上方留出50px空间）
                        const titleTop = targetTitle.offsetTop;
                        mainContent.scrollTo({
                            top: titleTop - 50,
                            behavior: 'smooth'
                        });
                    }
                }
            }
            
            // 恢复滚动导航检测（等待平滑滚动完成）
            setTimeout(() => {
                window.isClickNavigating = false;
            }, 1000);
            return;
        }
        
        // 默认行为：切换到指定视图
        document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
        const targetView = document.getElementById('view-' + view);
        if(targetView) {
            targetView.classList.add('active');
        }
        
        // 恢复滚动导航检测
        setTimeout(() => {
            window.isClickNavigating = false;
        }, 1000);
    }

    function searchTools(q){
        if(!q.trim()){ 
            renderAll(); 
            const hotSection = document.querySelector('.hot-section');
            if(hotSection) hotSection.style.display=''; 
            return; 
        }
        const kw=q.toLowerCase();
        const res=tools.filter(t=>t.name.toLowerCase().includes(kw)||t.desc.includes(kw));
        document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
        document.querySelector('.nav-item').classList.add('active');
        document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
        document.getElementById('view-all').classList.add('active');
        const hotSection = document.querySelector('.hot-section');
        if(hotSection) hotSection.style.display='none';
        const dynamicCats = document.getElementById('dynamic-categories');
        if(dynamicCats) dynamicCats.style.display='none';
        const searchResults = document.getElementById('search-results') || createSearchResults();
        searchResults.style.display='';
        renderGrid('search-results', res, false);
    }

    function createSearchResults(){
        const div = document.createElement('div');
        div.id = 'search-results';
        div.className = 'grid';
        const viewAll = document.getElementById('view-all');
        if(viewAll){
            const dynamicCats = document.getElementById('dynamic-categories');
            if(dynamicCats) dynamicCats.style.display='none';
            const hotSection = viewAll.querySelector('.hot-section');
            if(hotSection) hotSection.style.display='none';
            viewAll.appendChild(div);
        }
        return div;
    }

    // 统一打开工具 - 按工具类型处理
    function openTool(tool) {
        // 工具类型：1=外部链接，2=本站工具，3=本站链接
        const type = tool.type || 1; // 默认为1（外部链接）
        
        switch(type) {
            case 1:
            case '1':
                // 类型1：外部链接工具，跳转到中间页
                window.location.href = '/tool?id=' + tool.id;
                break;
                
            case 2:
            case '2':
                // 类型2：本站工具，在本站打开
                // 更新页面 SEO 标签
                updateSEOTags(tool);
                
                // 切换到工具详情视图（保持导航栏选中状态）
                document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
                document.getElementById('view-tool').classList.add('active');
                
                // 渲染工具详情页面
                renderToolPage(tool);
                break;
                
            case 3:
            case '3':
                // 类型3：本站链接，直接打开指定URL
                if (tool.url && tool.url.trim() !== '') {
                    window.location.href = '/' + tool.url;
                }
                break;
                
            default:
                // 默认为外部链接
                window.location.href = '/tool?id=' + tool.id;
        }
    }
    
    // 更新页面 SEO 标签（支持单个工具页面）
    function updateSEOTags(tool) {
        // 更新页面标题
        document.title = `${tool.name} - 极简工具盒 | tools.jianbox.cn`;
        
        // 更新 meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = tool.desc || tool.description || `${tool.name} - 免费在线工具，无需下载即可使用`;
        
        // 更新 Open Graph
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = `${tool.name} - 极简工具盒`;
        
        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = tool.desc || tool.description || `${tool.name} - 免费在线工具`;
        
        // 更新 Twitter Card
        let twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.content = `${tool.name} - 极简工具盒`;
        
        let twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) twitterDesc.content = tool.desc || tool.description || `${tool.name} - 免费在线工具`;
    }
    
    // 重置 SEO 标签为首页
    function resetSEOTags() {
        document.title = '极简工具盒 - 免费在线工具箱 | tools.jianbox.cn';
        
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = '极简工具盒提供丰富的免费在线工具，包括JSON格式化、Base64编解码、时间戳转换、密码生成器等开发、设计、办公工具。无需下载，打开即用。';
        }
        
        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = '极简工具盒 - 免费在线工具箱';
        
        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = '提供JSON格式化、Base64编解码、时间戳转换、密码生成器等免费在线工具。无需下载，打开即用。';
        
        let twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.content = '极简工具盒 - 免费在线工具箱';
        
        let twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) twitterDesc.content = '提供JSON格式化、Base64编解码、时间戳转换、密码生成器等免费在线工具。无需下载，打开即用。';
    }
    
    // 渲染工具详情页面
    function renderToolPage(tool) {
        const toolPage = document.getElementById('toolPage');
        const isFav = favorites.has(tool.id);
        
        // 保存当前工具信息用于返回（转换为字符串类型以确保匹配）
        window.currentToolCategoryId = String(tool.category_id);
        
        let toolContent = '';
        const toolName = tool.name.replace(/\s/g, ''); // 去除所有空格，兼容数据库名称
        
        switch (toolName) {
            case 'JSON格式化':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">JSON 格式化</div>
                            <div class="json-panels">
                                <div class="json-panel">
                                    <label>输入</label>
                                    <textarea id="json-input" placeholder="输入或粘贴 JSON 数据"></textarea>
                                </div>
                                <div class="json-panel">
                                    <label>输出</label>
                                    <textarea id="json-output" placeholder="结果将显示在这里" readonly></textarea>
                                </div>
                            </div>
                            <div class="tool-buttons" style="margin-top:20px;">
                                <button onclick="formatJson()" class="btn-primary">格式化</button>
                                <button onclick="compressJson()" class="btn-secondary">压缩</button>
                                <button onclick="copyJson()" class="btn-secondary">复制</button>
                                <button onclick="clearJson()" class="btn-secondary">清空</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'Base64编码解码':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">Base64 编解码</div>
                            <div class="json-panels">
                                <div class="json-panel">
                                    <label>输入</label>
                                    <textarea id="base64-input" placeholder="输入要编码或解码的内容"></textarea>
                                </div>
                                <div class="json-panel">
                                    <label>输出</label>
                                    <textarea id="base64-output" placeholder="结果将显示在这里" readonly></textarea>
                                </div>
                            </div>
                            <div class="tool-buttons" style="margin-top:20px;">
                                <button onclick="encodeBase64()" class="btn-primary">编码</button>
                                <button onclick="decodeBase64()" class="btn-secondary">解码</button>
                                <button onclick="copyBase64()" class="btn-secondary">复制</button>
                                <button onclick="clearBase64()" class="btn-secondary">清空</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '时间戳转换':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">时间戳转换</div>
                            <div class="timestamp-section" style="margin-bottom:16px;">
                                <label>时间戳（秒）：</label>
                                <input type="text" id="timestamp-input" placeholder="1714400000" style="flex:1;">
                                <button onclick="timestampToDate()" class="btn-primary">→ 转日期</button>
                            </div>
                            <div class="timestamp-section" style="margin-bottom:16px;">
                                <label>日期时间：</label>
                                <input type="datetime-local" id="datetime-input" style="flex:1;">
                                <button onclick="dateToTimestamp()" class="btn-primary">→ 转时间戳</button>
                            </div>
                            <div class="timestamp-section">
                                <label>当前时间：</label>
                                <div class="current-time">
                                    <p id="current-timestamp"></p>
                                    <p id="current-datetime"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'UUID生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">UUID 生成器</div>
                            <div class="tool-buttons" style="margin-bottom:20px;">
                                <button onclick="generateUUID()" class="btn-primary">生成 UUID</button>
                                <button onclick="copyUUID()" class="btn-secondary">复制</button>
                            </div>
                            <textarea id="uuid-output" placeholder="点击上方按钮生成 UUID" readonly style="min-height:100px;"></textarea>
                        </div>
                    </div>
                `;
                break;
            case '随机数生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">随机数生成器</div>
                            <div style="margin-bottom:16px;">
                                <label>最小值：</label>
                                <input type="number" id="random-min" value="0" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:16px;">
                                <label>最大值：</label>
                                <input type="number" id="random-max" value="100" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:16px;">
                                <label><input type="checkbox" id="random-integer" checked> 整数</label>
                            </div>
                            <div class="tool-buttons" style="margin-bottom:20px;">
                                <button onclick="generateRandomNumber()" class="btn-primary">生成随机数</button>
                                <button onclick="copyRandomNumber()" class="btn-secondary">复制</button>
                            </div>
                            <input type="text" id="random-output" placeholder="点击上方按钮生成随机数" readonly style="width:100%;padding:16px;font-size:18px;font-family:monospace;">
                        </div>
                    </div>
                `;
                break;
            case '随机密码生成':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">随机密码生成</div>
                            <div class="password-options" style="margin-bottom:20px;">
                                <label>长度：<input type="number" id="pwd-length" value="16" min="4" max="64"></label>
                                <label><input type="checkbox" id="pwd-upper" checked> 大写字母</label>
                                <label><input type="checkbox" id="pwd-lower" checked> 小写字母</label>
                                <label><input type="checkbox" id="pwd-number" checked> 数字</label>
                                <label><input type="checkbox" id="pwd-symbol" checked> 特殊符号</label>
                            </div>
                            <div class="tool-buttons" style="margin-bottom:20px;">
                                <button onclick="generatePassword()" class="btn-primary">生成密码</button>
                                <button onclick="copyPassword()" class="btn-secondary">复制</button>
                            </div>
                            <input type="text" id="pwd-output" placeholder="点击上方按钮生成密码" readonly style="width:100%;padding:16px;font-size:18px;font-family:monospace;">
                        </div>
                    </div>
                `;
                break;
            case '颜色转换器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">颜色转换器</div>
                            <div class="color-picker-section" style="margin-bottom:20px;">
                                <input type="color" id="color-picker" value="#6366f1" onchange="updateColorFromPicker()">
                                <div id="color-preview" style="width:100px;height:100px;border-radius:16px;border:2px solid var(--border);"></div>
                            </div>
                            <div class="color-inputs">
                                <div class="color-input">
                                    <label>HEX</label>
                                    <input type="text" id="color-hex" value="#6366f1" oninput="updateColorFromHex()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                                <div class="color-input">
                                    <label>RGB</label>
                                    <input type="text" id="color-rgb" value="rgb(99, 102, 241)" oninput="updateColorFromRgb()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '计算器':
                toolContent = `
                    <div class="calculator-page">
                        <div class="calculator-large">
                            <div class="calculator-display-large">
                                <div id="calc-display">0</div>
                            </div>
                            <div class="calculator-buttons-large">
                                <button onclick="calcClear()" class="calc-btn-large calc-clear-large">C</button>
                                <button onclick="calcBackspace()" class="calc-btn-large">⌫</button>
                                <button onclick="calcAppend('%')" class="calc-btn-large calc-operator-large">%</button>
                                <button onclick="calcAppend('/')" class="calc-btn-large calc-operator-large">÷</button>
                                <button onclick="calcAppend('7')" class="calc-btn-large">7</button>
                                <button onclick="calcAppend('8')" class="calc-btn-large">8</button>
                                <button onclick="calcAppend('9')" class="calc-btn-large">9</button>
                                <button onclick="calcAppend('*')" class="calc-btn-large calc-operator-large">×</button>
                                <button onclick="calcAppend('4')" class="calc-btn-large">4</button>
                                <button onclick="calcAppend('5')" class="calc-btn-large">5</button>
                                <button onclick="calcAppend('6')" class="calc-btn-large">6</button>
                                <button onclick="calcAppend('-')" class="calc-btn-large calc-operator-large">−</button>
                                <button onclick="calcAppend('1')" class="calc-btn-large">1</button>
                                <button onclick="calcAppend('2')" class="calc-btn-large">2</button>
                                <button onclick="calcAppend('3')" class="calc-btn-large">3</button>
                                <button onclick="calcAppend('+')" class="calc-btn-large calc-operator-large">+</button>
                                <button onclick="calcAppend('0')" class="calc-btn-large calc-zero-large">0</button>
                                <button onclick="calcAppend('.')" class="calc-btn-large">.</button>
                                <button onclick="calcEquals()" class="calc-btn-large calc-equals-large">=</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'URL编码解码':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">URL 编码解码</div>
                            <div class="json-panels">
                                <div class="json-panel">
                                    <label>输入</label>
                                    <textarea id="url-input" placeholder="输入要编码或解码的URL"></textarea>
                                </div>
                                <div class="json-panel">
                                    <label>输出</label>
                                    <textarea id="url-output" placeholder="结果将显示在这里" readonly></textarea>
                                </div>
                            </div>
                            <div class="tool-buttons" style="margin-top:20px;">
                                <button onclick="encodeUrl()" class="btn-primary">编码</button>
                                <button onclick="decodeUrl()" class="btn-secondary">解码</button>
                                <button onclick="copyUrl()" class="btn-secondary">复制</button>
                                <button onclick="clearUrl()" class="btn-secondary">清空</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'MD5加密':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">MD5 加密</div>
                            <div style="margin-bottom:20px;">
                                <input type="text" id="md5-input" placeholder="输入要加密的字符串" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons" style="margin-bottom:20px;">
                                <button onclick="md5Encrypt()" class="btn-primary">计算 MD5</button>
                                <button onclick="copyMd5()" class="btn-secondary">复制</button>
                                <button onclick="clearMd5()" class="btn-secondary">清空</button>
                            </div>
                            <textarea id="md5-output" placeholder="MD5 结果将显示在这里" readonly style="width:100%;min-height:100px;padding:12px;font-family:monospace;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                        </div>
                    </div>
                `;
                break;
            case '正则表达式测试':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">正则表达式测试</div>
                            <div style="margin-bottom:12px;">
                                <label>常用表达式：</label>
                                <div class="regex-presets" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                                    <button onclick="setRegexPreset('phone')" class="btn-preset" data-preset="phone">手机号</button>
                                    <button onclick="setRegexPreset('email')" class="btn-preset" data-preset="email">邮箱</button>
                                    <button onclick="setRegexPreset('idcard')" class="btn-preset" data-preset="idcard">身份证</button>
                                    <button onclick="setRegexPreset('url')" class="btn-preset" data-preset="url">URL</button>
                                    <button onclick="setRegexPreset('ip')" class="btn-preset" data-preset="ip">IP地址</button>
                                    <button onclick="setRegexPreset('date')" class="btn-preset" data-preset="date">日期</button>
                                    <button onclick="setRegexPreset('chinese')" class="btn-preset" data-preset="chinese">中文字符</button>
                                    <button onclick="setRegexPreset('number')" class="btn-preset" data-preset="number">数字</button>
                                    <button onclick="setRegexPreset('qq')" class="btn-preset" data-preset="qq">QQ号</button>
                                    <button onclick="setRegexPreset('postcode')" class="btn-preset" data-preset="postcode">邮编</button>
                                </div>
                            </div>
                            <style>
                                .btn-preset {
                                    padding: 6px 14px;
                                    border: 1px solid var(--border);
                                    border-radius: 8px;
                                    background: rgba(255, 255, 255, 0.05);
                                    color: var(--text-dim);
                                    font-size: 13px;
                                    cursor: pointer;
                                    transition: all 0.25s;
                                }
                                .btn-preset:hover {
                                    background: rgba(255, 255, 255, 0.1);
                                    color: var(--text);
                                }
                                .btn-preset.active {
                                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
                                    border-color: rgba(99, 102, 241, 0.5);
                                    color: #a5b4fc;
                                    box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
                                }
                            </style>
                            <div style="margin-bottom:16px;">
                                <label>正则表达式：</label>
                                <input type="text" id="regex-pattern" placeholder="输入正则表达式，如: /abc/g" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:16px;">
                                <label>测试文本：</label>
                                <textarea id="regex-text" placeholder="输入要测试的文本" style="width:100%;min-height:100px;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="testRegex()" class="btn-primary">测试匹配</button>
                                <button onclick="clearRegex()" class="btn-secondary">清空</button>
                            </div>
                            <div>
                                <label>匹配结果：</label>
                                <textarea id="regex-result" placeholder="匹配结果将显示在这里" readonly style="width:100%;min-height:100px;padding:12px;font-family:monospace;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'SQL格式化':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">SQL 格式化</div>
                            <div class="json-panels">
                                <div class="json-panel">
                                    <label>输入 SQL</label>
                                    <textarea id="sql-input" placeholder="输入 SQL 语句"></textarea>
                                </div>
                                <div class="json-panel">
                                    <label>格式化结果</label>
                                    <textarea id="sql-output" placeholder="格式化结果将显示在这里" readonly></textarea>
                                </div>
                            </div>
                            <div class="tool-buttons" style="margin-top:20px;">
                                <button onclick="formatSql()" class="btn-primary">格式化</button>
                                <button onclick="copySql()" class="btn-secondary">复制</button>
                                <button onclick="clearSql()" class="btn-secondary">清空</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '单位换算':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">单位换算</div>
                            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
                                <select id="unit-type" onchange="updateUnitOptions()" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                    <option value="length">长度</option>
                                    <option value="weight">重量</option>
                                    <option value="volume">体积</option>
                                    <option value="temperature">温度</option>
                                </select>
                            </div>
                            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
                                <input type="number" id="unit-input" placeholder="输入数值" style="flex:1;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                <select id="unit-from" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                    <option value="m">米 (m)</option>
                                    <option value="km">千米 (km)</option>
                                    <option value="cm">厘米 (cm)</option>
                                    <option value="mm">毫米 (mm)</option>
                                    <option value="in">英寸 (in)</option>
                                    <option value="ft">英尺 (ft)</option>
                                    <option value="yd">码 (yd)</option>
                                    <option value="mi">英里 (mi)</option>
                                </select>
                            </div>
                            <div style="text-align:center;margin-bottom:16px;">→</div>
                            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
                                <input type="text" id="unit-output" placeholder="结果" readonly style="flex:1;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                <select id="unit-to" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                    <option value="m">米 (m)</option>
                                    <option value="km">千米 (km)</option>
                                    <option value="cm">厘米 (cm)</option>
                                    <option value="mm">毫米 (mm)</option>
                                    <option value="in">英寸 (in)</option>
                                    <option value="ft">英尺 (ft)</option>
                                    <option value="yd">码 (yd)</option>
                                    <option value="mi">英里 (mi)</option>
                                </select>
                            </div>
                            <div class="tool-buttons">
                                <button onclick="convertUnit()" class="btn-primary">换算</button>
                                <button onclick="swapUnits()" class="btn-secondary">交换</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '汇率换算':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">汇率换算</div>
                            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
                                <input type="number" id="currency-input" placeholder="输入金额" style="flex:1;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                <select id="currency-from" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                    <option value="CNY" style="background:#0f172a;color:#e2e8f0;">人民币 (CNY)</option>
                                    <option value="USD" style="background:#0f172a;color:#e2e8f0;">美元 (USD)</option>
                                    <option value="EUR" style="background:#0f172a;color:#e2e8f0;">欧元 (EUR)</option>
                                    <option value="GBP" style="background:#0f172a;color:#e2e8f0;">英镑 (GBP)</option>
                                    <option value="JPY" style="background:#0f172a;color:#e2e8f0;">日元 (JPY)</option>
                                    <option value="KRW" style="background:#0f172a;color:#e2e8f0;">韩元 (KRW)</option>
                                    <option value="HKD" style="background:#0f172a;color:#e2e8f0;">港币 (HKD)</option>
                                    <option value="TWD" style="background:#0f172a;color:#e2e8f0;">台币 (TWD)</option>
                                </select>
                            </div>
                            <div style="text-align:center;margin-bottom:16px;">→</div>
                            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
                                <input type="text" id="currency-output" placeholder="结果" readonly style="flex:1;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                <select id="currency-to" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                    <option value="USD" style="background:#0f172a;color:#e2e8f0;">美元 (USD)</option>
                                    <option value="EUR" style="background:#0f172a;color:#e2e8f0;">欧元 (EUR)</option>
                                    <option value="GBP" style="background:#0f172a;color:#e2e8f0;">英镑 (GBP)</option>
                                    <option value="JPY" style="background:#0f172a;color:#e2e8f0;">日元 (JPY)</option>
                                    <option value="KRW" style="background:#0f172a;color:#e2e8f0;">韩元 (KRW)</option>
                                    <option value="HKD" style="background:#0f172a;color:#e2e8f0;">港币 (HKD)</option>
                                    <option value="TWD" style="background:#0f172a;color:#e2e8f0;">台币 (TWD)</option>
                                    <option value="CNY" style="background:#0f172a;color:#e2e8f0;">人民币 (CNY)</option>
                                </select>
                            </div>
                            <div class="tool-buttons">
                                <button onclick="convertCurrency()" class="btn-primary">换算</button>
                                <button onclick="swapCurrency()" class="btn-secondary">交换</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '日期计算器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">日期计算器</div>
                            <div style="display:flex;gap:24px;">
                                <div style="flex:1;">
                                    <div style="margin-bottom:16px;">
                                        <label style="display:block;margin-bottom:8px;">开始日期：</label>
                                        <div style="position:relative;width:200px;">
                                            <input type="date" id="date-start" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                            <button type="button" onclick="document.getElementById('date-start').showPicker()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:18px;color:var(--primary);cursor:pointer;padding:4px;">📅</button>
                                        </div>
                                    </div>
                                    <div style="margin-bottom:16px;">
                                        <label style="display:block;margin-bottom:8px;">结束日期：</label>
                                        <div style="position:relative;width:200px;">
                                            <input type="date" id="date-end" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                            <button type="button" onclick="document.getElementById('date-end').showPicker()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:18px;color:var(--primary);cursor:pointer;padding:4px;">📅</button>
                                        </div>
                                    </div>
                                    <div class="tool-buttons" style="margin-bottom:16px;">
                                        <button onclick="calcDateDiff()" class="btn-primary">计算天数差</button>
                                        <button onclick="addDays()" class="btn-secondary">添加天数</button>
                                    </div>
                                </div>
                                <div style="flex:1;display:flex;align-items:center;justify-content:center;">
                                    <div style="padding:24px;border-radius:12px;border:1px solid var(--border);background:var(--card);min-width:200px;">
                                        <p style="font-size:16px;margin-bottom:12px;"><strong>天数差：</strong><span id="date-result" style="color:var(--primary);font-size:24px;">0</span> 天</p>
                                        <p style="font-size:16px;"><strong>工作日：</strong><span id="workdays-result" style="color:var(--primary);font-size:24px;">0</span> 天</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '年龄计算器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">年龄计算器</div>
                            <div style="margin-bottom:16px;">
                                <label>出生日期：</label>
                                <input type="date" id="birthday-input" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="calcAge()" class="btn-primary">计算年龄</button>
                            </div>
                            <div style="padding:16px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <p><strong>年龄：</strong><span id="age-result">0</span> 岁</p>
                                <p><strong>生肖：</strong><span id="zodiac-result">-</span></p>
                                <p><strong>星座：</strong><span id="constellation-result">-</span></p>
                                <p><strong>已活天数：</strong><span id="days-alive">-</span> 天</p>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '二维码生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">二维码生成器</div>
                            <div style="margin-bottom:16px;">
                                <input type="text" id="qrcode-input" placeholder="输入网址、文本等内容" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
                                <label>尺寸：</label>
                                <div style="position:relative;">
                                    <select id="qrcode-size" style="appearance:none;padding:8px 32px 8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);min-width:120px;cursor:pointer;">
                                        <option value="128" style="background:var(--card);color:var(--text);">128px</option>
                                        <option value="256" style="background:var(--card);color:var(--text);">256px</option>
                                        <option value="300" style="background:var(--card);color:var(--text);">300px</option>
                                        <option value="400" style="background:var(--card);color:var(--text);">400px</option>
                                    </select>
                                    <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-secondary);">&#9660;</span>
                                </div>
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="generateQRCode()" class="btn-primary">生成二维码</button>
                                <button onclick="downloadQRCode()" class="btn-secondary">下载</button>
                            </div>
                            <div id="qrcode-container" style="text-align:center;padding:20px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <div id="qrcode" style="display:inline-block;"></div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '短链接生成':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">短链接生成</div>
                            <div style="margin-bottom:16px;">
                                <input type="text" id="long-url" placeholder="输入长链接" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="generateShortUrl()" class="btn-primary">生成短链接</button>
                                <button onclick="copyShortUrl()" class="btn-secondary">复制</button>
                            </div>
                            <div style="padding:16px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <input type="text" id="short-url" placeholder="短链接将显示在这里" readonly style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:none;background:transparent;color:var(--text);">
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'IP查询':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">IP 查询</div>
                            <div style="margin-bottom:16px;">
                                <input type="text" id="ip-input" placeholder="输入 IP 地址" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="queryIP()" class="btn-primary">查询</button>
                                <button onclick="getMyIP()" class="btn-secondary">查询我的 IP</button>
                            </div>
                            <div id="ip-result" style="padding:16px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <p><strong>IP：</strong><span id="ip-address">-</span></p>
                                <p><strong>国家：</strong><span id="ip-country">-</span></p>
                                <p><strong>省份：</strong><span id="ip-province">-</span></p>
                                <p><strong>城市：</strong><span id="ip-city">-</span></p>
                                <p><strong>运营商：</strong><span id="ip-isp">-</span></p>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '天气查询':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">天气查询</div>
                            <div style="margin-bottom:16px;">
                                <input type="text" id="city-input" placeholder="输入城市名称" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="getWeather()" class="btn-primary">查询天气</button>
                                <button onclick="getCurrentLocationWeather()" class="btn-secondary">定位查询</button>
                            </div>
                            <div id="weather-result" style="padding:16px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">
                                    <div id="weather-icon" style="font-size:48px;">🌤️</div>
                                    <div>
                                        <p><strong>城市：</strong><span id="weather-city">-</span></p>
                                        <p><strong>天气：</strong><span id="weather-desc">-</span></p>
                                    </div>
                                </div>
                                <p><strong>温度：</strong><span id="weather-temp">-</span>°C</p>
                                <p><strong>湿度：</strong><span id="weather-humidity">-</span>%</p>
                                <p><strong>风力：</strong><span id="weather-wind">-</span></p>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '关键词密度检测':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">关键词密度检测</div>
                            <div style="margin-bottom:16px;">
                                <label>关键词：</label>
                                <input type="text" id="keyword-input" placeholder="输入要检测的关键词，多个用逗号分隔" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:16px;">
                                <label>文章内容：</label>
                                <textarea id="content-input" placeholder="粘贴文章内容" style="width:100%;min-height:200px;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="calcKeywordDensity()" class="btn-primary">检测密度</button>
                            </div>
                            <div id="keyword-result" style="padding:16px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <p><strong>总字数：</strong><span id="total-words">0</span></p>
                                <p><strong>关键词密度：</strong></p>
                                <div id="density-list"></div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'Meta标签生成':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">Meta 标签生成</div>
                            <div style="margin-bottom:12px;">
                                <label>页面标题：</label>
                                <input type="text" id="meta-title" placeholder="输入页面标题" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>页面描述：</label>
                                <textarea id="meta-desc" placeholder="输入页面描述" style="width:100%;min-height:80px;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>关键词：</label>
                                <input type="text" id="meta-keywords" placeholder="输入关键词，用逗号分隔" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="generateMeta()" class="btn-primary">生成 Meta 标签</button>
                                <button onclick="copyMeta()" class="btn-secondary">复制代码</button>
                            </div>
                            <textarea id="meta-output" placeholder="Meta 标签代码将显示在这里" readonly style="width:100%;min-height:150px;padding:12px;font-family:monospace;font-size:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                        </div>
                    </div>
                `;
                break;
            case '在线记事本':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">在线记事本</div>
                            <div class="tool-buttons" style="margin-bottom:12px;">
                                <button onclick="notepadNew()" class="btn-primary">新建</button>
                                <button onclick="notepadSave()" class="btn-secondary">保存到本地</button>
                                <button onclick="notepadLoad()" class="btn-secondary">从本地加载</button>
                                <button onclick="notepadClear()" class="btn-secondary">清空</button>
                            </div>
                            <textarea id="notepad-content" placeholder="在这里记录你的想法..." style="width:100%;min-height:400px;padding:16px;font-size:14px;line-height:1.8;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);resize:vertical;"></textarea>
                            <div style="margin-top:8px;color:var(--text-dim);font-size:12px;">
                                字数：<span id="notepad-count">0</span> | 行数：<span id="notepad-lines">0</span>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '待办清单':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">待办清单</div>
                            <div style="display:flex;gap:12px;margin-bottom:16px;">
                                <input type="text" id="todo-input" placeholder="添加新的待办事项..." style="flex:1;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                <button onclick="addTodo()" class="btn-primary">添加</button>
                            </div>
                            <div class="tool-buttons" style="margin-bottom:12px;">
                                <button onclick="clearCompletedTodos()" class="btn-secondary">清除已完成</button>
                                <button onclick="clearAllTodos()" class="btn-secondary">清空全部</button>
                            </div>
                            <div id="todo-list" style="max-height:400px;overflow-y:auto;"></div>
                            <div style="margin-top:8px;color:var(--text-dim);font-size:12px;">
                                共 <span id="todo-total">0</span> 项，已完成 <span id="todo-done">0</span> 项
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '进制转换器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">进制转换器</div>
                            <div style="margin-bottom:12px;">
                                <label>输入数值：</label>
                                <input type="text" id="base-input" placeholder="输入数值" oninput="convertAllBases()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>输入进制：</label>
                                <select id="base-from" onchange="convertAllBases()" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                    <option value="2" style="background:#0f172a;color:#e2e8f0;">二进制 (2)</option>
                                    <option value="8" style="background:#0f172a;color:#e2e8f0;">八进制 (8)</option>
                                    <option value="10" selected style="background:#0f172a;color:#e2e8f0;">十进制 (10)</option>
                                    <option value="16" style="background:#0f172a;color:#e2e8f0;">十六进制 (16)</option>
                                </select>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div>
                                    <label>二进制：</label>
                                    <input type="text" id="base-bin" readonly style="width:100%;padding:10px;font-family:monospace;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                                <div>
                                    <label>八进制：</label>
                                    <input type="text" id="base-oct" readonly style="width:100%;padding:10px;font-family:monospace;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                                <div>
                                    <label>十进制：</label>
                                    <input type="text" id="base-dec" readonly style="width:100%;padding:10px;font-family:monospace;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                                <div>
                                    <label>十六进制：</label>
                                    <input type="text" id="base-hex" readonly style="width:100%;padding:10px;font-family:monospace;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'JSON转CSV':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">JSON 转 CSV</div>
                            <div class="json-panels">
                                <div class="json-panel">
                                    <label>JSON 数据</label>
                                    <textarea id="json2csv-input" placeholder='[{"name":"张三","age":25},{"name":"李四","age":30}]'></textarea>
                                </div>
                                <div class="json-panel">
                                    <label>CSV 结果</label>
                                    <textarea id="json2csv-output" placeholder="CSV结果将显示在这里" readonly></textarea>
                                </div>
                            </div>
                            <div class="tool-buttons" style="margin-top:20px;">
                                <button onclick="convertJsonToCsv()" class="btn-primary">转换</button>
                                <button onclick="copyJsonToCsv()" class="btn-secondary">复制</button>
                                <button onclick="downloadCsv()" class="btn-secondary">下载CSV</button>
                                <button onclick="clearJsonToCsv()" class="btn-secondary">清空</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'Cron表达式':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">Cron 表达式</div>
                            <div style="margin-bottom:16px;">
                                <label>Cron 表达式：</label>
                                <input type="text" id="cron-input" placeholder="* * * * *" oninput="parseCron()" style="width:100%;padding:12px;font-size:14px;font-family:monospace;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>常用示例：</label>
                                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                                    <button onclick="setCronPreset('everyMinute')" class="btn-preset">每分钟</button>
                                    <button onclick="setCronPreset('everyHour')" class="btn-preset">每小时</button>
                                    <button onclick="setCronPreset('everyDay')" class="btn-preset">每天0点</button>
                                    <button onclick="setCronPreset('everyWeek')" class="btn-preset">每周一0点</button>
                                    <button onclick="setCronPreset('everyMonth')" class="btn-preset">每月1号0点</button>
                                </div>
                            </div>
                            <div style="padding:16px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <p><strong>解析结果：</strong><span id="cron-result">请输入Cron表达式</span></p>
                                <p style="margin-top:8px;"><strong>下次执行时间：</strong></p>
                                <div id="cron-next-times" style="color:var(--text-dim);font-size:13px;"></div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '配色生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">配色生成器</div>
                            <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;">
                                <input type="color" id="palette-base" value="#6366f1" onchange="generatePalette()">
                                <button onclick="generateRandomPalette()" class="btn-secondary">随机配色</button>
                            </div>
                            <div id="palette-colors" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
                            <div class="tool-buttons">
                                <button onclick="copyPalette()" class="btn-secondary">复制色值</button>
                                <button onclick="exportPaletteCSS()" class="btn-secondary">导出CSS变量</button>
                            </div>
                            <textarea id="palette-output" readonly style="width:100%;min-height:80px;margin-top:12px;padding:12px;font-family:monospace;font-size:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                        </div>
                    </div>
                `;
                break;
            case 'SEO标题检测':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">SEO 标题检测</div>
                            <div style="margin-bottom:16px;">
                                <label>页面标题：</label>
                                <input type="text" id="seo-title-input" placeholder="输入要检测的标题" oninput="analyzeSEOTitle()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="padding:16px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                                <p><strong>标题长度：</strong><span id="seo-length">0</span> 字符</p>
                                <p><strong>像素宽度：</strong>约 <span id="seo-pixels">0</span>px</p>
                                <p><strong>评分：</strong><span id="seo-score">-</span></p>
                                <div id="seo-suggestions" style="margin-top:8px;color:var(--text-dim);font-size:13px;"></div>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'Sitemap生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">Sitemap 生成器</div>
                            <div style="margin-bottom:12px;">
                                <label>网站域名：</label>
                                <input type="text" id="sitemap-domain" placeholder="https://example.com" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>页面路径（每行一个）：</label>
                                <textarea id="sitemap-urls" placeholder="/\n/about\n/contact\n/blog/post-1" style="width:100%;min-height:150px;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="generateSitemap()" class="btn-primary">生成 Sitemap</button>
                                <button onclick="copySitemap()" class="btn-secondary">复制</button>
                                <button onclick="downloadSitemap()" class="btn-secondary">下载XML</button>
                            </div>
                            <textarea id="sitemap-output" readonly style="width:100%;min-height:200px;padding:12px;font-family:monospace;font-size:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                        </div>
                    </div>
                `;
                break;
            case 'Robots生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">Robots.txt 生成器</div>
                            <div style="margin-bottom:12px;">
                                <label><input type="checkbox" id="robots-allow-all" checked onchange="generateRobots()"> 允许所有爬虫</label>
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>禁止路径（每行一个）：</label>
                                <textarea id="robots-disallow" placeholder="/admin\n/api\n/private" style="width:100%;min-height:100px;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>Sitemap URL：</label>
                                <input type="text" id="robots-sitemap" placeholder="https://example.com/sitemap.xml" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons" style="margin-bottom:16px;">
                                <button onclick="generateRobots()" class="btn-primary">生成 Robots.txt</button>
                                <button onclick="copyRobots()" class="btn-secondary">复制</button>
                            </div>
                            <textarea id="robots-output" readonly style="width:100%;min-height:150px;padding:12px;font-family:monospace;font-size:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                        </div>
                    </div>
                `;
                break;
            case 'favicon生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">Favicon 生成器</div>
                            <div style="margin-bottom:16px;">
                                <label>上传图片：</label>
                                <input type="file" id="favicon-upload" accept="image/*" onchange="generateFavicon()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:16px;text-align:center;">
                                <canvas id="favicon-canvas" style="display:none;"></canvas>
                                <div id="favicon-preview" style="display:flex;gap:16px;justify-content:center;align-items:center;flex-wrap:wrap;"></div>
                            </div>
                            <div class="tool-buttons">
                                <button onclick="downloadFavicon(16)" class="btn-secondary">下载 16x16</button>
                                <button onclick="downloadFavicon(32)" class="btn-secondary">下载 32x32</button>
                                <button onclick="downloadFavicon(64)" class="btn-secondary">下载 64x64</button>
                                <button onclick="downloadFavicon(128)" class="btn-secondary">下载 128x128</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '图片压缩':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">图片压缩</div>
                            <div style="margin-bottom:16px;">
                                <label>上传图片：</label>
                                <input type="file" id="img-compress-upload" accept="image/*" onchange="loadCompressImage()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>压缩质量：<span id="compress-quality-val">80</span>%</label>
                                <input type="range" id="compress-quality" min="10" max="100" value="80" oninput="document.getElementById('compress-quality-val').textContent=this.value;previewCompress()" style="width:100%;">
                            </div>
                            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
                                <div style="flex:1;min-width:200px;">
                                    <p style="color:var(--text-dim);margin-bottom:8px;">原图</p>
                                    <div id="compress-original-preview" style="text-align:center;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);min-height:150px;display:flex;align-items:center;justify-content:center;">
                                        <span style="color:var(--text-dim);">请上传图片</span>
                                    </div>
                                    <p style="margin-top:4px;color:var(--text-dim);font-size:12px;">大小：<span id="compress-original-size">-</span></p>
                                </div>
                                <div style="flex:1;min-width:200px;">
                                    <p style="color:var(--text-dim);margin-bottom:8px;">压缩后</p>
                                    <div id="compress-result-preview" style="text-align:center;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);min-height:150px;display:flex;align-items:center;justify-content:center;">
                                        <span style="color:var(--text-dim);">-</span>
                                    </div>
                                    <p style="margin-top:4px;color:var(--text-dim);font-size:12px;">大小：<span id="compress-result-size">-</span></p>
                                </div>
                            </div>
                            <div class="tool-buttons">
                                <button onclick="downloadCompressed()" class="btn-primary">下载压缩图片</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '图片裁剪':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">图片裁剪</div>
                            <div style="margin-bottom:16px;">
                                <label>上传图片：</label>
                                <input type="file" id="img-crop-upload" accept="image/*" onchange="loadCropImage()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                                <div>
                                    <label>X: <input type="number" id="crop-x" value="0" min="0" style="width:80px;padding:6px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);"></label>
                                </div>
                                <div>
                                    <label>Y: <input type="number" id="crop-y" value="0" min="0" style="width:80px;padding:6px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);"></label>
                                </div>
                                <div>
                                    <label>宽: <input type="number" id="crop-w" value="200" min="1" style="width:80px;padding:6px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);"></label>
                                </div>
                                <div>
                                    <label>高: <input type="number" id="crop-h" value="200" min="1" style="width:80px;padding:6px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);"></label>
                                </div>
                            </div>
                            <div style="margin-bottom:16px;text-align:center;">
                                <canvas id="crop-canvas" style="max-width:100%;border-radius:8px;border:1px solid var(--border);"></canvas>
                            </div>
                            <div class="tool-buttons">
                                <button onclick="applyCrop()" class="btn-primary">裁剪</button>
                                <button onclick="downloadCropped()" class="btn-secondary">下载</button>
                            </div>
                            <div id="crop-result" style="margin-top:16px;text-align:center;"></div>
                        </div>
                    </div>
                `;
                break;
            case '图片格式转换':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">图片格式转换</div>
                            <div style="margin-bottom:16px;">
                                <label>上传图片：</label>
                                <input type="file" id="img-convert-upload" accept="image/*" onchange="loadConvertImage()" style="width:100%;padding:12px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>目标格式：</label>
                                <select id="convert-format" style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                    <option value="image/png">PNG</option>
                                    <option value="image/jpeg">JPEG</option>
                                    <option value="image/webp">WebP</option>
                                </select>
                            </div>
                            <div style="text-align:center;margin-bottom:16px;">
                                <div id="convert-preview" style="padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--card);min-height:150px;display:flex;align-items:center;justify-content:center;">
                                    <span style="color:var(--text-dim);">请上传图片</span>
                                </div>
                            </div>
                            <div class="tool-buttons">
                                <button onclick="convertImageFormat()" class="btn-primary">转换格式</button>
                                <button onclick="downloadConverted()" class="btn-secondary">下载</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case '简历生成器':
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <div class="tool-section-title">简历生成器</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                                <div>
                                    <label>姓名：</label>
                                    <input type="text" id="resume-name" placeholder="张三" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                                <div>
                                    <label>职位：</label>
                                    <input type="text" id="resume-title" placeholder="前端工程师" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                                <div>
                                    <label>电话：</label>
                                    <input type="text" id="resume-phone" placeholder="138xxxx" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                                <div>
                                    <label>邮箱：</label>
                                    <input type="text" id="resume-email" placeholder="example@mail.com" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                                </div>
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>个人简介：</label>
                                <textarea id="resume-summary" placeholder="简要介绍自己..." style="width:100%;min-height:80px;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>技能（逗号分隔）：</label>
                                <input type="text" id="resume-skills" placeholder="JavaScript, React, Node.js" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>工作经历（每行一条）：</label>
                                <textarea id="resume-experience" placeholder="2020-2023 XX公司 前端工程师&#10;负责XX项目开发..." style="width:100%;min-height:100px;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);"></textarea>
                            </div>
                            <div style="margin-bottom:12px;">
                                <label>教育背景：</label>
                                <input type="text" id="resume-education" placeholder="2016-2020 XX大学 计算机科学 本科" style="width:100%;padding:10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);">
                            </div>
                            <div class="tool-buttons">
                                <button onclick="generateResume()" class="btn-primary">生成简历</button>
                                <button onclick="printResume()" class="btn-secondary">打印</button>
                            </div>
                            <div id="resume-output" style="margin-top:16px;padding:24px;border-radius:8px;border:1px solid var(--border);background:var(--card);min-height:200px;"></div>
                        </div>
                    </div>
                `;
                break;
            default:
                toolContent = `
                    <div class="json-tool">
                        <div class="tool-section">
                            <p style="text-align: center; padding: 40px;">${tool.description}</p>
                        </div>
                    </div>
                `;
        }
        
        toolPage.innerHTML = `
            <div class="tool-header">
                <div class="tool-header-icon">${tool.icon}</div>
                <div class="tool-header-info">
                    <h1>${tool.name}</h1>
                    <p>${tool.description}</p>
                </div>
                <div class="tool-header-actions">
                    <button class="btn-back" onclick="goBack()">← 返回</button>
                    <button class="btn-favorite ${isFav?'active':''}" onclick="togglePageFav(${tool.id}, this)">${isFav?'★ 已收藏':'☆ 收藏'}</button>
                </div>
            </div>
            <div class="tool-content">
                ${toolContent}
            </div>
        `;
        
        // 禁用滚动导航监听（避免工具页面触发滚动导航）
        window.scrollNavDisabled = true;
        
        // 在DOM更新后滚动到顶部
        setTimeout(() => {
            // 滚动工具容器到顶部
            const toolsBox = document.querySelector('.tools-box');
            if (toolsBox) {
                toolsBox.scrollTop = 0;
            }
            window.scrollTo(0, 0);
        }, 10);
        
        // 初始化工具
        setTimeout(() => {
            if (tool.name === '时间戳转换') {
                updateCurrentTime();
                setInterval(updateCurrentTime, 1000);
            }
            if (tool.name === '颜色转换') {
                updateColorFromPicker();
            }
        }, 100);
    }
    
    function goBack() {
        // 重置 SEO 标签为首页
        resetSEOTags();
        
        // 重新启用滚动导航
        window.scrollNavDisabled = false;
        
        document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
        
        // 获取当前工具的分类ID
        const categoryId = window.currentToolCategoryId;
        
        console.log('goBack - categoryId:', categoryId);
        
        // 返回首页布局（显示所有分类的工具）
        document.getElementById('view-all').classList.add('active');
        
        // 如果有分类信息，激活对应的导航项并滚动到对应位置
        if (categoryId && categoryId > 0 && categoryId !== 'undefined' && categoryId !== 'null') {
            const targetNav = document.querySelector('.nav-item[data-category-id="' + categoryId + '"]');
            console.log('goBack - targetNav:', targetNav);
            
            if (targetNav) {
                targetNav.classList.add('active');
            }
            
            // 滚动到对应分类区域（包含标题），居中显示确保标题可见
            const categorySection = document.getElementById('cat-section_' + categoryId);
            if (categorySection) {
                categorySection.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
        } else {
            // 默认激活第一个导航项
            document.querySelector('.nav-item').classList.add('active');
            
            // 滚动到页面顶部
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
        
        // 清除保存的分类信息
        window.currentToolCategoryId = null;
    }
    
    function togglePageFav(id, btn) {
        const tool = tools.find(x=>x.id===id);
        if(!tool) return;
        
        if(favorites.has(id)){
            favorites.delete(id); 
            btn.classList.remove('active');
            btn.textContent='☆ 收藏';
        } else {
            favorites.add(id); 
            btn.classList.add('active');
            btn.textContent='★ 已收藏';
        }
        saveFav();
        updateBadge();
    }
    
    // JSON 格式化工具
    function formatJson() {
        const input = document.getElementById('json-input').value;
        try {
            const obj = JSON.parse(input);
            document.getElementById('json-output').value = JSON.stringify(obj, null, 4);
        } catch (e) {
            alert('JSON 格式错误: ' + e.message);
        }
    }
    
    function compressJson() {
        const input = document.getElementById('json-input').value;
        try {
            const obj = JSON.parse(input);
            document.getElementById('json-output').value = JSON.stringify(obj);
        } catch (e) {
            alert('JSON 格式错误: ' + e.message);
        }
    }
    
    function copyJson() {
        const output = document.getElementById('json-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    function clearJson() {
        document.getElementById('json-input').value = '';
        document.getElementById('json-output').value = '';
    }
    
    // Base64 编解码
    function encodeBase64() {
        const input = document.getElementById('base64-input').value;
        try {
            document.getElementById('base64-output').value = btoa(unescape(encodeURIComponent(input)));
        } catch (e) {
            alert('编码失败: ' + e.message);
        }
    }
    
    function decodeBase64() {
        const input = document.getElementById('base64-input').value;
        try {
            document.getElementById('base64-output').value = decodeURIComponent(escape(atob(input)));
        } catch (e) {
            alert('解码失败: ' + e.message);
        }
    }
    
    function copyBase64() {
        const output = document.getElementById('base64-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    function clearBase64() {
        document.getElementById('base64-input').value = '';
        document.getElementById('base64-output').value = '';
    }
    
    // URL 编码解码
    function encodeUrl() {
        const input = document.getElementById('url-input').value;
        if (input) {
            document.getElementById('url-output').value = encodeURIComponent(input);
        }
    }
    
    function decodeUrl() {
        const input = document.getElementById('url-input').value;
        if (input) {
            try {
                document.getElementById('url-output').value = decodeURIComponent(input);
            } catch (e) {
                alert('URL 解码失败');
            }
        }
    }
    
    function copyUrl() {
        const output = document.getElementById('url-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    function clearUrl() {
        document.getElementById('url-input').value = '';
        document.getElementById('url-output').value = '';
    }
    
    // MD5 加密（简化版）
    function md5Encrypt() {
        const input = document.getElementById('md5-input').value;
        if (input) {
            document.getElementById('md5-output').value = md5(input);
        }
    }
    
    function md5(str) {
        const rotateLeft = (n, s) => (n << s) | (n >>> (32 - s));
        const toHex = (n) => {
            let hexChars = '0123456789abcdef';
            let result = '';
            for (let i = 0; i < 4; i++) {
                result += hexChars[(n >> (i * 8)) & 0xff];
            }
            return result;
        };
        
        const s = [
            7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
            5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
            4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
            6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
        ];
        const K = [];
        for (let i = 0; i < 64; i++) {
            K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
        }
        
        let a0 = 0x67452301;
        let b0 = 0xEFCDAB89;
        let c0 = 0x98BADCFE;
        let d0 = 0x10325476;
        
        const originalLengthBits = str.length * 8;
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) & 0xff);
        }
        
        bytes.push(0x80);
        while ((bytes.length * 8) % 512 !== 448) {
            bytes.push(0x00);
        }
        
        for (let i = 0; i < 8; i++) {
            bytes.push((originalLengthBits >>> (i * 8)) & 0xff);
        }
        
        for (let i = 0; i < bytes.length; i += 64) {
            const M = [];
            for (let j = 0; j < 16; j++) {
                M[j] = bytes[i + j * 4] |
                        (bytes[i + j * 4 + 1] << 8) |
                        (bytes[i + j * 4 + 2] << 16) |
                        (bytes[i + j * 4 + 3] << 24);
            }
            
            let A = a0, B = b0, C = c0, D = d0;
            
            for (let j = 0; j < 64; j++) {
                let F, g;
                if (j < 16) {
                    F = (B & C) | (~B & D);
                    g = j;
                } else if (j < 32) {
                    F = (D & B) | (~D & C);
                    g = (5 * j + 1) % 16;
                } else if (j < 48) {
                    F = B ^ C ^ D;
                    g = (3 * j + 5) % 16;
                } else {
                    F = C ^ (B | ~D);
                    g = (7 * j) % 16;
                }
                
                const dTemp = D;
                D = C;
                C = B;
                B = (B + rotateLeft((A + F + K[j] + M[g]) >>> 0, s[j])) >>> 0;
                A = dTemp;
            }
            
            a0 = (a0 + A) >>> 0;
            b0 = (b0 + B) >>> 0;
            c0 = (c0 + C) >>> 0;
            d0 = (d0 + D) >>> 0;
        }
        
        return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
    }
    
    function copyMd5() {
        const output = document.getElementById('md5-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    function clearMd5() {
        document.getElementById('md5-input').value = '';
        document.getElementById('md5-output').value = '';
    }
    
    // 正则表达式测试
    function setRegexPreset(type) {
        const presets = {
            phone: { pattern: '/^1[3-9]\\d{9}$/', text: '13800138000' },
            email: { pattern: '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/', text: 'example@mail.com' },
            idcard: { pattern: '/^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$/', text: '110101199001011234' },
            url: { pattern: '/^https?:\\/\\/[\\w.-]+(:\\d+)?(\\/[\\w./%-]*)?$/', text: 'https://www.example.com/path' },
            ip: { pattern: '/^((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)$/', text: '192.168.1.1' },
            date: { pattern: '/^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/', text: '2024-01-15' },
            chinese: { pattern: '/[\\u4e00-\\u9fa5]/', text: 'Hello世界Test' },
            number: { pattern: '/^-?\\d+(\\.\\d+)?$/', text: '123.45' },
            qq: { pattern: '/^[1-9]\\d{4,10}$/', text: '123456789' },
            postcode: { pattern: '/^[1-9]\\d{5}$/', text: '100000' }
        };
        
        const preset = presets[type];
        if (preset) {
            document.getElementById('regex-pattern').value = preset.pattern;
            document.getElementById('regex-text').value = preset.text;
            
            // 移除所有按钮的高亮状态
            document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的高亮状态
            document.querySelector(`.btn-preset[data-preset="${type}"]`)?.classList.add('active');
            
            testRegex();
        }
    }
    
    function testRegex() {
        const pattern = document.getElementById('regex-pattern').value;
        const text = document.getElementById('regex-text').value;
        
        if (!pattern) {
            alert('请输入正则表达式');
            return;
        }
        
        try {
            const regex = new RegExp(pattern.replace(/^\/|\/[gimsuy]*$/g, ''), pattern.match(/\/([gimsuy]*)$/)?.[1] || 'g');
            const matches = text.match(regex);
            document.getElementById('regex-result').value = matches ? matches.join('\n') : '没有匹配结果';
        } catch (e) {
            alert('正则表达式语法错误: ' + e.message);
        }
    }
    
    function clearRegex() {
        document.getElementById('regex-pattern').value = '';
        document.getElementById('regex-text').value = '';
        document.getElementById('regex-result').value = '';
        // 清空时移除所有按钮的高亮状态
        document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
    }
    
    // SQL 格式化（简化版）
    function formatSql() {
        const input = document.getElementById('sql-input').value;
        if (!input) return;
        
        let formatted = input
            .replace(/\s+/g, ' ')
            .replace(/SELECT/i, '\nSELECT')
            .replace(/FROM/i, '\nFROM')
            .replace(/WHERE/i, '\nWHERE')
            .replace(/AND/i, '\n    AND')
            .replace(/OR/i, '\n    OR')
            .replace(/ORDER BY/i, '\nORDER BY')
            .replace(/GROUP BY/i, '\nGROUP BY')
            .replace(/HAVING/i, '\nHAVING')
            .replace(/LIMIT/i, '\nLIMIT')
            .replace(/INSERT INTO/i, '\nINSERT INTO')
            .replace(/VALUES/i, '\nVALUES')
            .replace(/UPDATE/i, '\nUPDATE')
            .replace(/SET/i, '\nSET')
            .replace(/DELETE/i, '\nDELETE')
            .replace(/JOIN/i, '\nJOIN')
            .replace(/LEFT JOIN/i, '\nLEFT JOIN')
            .replace(/RIGHT JOIN/i, '\nRIGHT JOIN')
            .replace(/INNER JOIN/i, '\nINNER JOIN')
            .replace(/ON /i, '\n    ON ')
            .trim();
        
        document.getElementById('sql-output').value = formatted;
    }
    
    function copySql() {
        const output = document.getElementById('sql-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    function clearSql() {
        document.getElementById('sql-input').value = '';
        document.getElementById('sql-output').value = '';
    }
    
    // 单位换算
    function updateUnitOptions() {
        const type = document.getElementById('unit-type').value;
        const fromSelect = document.getElementById('unit-from');
        const toSelect = document.getElementById('unit-to');
        
        const units = {
            length: [
                { value: 'm', label: '米 (m)' },
                { value: 'km', label: '千米 (km)' },
                { value: 'cm', label: '厘米 (cm)' },
                { value: 'mm', label: '毫米 (mm)' },
                { value: 'in', label: '英寸 (in)' },
                { value: 'ft', label: '英尺 (ft)' },
                { value: 'yd', label: '码 (yd)' },
                { value: 'mi', label: '英里 (mi)' }
            ],
            weight: [
                { value: 'kg', label: '千克 (kg)' },
                { value: 'g', label: '克 (g)' },
                { value: 'mg', label: '毫克 (mg)' },
                { value: 'lb', label: '磅 (lb)' },
                { value: 'oz', label: '盎司 (oz)' }
            ],
            volume: [
                { value: 'l', label: '升 (L)' },
                { value: 'ml', label: '毫升 (mL)' },
                { value: 'gal', label: '加仑 (gal)' },
                { value: 'qt', label: '夸脱 (qt)' },
                { value: 'pt', label: '品脱 (pt)' }
            ],
            temperature: [
                { value: 'c', label: '摄氏度 (°C)' },
                { value: 'f', label: '华氏度 (°F)' },
                { value: 'k', label: '开尔文 (K)' }
            ]
        };
        
        const options = units[type] || units.length;
        fromSelect.innerHTML = options.map(u => `<option value="${u.value}">${u.label}</option>`).join('');
        toSelect.innerHTML = options.map(u => `<option value="${u.value}">${u.label}</option>`).join('');
    }
    
    function convertUnit() {
        const type = document.getElementById('unit-type').value;
        const input = parseFloat(document.getElementById('unit-input').value);
        const from = document.getElementById('unit-from').value;
        const to = document.getElementById('unit-to').value;
        
        if (isNaN(input)) {
            alert('请输入有效数值');
            return;
        }
        
        let result;
        
        if (type === 'length') {
            const meters = toMeters(input, from);
            result = fromMeters(meters, to);
        } else if (type === 'weight') {
            const kg = toKg(input, from);
            result = fromKg(kg, to);
        } else if (type === 'volume') {
            const l = toLiters(input, from);
            result = fromLiters(l, to);
        } else if (type === 'temperature') {
            result = convertTemp(input, from, to);
        }
        
        document.getElementById('unit-output').value = result.toFixed(4);
    }
    
    function toMeters(value, unit) {
        const factors = { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 };
        return value * factors[unit];
    }
    
    function fromMeters(value, unit) {
        const factors = { m: 1, km: 0.001, cm: 100, mm: 1000, in: 39.3701, ft: 3.28084, yd: 1.09361, mi: 0.000621371 };
        return value * factors[unit];
    }
    
    function toKg(value, unit) {
        const factors = { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495 };
        return value * factors[unit];
    }
    
    function fromKg(value, unit) {
        const factors = { kg: 1, g: 1000, mg: 1000000, lb: 2.20462, oz: 35.274 };
        return value * factors[unit];
    }
    
    function toLiters(value, unit) {
        const factors = { l: 1, ml: 0.001, gal: 3.78541, qt: 0.946353, pt: 0.473176 };
        return value * factors[unit];
    }
    
    function fromLiters(value, unit) {
        const factors = { l: 1, ml: 1000, gal: 0.264172, qt: 1.05669, pt: 2.11338 };
        return value * factors[unit];
    }
    
    function convertTemp(value, from, to) {
        if (from === to) return value;
        
        let c;
        if (from === 'c') c = value;
        else if (from === 'f') c = (value - 32) * 5 / 9;
        else if (from === 'k') c = value - 273.15;
        
        if (to === 'c') return c;
        else if (to === 'f') return c * 9 / 5 + 32;
        else if (to === 'k') return c + 273.15;
    }
    
    function swapUnits() {
        const from = document.getElementById('unit-from');
        const to = document.getElementById('unit-to');
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
    }
    
    // 汇率换算（使用固定汇率）
    function convertCurrency() {
        const amount = parseFloat(document.getElementById('currency-input').value);
        const from = document.getElementById('currency-from').value;
        const to = document.getElementById('currency-to').value;
        
        if (isNaN(amount)) {
            alert('请输入有效金额');
            return;
        }
        
        const rates = {
            CNY: { CNY: 1, USD: 0.1389, EUR: 0.1278, GBP: 0.1097, JPY: 21.52, KRW: 193.5, HKD: 1.082, TWD: 4.418 },
            USD: { CNY: 7.199, EUR: 0.9199, GBP: 0.7899, JPY: 154.9, KRW: 1393, HKD: 7.800, TWD: 31.81 },
            EUR: { CNY: 7.817, USD: 1.087, GBP: 0.8585, JPY: 168.4, KRW: 1516, HKD: 8.498, TWD: 34.57 },
            GBP: { CNY: 9.114, USD: 1.266, EUR: 1.165, JPY: 195.8, KRW: 1767, HKD: 9.896, TWD: 40.27 },
            JPY: { CNY: 0.0465, USD: 0.00646, EUR: 0.00594, GBP: 0.00511, KRW: 8.991, HKD: 0.0503, TWD: 0.205 },
            KRW: { CNY: 0.00517, USD: 0.000718, EUR: 0.000659, GBP: 0.000566, JPY: 0.111, HKD: 0.00559, TWD: 0.0228 },
            HKD: { CNY: 0.924, USD: 0.1282, EUR: 0.1177, GBP: 0.1011, JPY: 19.93, KRW: 179.1, TWD: 4.083 },
            TWD: { CNY: 0.226, USD: 0.0314, EUR: 0.0289, GBP: 0.0248, JPY: 4.878, KRW: 43.86, HKD: 0.245 }
        };
        
        const rate = rates[from]?.[to] || 1;
        document.getElementById('currency-output').value = (amount * rate).toFixed(2);
    }
    
    function swapCurrency() {
        const from = document.getElementById('currency-from');
        const to = document.getElementById('currency-to');
        const temp = from.value;
        from.value = to.value;
        to.value = temp;
    }
    
    // 日期计算器
    function calcDateDiff() {
        const start = new Date(document.getElementById('date-start').value);
        const end = new Date(document.getElementById('date-end').value);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            alert('请选择有效日期');
            return;
        }
        
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let workdays = 0;
        const minDate = start < end ? start : end;
        const maxDate = start > end ? start : end;
        
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) workdays++;
        }
        
        document.getElementById('date-result').textContent = diffDays;
        document.getElementById('workdays-result').textContent = workdays;
    }
    
    function addDays() {
        const start = new Date(document.getElementById('date-start').value);
        const days = parseInt(document.getElementById('unit-input')?.value || 0);
        
        if (isNaN(start.getTime())) {
            alert('请选择起始日期');
            return;
        }
        
        start.setDate(start.getDate() + days);
        document.getElementById('date-end').value = start.toISOString().split('T')[0];
        calcDateDiff();
    }
    
    // 年龄计算器
    function calcAge() {
        const birthday = new Date(document.getElementById('birthday-input').value);
        if (isNaN(birthday.getTime())) {
            alert('请选择出生日期');
            return;
        }
        
        const today = new Date();
        let age = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
            age--;
        }
        
        const daysAlive = Math.floor((today - birthday) / (1000 * 60 * 60 * 24));
        
        const zodiacs = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'];
        const zodiac = zodiacs[(birthday.getFullYear() - 1908) % 12];
        
        const constellations = [
            { name: '水瓶座', start: [1, 20], end: [2, 18] },
            { name: '双鱼座', start: [2, 19], end: [3, 20] },
            { name: '白羊座', start: [3, 21], end: [4, 19] },
            { name: '金牛座', start: [4, 20], end: [5, 20] },
            { name: '双子座', start: [5, 21], end: [6, 21] },
            { name: '巨蟹座', start: [6, 22], end: [7, 22] },
            { name: '狮子座', start: [7, 23], end: [8, 22] },
            { name: '处女座', start: [8, 23], end: [9, 22] },
            { name: '天秤座', start: [9, 23], end: [10, 23] },
            { name: '天蝎座', start: [10, 24], end: [11, 22] },
            { name: '射手座', start: [11, 23], end: [12, 21] },
            { name: '摩羯座', start: [12, 22], end: [1, 19] }
        ];
        
        let constellation = '未知';
        const month = birthday.getMonth() + 1;
        const day = birthday.getDate();
        
        for (const c of constellations) {
            if ((month === c.start[0] && day >= c.start[1]) ||
                (month === c.end[0] && day <= c.end[1])) {
                constellation = c.name;
                break;
            }
        }
        
        document.getElementById('age-result').textContent = age;
        document.getElementById('zodiac-result').textContent = zodiac;
        document.getElementById('constellation-result').textContent = constellation;
        document.getElementById('days-alive').textContent = daysAlive;
    }
    
    // 二维码生成（使用正确的QR Code算法）
    function generateQRCode() {
        const text = document.getElementById('qrcode-input').value;
        const size = parseInt(document.getElementById('qrcode-size').value);
        
        if (!text) {
            alert('请输入内容');
            return;
        }
        
        const qrcode = document.getElementById('qrcode');
        qrcode.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // 生成QR码数据
        const qr = QRCode.encodeText(text, QRCode.ErrorCorrectionLevel.M);
        const modules = qr.modules;
        const moduleCount = modules.length;
        
        // 计算模块大小和边距
        const margin = 4;
        const totalModules = moduleCount + margin * 2;
        const moduleSize = size / totalModules;
        
        // 填充白色背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        
        // 绘制QR码模块
        ctx.fillStyle = '#000000';
        for (let y = 0; y < moduleCount; y++) {
            for (let x = 0; x < moduleCount; x++) {
                if (modules[y][x]) {
                    const px = (x + margin) * moduleSize;
                    const py = (y + margin) * moduleSize;
                    ctx.fillRect(px, py, moduleSize - 0.5, moduleSize - 0.5);
                }
            }
        }
        
        qrcode.appendChild(canvas);
        qrcode.canvas = canvas;
    }
    
    // QR Code 生成库
    const QRCode = (function() {
        const PAD0 = 0xEC;
        const PAD1 = 0x11;
        
        const ErrorCorrectionLevel = {
            L: 1, M: 0, Q: 3, H: 2
        };
        
        const RS_BLOCKS = [
            // L
            [[1, 26, 19], [1, 44, 34], [1, 70, 55], [1, 100, 77], [1, 134, 108], [2, 86, 68], [2, 98, 78], [2, 121, 97], [2, 146, 116], [2, 86, 68], [2, 98, 78], [2, 121, 97], [2, 146, 116], [3, 107, 85], [3, 120, 96], [3, 141, 113], [3, 162, 130], [4, 115, 91], [4, 134, 107], [4, 154, 122], [4, 174, 138], [5, 100, 80], [5, 118, 94], [5, 138, 110], [5, 158, 126], [6, 113, 90], [6, 131, 105], [6, 151, 121], [6, 171, 137], [7, 127, 101], [7, 146, 116], [7, 166, 132], [8, 145, 115], [8, 164, 130], [9, 139, 111], [9, 158, 126], [10, 152, 121], [10, 171, 137]],
            // M
            [[1, 19, 15], [1, 34, 26], [1, 55, 44], [1, 80, 64], [1, 108, 86], [2, 68, 54], [2, 78, 62], [2, 97, 77], [4, 43, 34], [2, 73, 58], [2, 87, 69], [2, 106, 84], [2, 127, 101], [3, 79, 63], [3, 90, 72], [3, 101, 81], [3, 115, 92], [4, 87, 69], [4, 98, 78], [4, 110, 88], [4, 122, 97], [5, 93, 74], [5, 106, 85], [5, 119, 95], [5, 132, 105], [6, 99, 79], [6, 114, 91], [6, 127, 102], [6, 142, 113], [7, 113, 90], [7, 128, 102], [7, 143, 114], [8, 121, 97], [8, 136, 109], [9, 130, 104], [9, 145, 116], [10, 139, 111], [10, 154, 123]],
            // Q
            [[1, 16, 12], [1, 28, 22], [1, 44, 36], [2, 32, 26], [2, 48, 38], [2, 42, 34], [2, 56, 44], [2, 70, 56], [2, 46, 36], [4, 36, 28], [4, 46, 36], [4, 56, 44], [2, 68, 52], [4, 49, 38], [2, 60, 46], [4, 54, 42], [4, 64, 50], [4, 58, 46], [4, 68, 54], [4, 78, 62], [6, 46, 36], [6, 54, 42], [6, 64, 50], [6, 70, 56], [4, 74, 58], [6, 62, 48], [6, 72, 56], [8, 64, 50], [8, 72, 56], [8, 80, 64], [8, 88, 70], [10, 76, 60], [10, 84, 66], [10, 92, 72], [11, 86, 68], [11, 94, 74]],
            // H
            [[1, 13, 9], [1, 22, 16], [2, 18, 14], [2, 26, 20], [2, 36, 28], [4, 24, 18], [4, 28, 22], [2, 38, 30], [4, 32, 24], [2, 46, 36], [4, 36, 28], [4, 40, 32], [4, 48, 38], [4, 38, 30], [4, 46, 36], [6, 40, 32], [6, 44, 34], [4, 50, 38], [6, 46, 36], [6, 50, 38], [6, 54, 42], [8, 46, 36], [8, 50, 38], [8, 54, 42], [8, 58, 46], [8, 62, 48], [10, 54, 42], [10, 58, 46], [10, 62, 48], [12, 58, 46], [12, 62, 48], [12, 66, 52], [14, 66, 52], [14, 70, 56], [14, 74, 58], [16, 70, 56], [16, 74, 58]]
        ];
        
        function encodeText(text, ecLevel) {
            let data = [];
            const mode = detectMode(text);
            
            // 添加模式指示符
            data.push(mode);
            
            // 添加字符计数
            const count = text.length;
            const countBits = mode === 0x04 ? (count < 10 ? 3 : 4) : (mode === 0x02 ? 8 : 16);
            for (let i = countBits - 1; i >= 0; i--) {
                data.push((count >> i) & 1);
            }
            
            // 添加数据
            if (mode === 0x04) { // Numeric
                for (let i = 0; i < text.length; i += 3) {
                    const num = parseInt(text.substr(i, 3));
                    if (num < 10) {
                        appendBits(data, num, 4);
                    } else if (num < 100) {
                        appendBits(data, num, 7);
                    } else {
                        appendBits(data, num, 10);
                    }
                }
            } else if (mode === 0x02) { // Alphanumeric
                const alphanumericTable = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
                for (let i = 0; i < text.length; i += 2) {
                    const c1 = alphanumericTable.indexOf(text[i]);
                    const c2 = i + 1 < text.length ? alphanumericTable.indexOf(text[i + 1]) : 0;
                    const val = c1 * 45 + c2;
                    appendBits(data, val, 11);
                }
            } else { // Byte
                for (let i = 0; i < text.length; i++) {
                    appendBits(data, text.charCodeAt(i), 8);
                }
            }
            
            // 添加终止符
            for (let i = 0; i < 4 && data.length % 8 !== 0; i++) {
                data.push(0);
            }
            
            // 填充
            const version = getVersion(data.length / 8, ecLevel);
            const totalBytes = getTotalBytes(version, ecLevel);
            const dataBytes = getDataBytes(version, ecLevel);
            
            while (data.length / 8 < dataBytes) {
                appendBits(data, PAD0, 8);
                if (data.length / 8 < dataBytes) {
                    appendBits(data, PAD1, 8);
                }
            }
            
            // 添加纠错码
            const ecc = generateECC(data, version, ecLevel);
            data = data.concat(ecc);
            
            // 转换为矩阵
            return createQRCode(data, version, ecLevel);
        }
        
        function detectMode(text) {
            const numeric = /^[0-9]*$/;
            const alphanumeric = /^[0-9A-Z $%*+\-.\/:]*$/;
            
            if (numeric.test(text)) return 0x04;
            if (alphanumeric.test(text)) return 0x02;
            return 0x08;
        }
        
        function appendBits(arr, val, bits) {
            for (let i = bits - 1; i >= 0; i--) {
                arr.push((val >> i) & 1);
            }
        }
        
        function getVersion(dataLength, ecLevel) {
            const versions = [
                [0, 0, 0, 0], [26, 20, 16, 13], [44, 34, 28, 22], [70, 55, 44, 34], [100, 80, 64, 48],
                [134, 108, 86, 62], [178, 142, 110, 80], [224, 178, 138, 98], [272, 216, 166, 122],
                [322, 258, 200, 146], [374, 296, 234, 172], [428, 340, 272, 200], [484, 386, 312, 230],
                [542, 434, 354, 262], [602, 486, 398, 296], [664, 540, 444, 332], [728, 596, 492, 370],
                [794, 654, 542, 410], [862, 714, 594, 452], [932, 778, 648, 496]
            ];
            for (let v = 1; v <= 40; v++) {
                if (dataLength <= versions[v][ecLevel]) return v;
            }
            return 40;
        }
        
        function getTotalBytes(version, ecLevel) {
            const blocks = RS_BLOCKS[ecLevel][version - 1];
            let total = 0;
            for (let i = 0; i < blocks.length; i += 3) {
                total += blocks[i] * blocks[i + 1];
            }
            return total;
        }
        
        function getDataBytes(version, ecLevel) {
            const blocks = RS_BLOCKS[ecLevel][version - 1];
            let total = 0;
            for (let i = 0; i < blocks.length; i += 3) {
                total += blocks[i] * blocks[i + 2];
            }
            return total;
        }
        
        function generateECC(data, version, ecLevel) {
            const blocks = RS_BLOCKS[ecLevel][version - 1];
            const dataBytes = getDataBytes(version, ecLevel);
            const totalBytes = getTotalBytes(version, ecLevel);
            const eccBytes = totalBytes - dataBytes;
            
            const ecc = [];
            const blockCount = blocks[0];
            const blockSize = blocks[1];
            const dataPerBlock = blocks[2];
            
            for (let b = 0; b < blockCount; b++) {
                const start = b * dataPerBlock * 8;
                const end = start + dataPerBlock * 8;
                const blockData = data.slice(start, end);
                
                const poly = generatePolynomial(eccBytes / blockCount);
                const code = rsEncode(blockData, poly);
                ecc.push(...code);
            }
            
            return ecc;
        }
        
        function generatePolynomial(degree) {
            let poly = [1];
            for (let i = 0; i < degree; i++) {
                poly = multiplyPolynomial(poly, [1, pow(2, i)]);
            }
            return poly;
        }
        
        function multiplyPolynomial(a, b) {
            const result = new Array(a.length + b.length - 1).fill(0);
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < b.length; j++) {
                    result[i + j] ^= a[i] & b[j];
                }
            }
            return result;
        }
        
        function pow(a, b) {
            let result = 1;
            for (let i = 0; i < b; i++) {
                result = (result << 1) ^ (result & 0x80 ? 0x11D : 0);
            }
            return result;
        }
        
        function rsEncode(data, poly) {
            const code = new Array(poly.length - 1).fill(0);
            for (let i = 0; i < data.length; i += 8) {
                let byte = 0;
                for (let j = 0; j < 8; j++) {
                    byte = (byte << 1) | (data[i + j] || 0);
                }
                
                let feedback = byte ^ code[0];
                code.shift();
                code.push(0);
                
                for (let j = 0; j < code.length; j++) {
                    code[j] ^= poly[j + 1] & feedback;
                }
            }
            
            const result = [];
            for (const byte of code) {
                appendBits(result, byte, 8);
            }
            return result;
        }
        
        function createQRCode(data, version, ecLevel) {
            const size = version * 4 + 17;
            const modules = new Array(size).fill(null).map(() => new Array(size).fill(false));
            
            // 添加定位图案
            addPositionDetectionPatterns(modules, size);
            
            // 添加分隔符
            addSeparators(modules, size);
            
            // 添加对齐图案
            if (version > 1) {
                addAlignmentPatterns(modules, version, size);
            }
            
            // 添加定时图案
            addTimingPatterns(modules, size);
            
            // 添加格式信息
            addFormatInfo(modules, ecLevel, 0, size);
            
            // 添加版本信息
            if (version > 6) {
                addVersionInfo(modules, version, size);
            }
            
            // 填充数据
            fillData(modules, data, size);
            
            return { modules, version, ecLevel };
        }
        
        function addPositionDetectionPatterns(modules, size) {
            const positions = [[0, 0], [0, size - 7], [size - 7, 0]];
            
            for (const [row, col] of positions) {
                for (let i = -1; i <= 7; i++) {
                    for (let j = -1; j <= 7; j++) {
                        if (row + i >= 0 && row + i < size && col + j >= 0 && col + j < size) {
                            const isBorder = i === -1 || i === 7 || j === -1 || j === 7;
                            const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
                            modules[row + i][col + j] = isBorder || isInner;
                        }
                    }
                }
            }
        }
        
        function addSeparators(modules, size) {
            const positions = [[7, 0], [0, 7], [7, size - 8], [size - 8, 7]];
            
            for (const [row, col] of positions) {
                for (let i = 0; i < 8; i++) {
                    if (row + i < size && !modules[row + i][col]) {
                        modules[row + i][col] = false;
                    }
                    if (col + i < size && !modules[row][col + i]) {
                        modules[row][col + i] = false;
                    }
                }
            }
        }
        
        function addAlignmentPatterns(modules, version, size) {
            const positions = getAlignmentPositions(version);
            
            for (const i of positions) {
                for (const j of positions) {
                    if ((i === 6 && j === 6) || (i === 6 && j === size - 7) || (i === size - 7 && j === 6)) {
                        continue;
                    }
                    for (let di = -2; di <= 2; di++) {
                        for (let dj = -2; dj <= 2; dj++) {
                            const isCenter = di === 0 && dj === 0;
                            const isBorder = di === -2 || di === 2 || dj === -2 || dj === 2;
                            modules[i + di][j + dj] = isCenter || isBorder;
                        }
                    }
                }
            }
        }
        
        function getAlignmentPositions(version) {
            const positions = [
                [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
                [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
                [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
                [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
                [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
                [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
                [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
                [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 34, 58, 82, 106, 130, 154],
                [6, 30, 56, 82, 108, 134, 158], [6, 34, 60, 86, 112, 138, 162]
            ];
            return positions[version - 1] || [];
        }
        
        function addTimingPatterns(modules, size) {
            for (let i = 8; i < size - 8; i++) {
                if (!modules[6][i]) {
                    modules[6][i] = i % 2 === 0;
                }
                if (!modules[i][6]) {
                    modules[i][6] = i % 2 === 0;
                }
            }
        }
        
        function addFormatInfo(modules, ecLevel, mask, size) {
            const data = (ecLevel << 3) | mask;
            const polynomial = 0x537;
            let code = data << 10;
            
            while (countBits(code) > 10) {
                code = (code << 1) ^ (countBits(code) === 15 ? polynomial : 0);
            }
            
            code = ((data << 10) | code) ^ 0x5412;
            
            for (let i = 0; i < 15; i++) {
                const bit = (code >> i) & 1;
                if (i < 6) {
                    modules[i][8] = bit;
                } else if (i < 8) {
                    modules[i + 1][8] = bit;
                } else {
                    modules[size - 15 + i][8] = bit;
                }
                
                if (i < 8) {
                    modules[8][size - 1 - i] = bit;
                } else if (i < 9) {
                    modules[8][15 - i] = bit;
                } else {
                    modules[8][size - 16 + i] = bit;
                }
            }
        }
        
        function countBits(n) {
            let count = 0;
            while (n) {
                count++;
                n >>= 1;
            }
            return count;
        }
        
        function addVersionInfo(modules, version, size) {
            const polynomial = 0x1F25;
            let code = version << 12;
            
            while (countBits(code) > 12) {
                code = (code << 1) ^ (countBits(code) === 17 ? polynomial : 0);
            }
            
            code = (version << 12) | code;
            
            for (let i = 0; i < 18; i++) {
                const bit = (code >> i) & 1;
                const row = Math.floor(i / 3);
                const col = i % 3;
                modules[size - 11 + row][col] = bit;
                modules[col][size - 11 + row] = bit;
            }
        }
        
        function fillData(modules, data, size) {
            let bitIndex = 0;
            let direction = -1;
            
            for (let col = size - 1; col >= 0; col -= 2) {
                if (col === 6) col--;
                
                for (let row = direction === 1 ? 0 : size - 1; row >= 0 && row < size; row += direction) {
                    for (let k = 0; k < 2; k++) {
                        const c = col - k;
                        if (c < 0) continue;
                        
                        if (!modules[row][c]) {
                            if (bitIndex < data.length) {
                                modules[row][c] = data[bitIndex++];
                            } else {
                                modules[row][c] = false;
                            }
                        }
                    }
                }
                direction *= -1;
            }
        }
        
        return { ErrorCorrectionLevel, encodeText };
    })();
    
    function downloadQRCode() {
        const qrcode = document.getElementById('qrcode');
        if (!qrcode.canvas) {
            alert('请先生成二维码');
            return;
        }
        
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = qrcode.canvas.toDataURL('image/png');
        link.click();
    }
    
    // 短链接生成
    function generateShortUrl() {
        const longUrl = document.getElementById('long-url').value;
        if (!longUrl) {
            alert('请输入长链接');
            return;
        }
        
        const hash = Math.abs(longUrl.split('').reduce((acc, char) => acc * 31 + char.charCodeAt(0), 1));
        const shortCode = hash.toString(36).slice(-6);
        document.getElementById('short-url').value = `https://tools.jianbox.cn/s/${shortCode}`;
    }
    
    function copyShortUrl() {
        const output = document.getElementById('short-url');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    // IP 查询
    async function queryIP() {
        const ip = document.getElementById('ip-input').value.trim();
        if (!ip) {
            alert('请输入 IP 地址');
            return;
        }
        
        try {
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await response.json();
            
            document.getElementById('ip-address').textContent = data.ip || '-';
            document.getElementById('ip-country').textContent = data.country_name || '-';
            document.getElementById('ip-province').textContent = data.region || '-';
            document.getElementById('ip-city').textContent = data.city || '-';
            document.getElementById('ip-isp').textContent = data.org || '-';
        } catch (error) {
            alert('查询失败: ' + error.message);
        }
    }
    
    async function getMyIP() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            document.getElementById('ip-input').value = data.ip;
            document.getElementById('ip-address').textContent = data.ip || '-';
            document.getElementById('ip-country').textContent = data.country_name || '-';
            document.getElementById('ip-province').textContent = data.region || '-';
            document.getElementById('ip-city').textContent = data.city || '-';
            document.getElementById('ip-isp').textContent = data.org || '-';
        } catch (error) {
            alert('查询失败: ' + error.message);
        }
    }
    
    // 天气查询
    async function getWeather() {
        const city = document.getElementById('city-input').value.trim();
        if (!city) {
            alert('请输入城市名称');
            return;
        }
        
        try {
            const response = await fetch(`https://wttr.in/${city}?format=j1`);
            const data = await response.json();
            
            if (data.current_condition) {
                const condition = data.current_condition[0];
                document.getElementById('weather-city').textContent = city;
                document.getElementById('weather-desc').textContent = condition.weatherDesc[0].value;
                document.getElementById('weather-temp').textContent = condition.temp_C;
                document.getElementById('weather-humidity').textContent = condition.humidity;
                document.getElementById('weather-wind').textContent = condition.windspeedKmph + ' km/h';
                
                const icon = getWeatherIcon(condition.weatherCode);
                document.getElementById('weather-icon').textContent = icon;
            }
        } catch (error) {
            alert('查询失败: ' + error.message);
        }
    }
    
    function getWeatherIcon(code) {
        const icons = {
            '113': '☀️', '116': '⛅', '119': '☁️', '122': '☁️',
            '200': '🌩️', '263': '🌧️', '266': '🌧️', '281': '🌧️',
            '284': '🌧️', '293': '🌧️', '296': '🌧️', '299': '🌧️',
            '302': '🌧️', '305': '🌧️', '308': '🌧️', '311': '🌧️',
            '314': '🌧️', '317': '🌧️', '320': '❄️', '323': '❄️',
            '326': '❄️', '329': '❄️', '332': '❄️', '335': '❄️',
            '338': '❄️', '350': '🌨️', '353': '🌧️', '356': '🌧️',
            '359': '🌧️', '362': '🌧️', '365': '🌧️', '368': '🌧️',
            '371': '❄️', '374': '🌨️', '377': '🌨️', '386': '🌩️',
            '389': '🌩️', '392': '🌧️', '395': '❄️'
        };
        return icons[code] || '🌤️';
    }
    
    async function getCurrentLocationWeather() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            const response = await fetch(`https://wttr.in/${lat},${lon}?format=j1`);
            const data = await response.json();
            
            if (data.current_condition) {
                const condition = data.current_condition[0];
                document.getElementById('city-input').value = data.nearest_area[0].areaName[0].value;
                document.getElementById('weather-city').textContent = data.nearest_area[0].areaName[0].value;
                document.getElementById('weather-desc').textContent = condition.weatherDesc[0].value;
                document.getElementById('weather-temp').textContent = condition.temp_C;
                document.getElementById('weather-humidity').textContent = condition.humidity;
                document.getElementById('weather-wind').textContent = condition.windspeedKmph + ' km/h';
                
                const icon = getWeatherIcon(condition.weatherCode);
                document.getElementById('weather-icon').textContent = icon;
            }
        } catch (error) {
            alert('定位失败: ' + error.message);
        }
    }
    
    // 关键词密度检测
    function calcKeywordDensity() {
        const keywords = document.getElementById('keyword-input').value.split(',').map(k => k.trim()).filter(k => k);
        const content = document.getElementById('content-input').value;
        
        if (!keywords.length || !content) {
            alert('请输入关键词和文章内容');
            return;
        }
        
        const totalWords = content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w).length;
        
        const densityList = document.getElementById('density-list');
        densityList.innerHTML = '';
        
        keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            const count = (content.match(regex) || []).length;
            const density = totalWords > 0 ? ((count / totalWords) * 100).toFixed(2) : '0';
            
            densityList.innerHTML += `<p>${keyword}: ${count} 次，密度 ${density}%</p>`;
        });
        
        document.getElementById('total-words').textContent = totalWords;
    }
    
    // Meta 标签生成
    function generateMeta() {
        const title = document.getElementById('meta-title').value;
        const desc = document.getElementById('meta-desc').value;
        const keywords = document.getElementById('meta-keywords').value;
        
        let metaCode = '';
        if (title) metaCode += `<meta name="title" content="${escapeHtml(title)}">\n`;
        if (desc) metaCode += `<meta name="description" content="${escapeHtml(desc)}">\n`;
        if (keywords) metaCode += `<meta name="keywords" content="${escapeHtml(keywords)}">\n`;
        metaCode += '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
        
        document.getElementById('meta-output').value = metaCode;
    }
    
    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
    }
    
    function copyMeta() {
        const output = document.getElementById('meta-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    // 时间戳转换
    function timestampToDate() {
        const ts = document.getElementById('timestamp-input').value;
        if (ts) {
            const date = new Date(ts * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            document.getElementById('datetime-input').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }
    
    function dateToTimestamp() {
        const dt = document.getElementById('datetime-input').value;
        if (dt) {
            const date = new Date(dt);
            document.getElementById('timestamp-input').value = Math.floor(date.getTime() / 1000);
        }
    }
    
    function updateCurrentTime() {
        const now = new Date();
        document.getElementById('current-timestamp').textContent = '时间戳: ' + Math.floor(now.getTime() / 1000);
        document.getElementById('current-datetime').textContent = '日期: ' + now.toLocaleString('zh-CN');
    }
    
    // UUID 生成器
    function generateUUID() {
        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        document.getElementById('uuid-output').value = uuid;
    }
    
    function copyUUID() {
        const output = document.getElementById('uuid-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    // 随机数生成器
    function generateRandomNumber() {
        const min = parseFloat(document.getElementById('random-min').value);
        const max = parseFloat(document.getElementById('random-max').value);
        const isInteger = document.getElementById('random-integer').checked;
        
        if (isNaN(min) || isNaN(max)) {
            alert('请输入有效的数字');
            return;
        }
        
        if (min > max) {
            alert('最小值不能大于最大值');
            return;
        }
        
        let result;
        if (isInteger) {
            result = Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
            result = (Math.random() * (max - min) + min).toFixed(4);
        }
        
        document.getElementById('random-output').value = result;
    }
    
    function copyRandomNumber() {
        const output = document.getElementById('random-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    // 随机密码生成
    function generatePassword() {
        const length = parseInt(document.getElementById('pwd-length').value);
        const useUpper = document.getElementById('pwd-upper').checked;
        const useLower = document.getElementById('pwd-lower').checked;
        const useNumber = document.getElementById('pwd-number').checked;
        const useSymbol = document.getElementById('pwd-symbol').checked;
        
        let chars = '';
        if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (useNumber) chars += '0123456789';
        if (useSymbol) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        if (!chars) {
            alert('请至少选择一种字符类型');
            return;
        }
        
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('pwd-output').value = password;
    }
    
    function copyPassword() {
        const output = document.getElementById('pwd-output');
        if (output.value) {
            output.select();
            document.execCommand('copy');
            alert('已复制到剪贴板');
        }
    }
    
    // 颜色转换
    function updateColorFromPicker() {
        const hex = document.getElementById('color-picker').value;
        document.getElementById('color-hex').value = hex;
        updateColorFromHex();
    }
    
    function updateColorFromHex() {
        let hex = document.getElementById('color-hex').value;
        if (!hex.startsWith('#')) hex = '#' + hex;
        document.getElementById('color-picker').value = hex;
        document.getElementById('color-preview').style.background = hex;
        
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        document.getElementById('color-rgb').value = `rgb(${r}, ${g}, ${b})`;
    }
    
    function updateColorFromRgb() {
        const rgb = document.getElementById('color-rgb').value;
        const match = rgb.match(/\d+/g);
        if (match && match.length >= 3) {
            const r = parseInt(match[0]);
            const g = parseInt(match[1]);
            const b = parseInt(match[2]);
            const hex = '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
            document.getElementById('color-picker').value = hex;
            document.getElementById('color-hex').value = hex;
            document.getElementById('color-preview').style.background = hex;
        }
    }
    
    // 计算器
    let calcExpression = '';
    
    function calcAppend(c) {
        const display = document.getElementById('calc-display');
        if (display.textContent === '0' && !isNaN(c)) {
            display.textContent = c;
        } else {
            display.textContent += c;
        }
        calcExpression = display.textContent;
    }
    
    function calcClear() {
        document.getElementById('calc-display').textContent = '0';
        calcExpression = '';
    }
    
    function calcBackspace() {
        const display = document.getElementById('calc-display');
        if (display.textContent.length > 1) {
            display.textContent = display.textContent.slice(0, -1);
        } else {
            display.textContent = '0';
        }
        calcExpression = display.textContent;
    }
    
    function calcEquals() {
        try {
            const result = eval(calcExpression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'));
            document.getElementById('calc-display').textContent = result;
            calcExpression = String(result);
        } catch (e) {
            document.getElementById('calc-display').textContent = 'Error';
            calcExpression = '';
        }
    }

    // 页面加载时从API获取数据
    loadDataFromAPI();

    /* ══ 用户信息面板 ══ */
    const USER_KEY = 'userProfile';
    let userProfile = JSON.parse(localStorage.getItem(USER_KEY) || 'null') || {
        id: 'UID-' + Math.random().toString(36).slice(2,10).toUpperCase(),
        name: 'Alex R.',
        pwd: '',
        avatar: ''  // base64 或空
    };

    function saveProfile(){ localStorage.setItem(USER_KEY, JSON.stringify(userProfile)); }

    // 检查是否已登录
    function isAdminLoggedIn(){
        return !!localStorage.getItem('admin_token');
    }

    // 处理用户区域点击
    function handleUserAreaClick(){
        if(isAdminLoggedIn()){
            toggleDropdown();
        } else {
            showLoginModal();
        }
    }

    function applyProfile(){
        const isLoggedIn = isAdminLoggedIn();
        const ha = document.getElementById('headerAvatar');
        const headerName = document.getElementById('headerName');
        const dropArrow = document.getElementById('dropArrow');
        const feedbackIcon = document.getElementById('feedbackIcon');

        if(!isLoggedIn){
            // 未登录：显示空白头像
            if(ha) ha.innerHTML = '';
            if(headerName){
                headerName.style.display = 'none';
            }
            if(dropArrow){
                dropArrow.style.display = 'none';
            }
            if(feedbackIcon){
                feedbackIcon.classList.remove('show');
            }
            return;
        }
        
        // 已登录：显示反馈图标
        if(feedbackIcon){
            feedbackIcon.classList.add('show');
        }

        // 已登录：显示用户信息
        if(userProfile.avatar){
            if(ha) ha.innerHTML = `<img src="${userProfile.avatar}">`;
        } else {
            const initials = userProfile.name ? userProfile.name.slice(0,1).toUpperCase() : 'A';
            if(ha) ha.innerHTML = initials;
        }
        if(headerName){
            headerName.style.display = '';
            headerName.textContent = userProfile.name;
        }
        if(dropArrow){
            dropArrow.style.display = '';
        }
        
        // 控制管理后台导航项的显示
        const adminNav = document.getElementById('adminNav');
        if(adminNav){
            const isAdmin = localStorage.getItem('is_admin') === 'true';
            adminNav.style.display = isAdmin ? '' : 'none';
        }
    }

    function toggleDropdown(){
        const dd = document.getElementById('userDropdown');
        const ua = document.getElementById('userArea');
        const arrow = document.getElementById('dropArrow');
        if(!dd || !ua) return;
        const isOpen = dd.classList.contains('show');
        if(!isOpen){
            applyDropdownProfile();
        }
        dd.classList.toggle('show', !isOpen);
        ua.classList.toggle('open', !isOpen);
        if(arrow) arrow.textContent = isOpen ? '▾' : '▴';
    }

    function applyDropdownProfile(){
        const da = document.getElementById('dropdownAvatar');
        const dn = document.getElementById('dropdownName');
        const di = document.getElementById('dropdownId');
        const dnv = document.getElementById('dropdownNameVal');
        if(userProfile.avatar){
            da.innerHTML = `<img src="${userProfile.avatar}">`;
        } else {
            const initials = userProfile.name.slice(0,1).toUpperCase();
            da.innerHTML = initials;
        }
        if(dn) dn.textContent = userProfile.name;
        if(di) di.textContent = '#' + userProfile.id;
        if(dnv) dnv.textContent = userProfile.name;
    }

    function editAvatar(){
        document.getElementById('avatarInput').click();
    }

    function handleAvatarUpload(input){
        const file = input.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e){
            userProfile.avatar = e.target.result;
            saveProfile();
            applyProfile();
            applyDropdownProfile();
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    function editName(){
        const name = prompt('请输入新名字:', userProfile.name);
        if(name !== null && name.trim()){
            userProfile.name = name.trim();
            saveProfile();
            applyProfile();
            applyDropdownProfile();
        }
        closeDropdown();
    }

    function editPwd(){
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.innerHTML = `
            <div class="edit-mask" onclick="closePwdModal()"></div>
            <div class="edit-dialog">
                <div class="edit-header">修改密码</div>
                <div class="edit-body">
                    <div class="edit-field">
                        <label>当前密码</label>
                        <input type="password" id="oldPwdInput" placeholder="请输入当前密码">
                    </div>
                    <div class="edit-field">
                        <label>新密码</label>
                        <input type="password" id="newPwdInput1" placeholder="请输入新密码">
                    </div>
                    <div class="edit-field">
                        <label>确认新密码</label>
                        <input type="password" id="newPwdInput2" placeholder="请再次输入新密码">
                    </div>
                </div>
                <div class="edit-footer">
                    <button class="edit-btn-cancel" onclick="closePwdModal()">取消</button>
                    <button class="edit-btn-confirm" onclick="submitPwdChange()">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const style = document.createElement('style');
        style.textContent = `
            .edit-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .edit-mask {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
            }
            .edit-dialog {
                position: relative;
                width: 90%;
                max-width: 400px;
                background: var(--bg-card);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            .edit-header {
                padding: 16px 20px;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
                border-bottom: 1px solid var(--border);
            }
            .edit-body {
                padding: 20px;
            }
            .edit-field {
                margin-bottom: 16px;
            }
            .edit-field label {
                display: block;
                font-size: 14px;
                color: var(--text-secondary);
                margin-bottom: 8px;
            }
            .edit-field input {
                width: 100%;
                padding: 10px 14px;
                border: 1px solid var(--border);
                border-radius: 8px;
                font-size: 14px;
                background: var(--bg-input);
                color: var(--text-primary);
                box-sizing: border-box;
            }
            .edit-field input:focus {
                outline: none;
                border-color: var(--primary);
            }
            .edit-footer {
                display: flex;
                gap: 12px;
                padding: 16px 20px;
                border-top: 1px solid var(--border);
                justify-content: flex-end;
            }
            .edit-btn-cancel {
                padding: 10px 24px;
                border: 1px solid var(--border);
                border-radius: 8px;
                background: transparent;
                color: var(--text-secondary);
                font-size: 14px;
                cursor: pointer;
            }
            .edit-btn-cancel:hover {
                background: var(--bg-hover);
            }
            .edit-btn-confirm {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                background: var(--primary);
                color: white;
                font-size: 14px;
                cursor: pointer;
            }
            .edit-btn-confirm:hover {
                background: var(--primary-dark);
            }
        `;
        document.head.appendChild(style);
    }
    
    function closePwdModal(){
        const modal = document.querySelector('.edit-modal');
        const style = document.querySelector('style:last-child');
        if(modal) modal.remove();
        if(style) style.remove();
    }
    
    function submitPwdChange(){
        const oldPwd = document.getElementById('oldPwdInput').value;
        const newPwd1 = document.getElementById('newPwdInput1').value;
        const newPwd2 = document.getElementById('newPwdInput2').value;

        if(!oldPwd){
            alert('请输入当前密码！');
            return;
        }

        if(!newPwd1){
            alert('请输入新密码！');
            return;
        }

        if(newPwd1.length < 6){
            alert('新密码长度不能少于6位！');
            return;
        }

        if(!newPwd2){
            alert('请确认新密码！');
            return;
        }

        if(newPwd1 !== newPwd2){
            alert('两次输入的新密码不一致！');
            return;
        }

        fetch('/api/admin/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
            },
            body: JSON.stringify({
                old_password: oldPwd,
                new_password: newPwd1
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.code === 0 || data.error === undefined){
                userProfile.pwd = newPwd1;
                saveProfile();
                applyDropdownProfile();
                alert('密码修改成功！');
                closePwdModal();
                closeDropdown();
            } else {
                alert(data.error || '修改密码失败！');
            }
        })
        .catch(err => {
            alert('修改密码失败：' + err);
        });
    }

    function logout(){
        if(!confirm('确定要退出登录吗？这将清除您的登录信息。')){
            return;
        }
        localStorage.removeItem('admin_token');
        localStorage.removeItem('is_admin');
        localStorage.removeItem('username');
        localStorage.removeItem('user_email');
        favorites = new Set();
        saveFav();
        updateBadge();
        location.reload();
    }

    /* ══ 随机用户信息生成器 ══ */
    const firstName = [
        'Alex', 'Ben', 'Chris', 'David', 'Ethan', 'Frank', 'George', 'Henry',
        'Ivan', 'James', 'Kevin', 'Liam', 'Mike', 'Noah', 'Oliver', 'Peter',
        'Quinn', 'Ryan', 'Sam', 'Tom', 'Umar', 'Victor', 'William', 'Xavier',
        'Yusuf', 'Zach', 'Alice', 'Beth', 'Carol', 'Diana', 'Emma', 'Fiona',
        'Grace', 'Hannah', 'Ivy', 'Julia', 'Kate', 'Lily', 'Mia', 'Nora',
        'Olivia', 'Penny', 'Queen', 'Rose', 'Sarah', 'Tina', 'Ursula', 'Vera',
        'Wendy', 'Xena', 'Yara', 'Zoe'
    ];
    
    const lastName = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
        'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
        'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
    ];

    // 生成随机英文名
    function generateRandomName() {
        const first = firstName[Math.floor(Math.random() * firstName.length)];
        const last = lastName[Math.floor(Math.random() * lastName.length)];
        return first + ' ' + last.charAt(0) + '.';
    }

    // 生成随机颜色
    function generateRandomColor() {
        const colors = [
            '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
            '#ef4444', '#ec4899', '#84cc16', '#f97316', '#0ea5e9'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 生成随机头像（首字母 + 随机背景色）
    function generateRandomAvatar(name) {
        const initial = name.charAt(0).toUpperCase();
        const bgColor = generateRandomColor();
        // 创建一个简单的头像样式
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='${bgColor.replace('#', '%23')}'/%3E%3Ctext x='50' y='58' text-anchor='middle' font-size='40' font-weight='700' fill='white' font-family='Arial,sans-serif'%3E${initial}%3C/text%3E%3C/svg%3E`;
    }

    /* ══ 管理员登录功能 ══ */
    function showLoginModal(){
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('loginUsername').focus();
    }

    function hideLoginModal(){
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    }

    async function adminLogin(){
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if(!username){
            alert('请输入用户名');
            return;
        }
        if(!password){
            alert('请输入密码');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();

            if(result.code === 0){
                // 登录成功，保存 token
                localStorage.setItem('admin_token', result.data.token);
                localStorage.setItem('is_admin', result.data.is_admin ? 'true' : 'false');
                localStorage.setItem('username', result.data.username || '');
                localStorage.setItem('user_email', result.data.email || '');
                userProfile.id = result.data.id || userProfile.id;
                userProfile.name = result.data.username || 'User';
                saveProfile();
                hideLoginModal();
                applyProfile();
                loadHistory();
                if(result.data.favorites && result.data.favorites.length>0){
                    favorites = new Set(result.data.favorites.map(f=>f.tool_id));
                    saveFav();
                    updateBadge();
                }
            } else {
                alert(result.message || '登录失败');
            }
        } catch(error) {
            console.error('登录请求失败:', error);
            alert('网络错误，请稍后重试');
        }
    }

    function showRegisterModal(){
        document.getElementById('registerModal').style.display = 'flex';
        document.getElementById('regUsername').focus();
    }

    function hideRegisterModal(){
        document.getElementById('registerModal').style.display = 'none';
        document.getElementById('regUsername').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regPassword2').value = '';
    }

    async function adminRegister(){
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const password2 = document.getElementById('regPassword2').value.trim();

        if(!username){
            alert('请输入用户名');
            return;
        }
        if(!password){
            alert('请输入密码');
            return;
        }
        if(password.length < 6){
            alert('密码长度不能少于6位');
            return;
        }
        if(password !== password2){
            alert('两次输入的密码不一致');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();

            if(result.code === 0){
                // 注册成功，生成随机用户名和头像
                const randomName = generateRandomName();
                const randomAvatar = generateRandomAvatar(randomName);
                
                // 保存用户资料
                userProfile = {
                    id: 'UID-' + Math.random().toString(36).slice(2,10).toUpperCase(),
                    name: randomName,
                    pwd: '',
                    avatar: randomAvatar
                };
                saveProfile();
                
                hideRegisterModal();
                showLoginModal();
                document.getElementById('loginUsername').value = username;
            } else {
                alert(result.message || '注册失败');
            }
        } catch(error) {
            console.error('注册请求失败:', error);
            alert('网络错误，请稍后重试');
        }
    }

    function sendFeedback(){
        const feedback = prompt('请输入您的意见或建议：');
        if(!feedback || !feedback.trim()){
            alert('请输入内容');
            return;
        }
        
        const data = {
            content: feedback.trim()
        };

        fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if(response.ok){
                alert('反馈提交成功！感谢您的意见。');
                closeDropdown();
            } else {
                alert('提交失败，请稍后重试');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('提交失败，请稍后重试');
        });
    }

    function closeDropdown(){
        const dd = document.getElementById('userDropdown');
        const ua = document.getElementById('userArea');
        const arrow = document.getElementById('dropArrow');
        if(dd) dd.classList.remove('show');
        if(ua) ua.classList.remove('open');
        if(arrow) arrow.textContent = '▾';
    }

    // 点击面板外关闭
    document.addEventListener('click', e=>{
        const wrap = document.querySelector('.user-wrap');
        if(!wrap.contains(e.target)) closeDropdown();
    });

    function startEdit(field){
        if(field==='name'){
            document.getElementById('nameVal').style.display='none';
            document.getElementById('nameEditBtn').style.display='none';
            const inp = document.getElementById('nameInput');
            inp.style.display=''; inp.value=userProfile.name; inp.focus();
            document.getElementById('nameSaveBtn').style.display='';
        } else {
            document.getElementById('pwdVal').style.display='none';
            document.getElementById('pwdEditBtn').style.display='none';
            const inp = document.getElementById('pwdInput');
            inp.style.display=''; inp.value=''; inp.focus();
            document.getElementById('pwdSaveBtn').style.display='';
        }
    }

    function saveEdit(field){
        if(field==='name'){
            const v = document.getElementById('nameInput').value.trim();
            if(v){ userProfile.name=v; saveProfile(); applyProfile(); }
            document.getElementById('nameInput').style.display='none';
            document.getElementById('nameSaveBtn').style.display='none';
            document.getElementById('nameVal').style.display='';
            document.getElementById('nameEditBtn').style.display='';
        } else {
            const v = document.getElementById('pwdInput').value;
            if(v){ userProfile.pwd=v; saveProfile(); applyProfile(); }
            document.getElementById('pwdInput').style.display='none';
            document.getElementById('pwdSaveBtn').style.display='none';
            document.getElementById('pwdVal').style.display='';
            document.getElementById('pwdEditBtn').style.display='';
        }
    }

    function changeAvatar(input){
        const file = input.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e=>{ userProfile.avatar=e.target.result; saveProfile(); applyProfile(); };
        reader.readAsDataURL(file);
    }

    function copyUid(){
        navigator.clipboard.writeText(userProfile.id).then(()=>{
            const btn = document.querySelector('.dp-uid-copy');
            btn.textContent='✔ 已复制'; setTimeout(()=>btn.textContent='⎘ 复制', 1500);
        });
    }

    applyProfile();
    renderAll();
    
    // 检查是否有需要选中的分类（从外部工具页面返回）
    setTimeout(() => {
        const lastCategoryId = localStorage.getItem('lastToolCategoryId');
        if (lastCategoryId) {
            // 选中对应导航项
            const targetNav = document.querySelector('.nav-item[data-category-id="' + lastCategoryId + '"]');
            if (targetNav) {
                targetNav.click();
            }
            // 清除记录
            localStorage.removeItem('lastToolCategoryId');
        }
    }, 600);

    /* ══ 管理后台功能 ══ */
    // 当前编辑的工具/分类ID
    let currentEditToolId = null;
    let currentEditCategoryId = null;

    // 获取认证token
    function getAuthHeader() {
        const token = localStorage.getItem('admin_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        };
    }

    // 打开管理面板
    function openAdminPanel() {
        closeDropdown();
        document.getElementById('adminPanel').style.display = 'flex';
        loadTools();
        loadCategories();
    }

    // 关闭管理面板
    function closeAdminPanel() {
        document.getElementById('adminPanel').style.display = 'none';
    }

    // 切换标签页
    function showTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        event.target.classList.add('active');
        document.getElementById(tabName + '-tab').style.display = 'block';
    }

    // 导出数据
    async function exportData() {
        try {
            const response = await fetch('/api/admin/export', {
                method: 'GET',
                headers: getAuthHeader()
            });
            
            if (!response.ok) {
                alert('导出失败，请检查是否登录');
                return;
            }
            
            // 下载文件
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tools_data.json';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            alert('导出成功！文件已下载');
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败：' + error.message);
        }
    }

    // ── 工具管理 ──

    // 加载工具列表
    async function loadTools() {
        try {
            const response = await fetch('/api/tools', {
                method: 'GET',
                headers: getAuthHeader()
            });
            const result = await response.json();
            if (result.data) {
                renderToolsTable(result.data);
            }
        } catch (error) {
            console.error('加载工具列表失败:', error);
        }
    }

    // 渲染工具表格
    function renderToolsTable(tools) {
        const table = document.getElementById('toolsTable');
        if (!tools || tools.length === 0) {
            table.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>暂无工具</p></div>';
            return;
        }
        
        // 按使用次数降序排列，方便查看热门工具
        const sortedTools = [...tools].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>图标</th>
                        <th>名称</th>
                        <th>分类</th>
                        <th>火热</th>
                        <th>使用次数</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedTools.forEach(tool => {
            html += `
                <tr>
                    <td>${tool.icon || '📄'}</td>
                    <td>${tool.name}</td>
                    <td>${getCategoryName(tool.category_id)}</td>
                    <td>${tool.is_hot ? '🔥' : '-'}</td>
                    <td><span style="font-weight:bold;">${tool.usage_count || 0}</span></td>
                    <td>
                        <button class="action-btn edit" onclick="showEditToolModal(${tool.id})">编辑</button>
                        <button class="action-btn delete" onclick="deleteTool(${tool.id})">删除</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    }

    // 获取分类名称（需要先加载分类列表）
    let categoriesList = [];
    function getCategoryName(categoryId) {
        const cat = categoriesList.find(c => c.id === categoryId);
        return cat ? cat.name : '未知';
    }

    // 显示添加工具模态框
    function showAddToolModal() {
        currentEditToolId = null;
        document.getElementById('toolName').value = '';
        document.getElementById('toolIcon').value = '';
        document.getElementById('toolDesc').value = '';
        document.getElementById('toolCategory').value = '';
        document.getElementById('toolHot').checked = false;
        document.getElementById('addToolModal').style.display = 'flex';
        populateCategorySelect();
    }

    // 显示编辑工具模态框
    async function showEditToolModal(id) {
        currentEditToolId = id;
        try {
            const response = await fetch('/api/tools/' + id, {
                method: 'GET',
                headers: getAuthHeader()
            });
            const result = await response.json();
            if (result.data) {
                const tool = result.data;
                document.getElementById('toolName').value = tool.name || '';
                document.getElementById('toolIcon').value = tool.icon || '';
                document.getElementById('toolDesc').value = tool.description || '';
                document.getElementById('toolCategory').value = tool.category_id || '';
                document.getElementById('toolHot').checked = tool.is_hot || false;
                document.getElementById('addToolModal').style.display = 'flex';
                populateCategorySelect();
            }
        } catch (error) {
            console.error('获取工具信息失败:', error);
        }
    }

    // 隐藏添加/编辑工具模态框
    function hideAddToolModal() {
        document.getElementById('addToolModal').style.display = 'none';
        currentEditToolId = null;
    }

    // 填充分类下拉框
    function populateCategorySelect() {
        const select = document.getElementById('toolCategory');
        select.innerHTML = '<option value="">请选择分类</option>';
        categoriesList.forEach(cat => {
            select.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        });
    }

    // 添加/更新工具
    async function addTool() {
        const name = document.getElementById('toolName').value.trim();
        const icon = document.getElementById('toolIcon').value.trim();
        const desc = document.getElementById('toolDesc').value.trim();
        const categoryId = parseInt(document.getElementById('toolCategory').value);
        const isHot = document.getElementById('toolHot').checked;

        if (!name) {
            alert('请输入工具名称');
            return;
        }
        if (!categoryId) {
            alert('请选择分类');
            return;
        }

        const data = {
            name: name,
            icon: icon,
            description: desc,
            category_id: categoryId,
            is_hot: isHot,
            url: '#' // 默认URL
        };

        try {
            let response;
            if (currentEditToolId) {
                // 更新工具
                response = await fetch('/api/admin/tools/' + currentEditToolId, {
                    method: 'PUT',
                    headers: getAuthHeader(),
                    body: JSON.stringify(data)
                });
            } else {
                // 添加工具
                response = await fetch('/api/admin/tools', {
                    method: 'POST',
                    headers: getAuthHeader(),
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            if (result.message) {
                alert(result.message);
                hideAddToolModal();
                loadTools();
            }
        } catch (error) {
            console.error('保存工具失败:', error);
            alert('保存失败，请稍后重试');
        }
    }

    // 删除工具
    async function deleteTool(id) {
        if (!confirm('确定要删除这个工具吗？')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/tools/' + id, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            const result = await response.json();
            if (result.message) {
                alert(result.message);
                loadTools();
            }
        } catch (error) {
            console.error('删除工具失败:', error);
            alert('删除失败，请稍后重试');
        }
    }

    // ── 分类管理 ──

    // 加载分类列表
    async function loadCategories() {
        try {
            const response = await fetch('/api/categories', {
                method: 'GET',
                headers: getAuthHeader()
            });
            const result = await response.json();
            if (result.data) {
                categoriesList = result.data;
                renderCategoriesTable(result.data);
            }
        } catch (error) {
            console.error('加载分类列表失败:', error);
        }
    }

    // 渲染分类表格
    function renderCategoriesTable(categories) {
        const table = document.getElementById('categoriesTable');
        if (!categories || categories.length === 0) {
            table.innerHTML = '<div class="empty-state"><div class="empty-icon">📁</div><p>暂无分类</p></div>';
            return;
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>图标</th>
                        <th>名称</th>
                        <th>排序</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        categories.forEach(cat => {
            html += `
                <tr>
                    <td>${cat.icon || '📁'}</td>
                    <td>${cat.name}</td>
                    <td>${cat.sort_order}</td>
                    <td>
                        <button class="action-btn edit" onclick="showEditCategoryModal(${cat.id})">编辑</button>
                        <button class="action-btn delete" onclick="deleteCategory(${cat.id})">删除</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        table.innerHTML = html;
    }

    // 显示添加分类模态框
    function showAddCategoryModal() {
        currentEditCategoryId = null;
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryIcon').value = '';
        document.getElementById('categoryOrder').value = '1';
        document.getElementById('addCategoryModal').style.display = 'flex';
    }

    // 显示编辑分类模态框
    async function showEditCategoryModal(id) {
        currentEditCategoryId = id;
        try {
            const response = await fetch('/api/categories/' + id, {
                method: 'GET',
                headers: getAuthHeader()
            });
            const result = await response.json();
            if (result.data) {
                const cat = result.data;
                document.getElementById('categoryName').value = cat.name || '';
                document.getElementById('categoryIcon').value = cat.icon || '';
                document.getElementById('categoryOrder').value = cat.sort_order || '1';
                document.getElementById('addCategoryModal').style.display = 'flex';
            }
        } catch (error) {
            console.error('获取分类信息失败:', error);
        }
    }

    // 隐藏添加/编辑分类模态框
    function hideAddCategoryModal() {
        document.getElementById('addCategoryModal').style.display = 'none';
        currentEditCategoryId = null;
    }

    // 添加/更新分类
    async function addCategory() {
        const name = document.getElementById('categoryName').value.trim();
        const icon = document.getElementById('categoryIcon').value.trim();
        const order = parseInt(document.getElementById('categoryOrder').value);

        if (!name) {
            alert('请输入分类名称');
            return;
        }

        const data = {
            name: name,
            icon: icon,
            sort_order: order
        };

        try {
            let response;
            if (currentEditCategoryId) {
                // 更新分类
                response = await fetch('/api/admin/categories/' + currentEditCategoryId, {
                    method: 'PUT',
                    headers: getAuthHeader(),
                    body: JSON.stringify(data)
                });
            } else {
                // 添加分类
                response = await fetch('/api/admin/categories', {
                    method: 'POST',
                    headers: getAuthHeader(),
                    body: JSON.stringify(data)
                });
            }
            
            const result = await response.json();
            if (result.message) {
                alert(result.message);
                hideAddCategoryModal();
                loadCategories();
            }
        } catch (error) {
            console.error('保存分类失败:', error);
            alert('保存失败，请稍后重试');
        }
    }

    // 删除分类
    async function deleteCategory(id) {
        if (!confirm('确定要删除这个分类吗？')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/categories/' + id, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            const result = await response.json();
            if (result.message) {
                alert(result.message);
                loadCategories();
                loadTools(); // 刷新工具列表
            }
        } catch (error) {
            console.error('删除分类失败:', error);
            alert('删除失败，请稍后重试');
        }
    }

    // 生成静态数据
    async function generateStaticData() {
        if (!confirm('确定要生成静态数据文件吗？这将更新 frontend/data.json')) {
            return;
        }
        
        try {
            const response = await fetch('/api/admin/generate-static-data', {
                method: 'POST',
                headers: getAuthHeader()
            });
            const result = await response.json();
            
            if (result.message) {
                alert(result.message + '\n请刷新页面查看最新数据');
                // 刷新页面以加载新数据
                location.reload();
            }
        } catch (error) {
            console.error('生成静态数据失败:', error);
            alert('生成失败，请稍后重试');
        }
    }

    /* ══ 在线记事本 ══ */
    function notepadNew() {
        if (document.getElementById('notepad-content').value && !confirm('当前内容未保存，确定新建吗？')) return;
        document.getElementById('notepad-content').value = '';
        updateNotepadStats();
    }
    function notepadSave() {
        const content = document.getElementById('notepad-content').value;
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'notepad_' + new Date().toISOString().slice(0, 10) + '.txt';
        a.click();
    }
    function notepadLoad() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.md,.json,.js,.html,.css';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                document.getElementById('notepad-content').value = ev.target.result;
                updateNotepadStats();
            };
            reader.readAsText(file);
        };
        input.click();
    }
    function notepadClear() {
        if (confirm('确定清空所有内容吗？')) {
            document.getElementById('notepad-content').value = '';
            updateNotepadStats();
        }
    }
    function updateNotepadStats() {
        const content = document.getElementById('notepad-content').value;
        document.getElementById('notepad-count').textContent = content.length;
        document.getElementById('notepad-lines').textContent = content.split('\n').length;
    }

    /* ══ 待办清单 ══ */
    let todoItems = JSON.parse(localStorage.getItem('todo_items') || '[]');
    function renderTodoList() {
        const list = document.getElementById('todo-list');
        list.innerHTML = todoItems.map((item, i) => `
            <div class="todo-item" style="display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:6px;border-radius:8px;border:1px solid var(--border);background:var(--card);">
                <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleTodo(${i})" style="width:18px;height:18px;cursor:pointer;">
                <span style="flex:1;${item.done ? 'text-decoration:line-through;color:var(--text-dim);' : ''}">${escapeHtml(item.text)}</span>
                <button onclick="deleteTodo(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;">✕</button>
            </div>
        `).join('');
        document.getElementById('todo-total').textContent = todoItems.length;
        document.getElementById('todo-done').textContent = todoItems.filter(t => t.done).length;
    }
    function addTodo() {
        const input = document.getElementById('todo-input');
        const text = input.value.trim();
        if (!text) return;
        todoItems.push({ text, done: false });
        input.value = '';
        saveTodos();
        renderTodoList();
    }
    function toggleTodo(i) {
        todoItems[i].done = !todoItems[i].done;
        saveTodos();
        renderTodoList();
    }
    function deleteTodo(i) {
        todoItems.splice(i, 1);
        saveTodos();
        renderTodoList();
    }
    function clearCompletedTodos() {
        todoItems = todoItems.filter(t => !t.done);
        saveTodos();
        renderTodoList();
    }
    function clearAllTodos() {
        if (confirm('确定清空所有待办事项吗？')) {
            todoItems = [];
            saveTodos();
            renderTodoList();
        }
    }
    function saveTodos() {
        localStorage.setItem('todo_items', JSON.stringify(todoItems));
    }

    /* ══ 进制转换器 ══ */
    function convertAllBases() {
        const input = document.getElementById('base-input').value.trim();
        const fromBase = parseInt(document.getElementById('base-from').value);
        if (!input) {
            document.getElementById('base-bin').value = '';
            document.getElementById('base-oct').value = '';
            document.getElementById('base-dec').value = '';
            document.getElementById('base-hex').value = '';
            return;
        }
        try {
            const num = parseInt(input, fromBase);
            if (isNaN(num)) throw new Error('无效输入');
            document.getElementById('base-bin').value = num.toString(2);
            document.getElementById('base-oct').value = num.toString(8);
            document.getElementById('base-dec').value = num.toString(10);
            document.getElementById('base-hex').value = num.toString(16).toUpperCase();
        } catch (e) {
            document.getElementById('base-bin').value = '错误';
            document.getElementById('base-oct').value = '错误';
            document.getElementById('base-dec').value = '错误';
            document.getElementById('base-hex').value = '错误';
        }
    }

    /* ══ JSON转CSV ══ */
    function convertJsonToCsv() {
        const input = document.getElementById('json2csv-input').value.trim();
        if (!input) return;
        try {
            const data = JSON.parse(input);
            const arr = Array.isArray(data) ? data : [data];
            if (arr.length === 0) {
                document.getElementById('json2csv-output').value = '';
                return;
            }
            const headers = Object.keys(arr[0]);
            let csv = headers.join(',') + '\n';
            arr.forEach(row => {
                csv += headers.map(h => {
                    let val = row[h];
                    if (val === null || val === undefined) val = '';
                    val = String(val);
                    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                        val = '"' + val.replace(/"/g, '""') + '"';
                    }
                    return val;
                }).join(',') + '\n';
            });
            document.getElementById('json2csv-output').value = csv;
        } catch (e) {
            alert('JSON 格式错误: ' + e.message);
        }
    }
    function copyJsonToCsv() {
        const output = document.getElementById('json2csv-output');
        if (output.value) { output.select(); document.execCommand('copy'); alert('已复制'); }
    }
    function downloadCsv() {
        const output = document.getElementById('json2csv-output').value;
        if (!output) return;
        const blob = new Blob(['\uFEFF' + output], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'data.csv';
        a.click();
    }
    function clearJsonToCsv() {
        document.getElementById('json2csv-input').value = '';
        document.getElementById('json2csv-output').value = '';
    }

    /* ══ Cron表达式 ══ */
    function setCronPreset(type) {
        const presets = {
            everyMinute: '* * * * *',
            everyHour: '0 * * * *',
            everyDay: '0 0 * * *',
            everyWeek: '0 0 * * 1',
            everyMonth: '0 0 1 * *'
        };
        document.getElementById('cron-input').value = presets[type] || '';
        parseCron();
    }
    function parseCron() {
        const expr = document.getElementById('cron-input').value.trim();
        const resultEl = document.getElementById('cron-result');
        const nextEl = document.getElementById('cron-next-times');
        if (!expr) {
            resultEl.textContent = '请输入Cron表达式';
            nextEl.innerHTML = '';
            return;
        }
        const parts = expr.split(/\s+/);
        if (parts.length < 5) {
            resultEl.textContent = '格式错误：需要5个字段（分 时 日 月 周）';
            nextEl.innerHTML = '';
            return;
        }
        const labels = ['分钟', '小时', '日期', '月份', '星期'];
        const descriptions = parts.slice(0, 5).map((p, i) => {
            if (p === '*') return '每' + labels[i];
            if (p.includes(',')) return p.split(',').join(',') + labels[i];
            if (p.includes('/')) {
                const [range, step] = p.split('/');
                return (range === '*' ? '每' : '从' + range + '开始') + step + labels[i] + '一次';
            }
            if (p.includes('-')) {
                const [s, e] = p.split('-');
                return labels[i] + '从' + s + '到' + e;
            }
            return labels[i] + '=' + p;
        });
        resultEl.textContent = descriptions.join('，');
        
        const now = new Date();
        const times = [];
        let testDate = new Date(now);
        for (let i = 0; i < 5; i++) {
            testDate = new Date(testDate.getTime() + 60000);
            testDate.setSeconds(0);
            times.push(testDate.toLocaleString('zh-CN'));
        }
        nextEl.innerHTML = times.map(t => '<div>• ' + t + '</div>').join('');
    }

    /* ══ 配色生成器 ══ */
    function generatePalette() {
        const baseHex = document.getElementById('palette-base').value;
        const baseRgb = hexToRgb(baseHex);
        const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
        const colors = [];
        for (let i = 0; i < 6; i++) {
            const h = (baseHsl.h + i * 60) % 360;
            const s = Math.min(100, baseHsl.s + (i % 2 === 0 ? 10 : -5));
            const l = Math.min(90, Math.max(10, baseHsl.l + (i - 2) * 8));
            colors.push(hslToHex(h, s, l));
        }
        renderPalette(colors);
    }
    function generateRandomPalette() {
        const h = Math.floor(Math.random() * 360);
        const colors = [];
        for (let i = 0; i < 6; i++) {
            colors.push(hslToHex((h + i * 60) % 360, 60 + Math.random() * 20, 45 + Math.random() * 20));
        }
        document.getElementById('palette-base').value = colors[0];
        renderPalette(colors);
    }
    function renderPalette(colors) {
        const container = document.getElementById('palette-colors');
        container.innerHTML = colors.map(c => `
            <div style="flex:1;min-width:80px;text-align:center;">
                <div style="width:100%;height:60px;border-radius:8px;background:${c};border:1px solid var(--border);"></div>
                <span style="font-size:11px;font-family:monospace;color:var(--text-dim);">${c}</span>
            </div>
        `).join('');
        document.getElementById('palette-output').value = colors.join(', ');
    }
    function copyPalette() {
        const val = document.getElementById('palette-output').value;
        if (val) { navigator.clipboard.writeText(val).then(() => alert('已复制')); }
    }
    function exportPaletteCSS() {
        const colors = document.getElementById('palette-output').value.split(', ');
        let css = ':root {\n';
        colors.forEach((c, i) => { css += `  --color-${i + 1}: ${c};\n`; });
        css += '}';
        document.getElementById('palette-output').value = css;
    }
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }
    function hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return '#' + f(0) + f(8) + f(4);
    }

    /* ══ SEO标题检测 ══ */
    function analyzeSEOTitle() {
        const title = document.getElementById('seo-title-input').value;
        document.getElementById('seo-length').textContent = title.length;
        document.getElementById('seo-pixels').textContent = Math.round(title.length * 14);
        const suggestions = [];
        let score = 100;
        if (title.length < 10) { score -= 30; suggestions.push('标题太短，建议10-60个字符'); }
        else if (title.length > 60) { score -= 20; suggestions.push('标题过长，建议控制在60个字符以内'); }
        else if (title.length >= 15 && title.length <= 40) { suggestions.push('标题长度适中'); }
        if (!title) { score = 0; suggestions.push('请输入标题'); }
        document.getElementById('seo-score').textContent = score + '/100';
        document.getElementById('seo-suggestions').innerHTML = suggestions.map(s => '• ' + s).join('<br>');
    }

    /* ══ Sitemap生成器 ══ */
    function generateSitemap() {
        const domain = document.getElementById('sitemap-domain').value.trim().replace(/\/$/, '');
        const urls = document.getElementById('sitemap-urls').value.trim().split('\n').filter(u => u.trim());
        if (!domain) { alert('请输入网站域名'); return; }
        if (!urls.length) { alert('请输入页面路径'); return; }
        const today = new Date().toISOString().slice(0, 10);
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        urls.forEach(url => {
            const fullUrl = domain + (url.startsWith('/') ? url : '/' + url);
            xml += '  <url>\n';
            xml += `    <loc>${fullUrl}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += '    <priority>0.8</priority>\n';
            xml += '  </url>\n';
        });
        xml += '</urlset>';
        document.getElementById('sitemap-output').value = xml;
    }
    function copySitemap() {
        const output = document.getElementById('sitemap-output');
        if (output.value) { output.select(); document.execCommand('copy'); alert('已复制'); }
    }
    function downloadSitemap() {
        const output = document.getElementById('sitemap-output').value;
        if (!output) return;
        const blob = new Blob([output], { type: 'application/xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sitemap.xml';
        a.click();
    }

    /* ══ Robots生成器 ══ */
    function generateRobots() {
        const allowAll = document.getElementById('robots-allow-all').checked;
        const disallowPaths = document.getElementById('robots-disallow').value.trim().split('\n').filter(p => p.trim());
        const sitemap = document.getElementById('robots-sitemap').value.trim();
        let txt = 'User-agent: *\n';
        if (allowAll) {
            txt += 'Allow: /\n';
            disallowPaths.forEach(p => { txt += 'Disallow: ' + p.trim() + '\n'; });
        } else {
            txt += 'Disallow: /\n';
        }
        if (sitemap) txt += '\nSitemap: ' + sitemap + '\n';
        document.getElementById('robots-output').value = txt;
    }
    function copyRobots() {
        const output = document.getElementById('robots-output');
        if (output.value) { output.select(); document.execCommand('copy'); alert('已复制'); }
    }

    /* ══ Favicon生成器 ══ */
    let faviconImage = null;
    function generateFavicon() {
        const file = document.getElementById('favicon-upload').files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                faviconImage = img;
                const preview = document.getElementById('favicon-preview');
                const sizes = [16, 32, 64, 128];
                preview.innerHTML = sizes.map(s => {
                    const canvas = document.createElement('canvas');
                    canvas.width = s; canvas.height = s;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, s, s);
                    return `<div style="text-align:center;">
                        <img src="${canvas.toDataURL()}" style="width:${s}px;height:${s}px;border-radius:4px;border:1px solid var(--border);">
                        <div style="font-size:10px;color:var(--text-dim);">${s}x${s}</div>
                    </div>`;
                }).join('');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    function downloadFavicon(size) {
        if (!faviconImage) { alert('请先上传图片'); return; }
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(faviconImage, 0, 0, size, size);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `favicon-${size}x${size}.png`;
        a.click();
    }

    /* ══ 图片压缩 ══ */
    let compressOriginalImage = null;
    let compressOriginalSize = 0;
    function loadCompressImage() {
        const file = document.getElementById('img-compress-upload').files[0];
        if (!file) return;
        compressOriginalSize = file.size;
        document.getElementById('compress-original-size').textContent = formatFileSize(file.size);
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                compressOriginalImage = img;
                const preview = document.getElementById('compress-original-preview');
                preview.innerHTML = '';
                const clone = img.cloneNode();
                clone.style.maxWidth = '100%';
                clone.style.maxHeight = '200px';
                clone.style.borderRadius = '8px';
                preview.appendChild(clone);
                previewCompress();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    function previewCompress() {
        if (!compressOriginalImage) return;
        const quality = parseInt(document.getElementById('compress-quality').value) / 100;
        const canvas = document.createElement('canvas');
        canvas.width = compressOriginalImage.width;
        canvas.height = compressOriginalImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(compressOriginalImage, 0, 0);
        canvas.toBlob(function(blob) {
            document.getElementById('compress-result-size').textContent = formatFileSize(blob.size);
            const preview = document.getElementById('compress-result-preview');
            preview.innerHTML = '';
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);
            img.style.maxWidth = '100%';
            img.style.maxHeight = '200px';
            img.style.borderRadius = '8px';
            preview.appendChild(img);
        }, 'image/jpeg', quality);
    }
    function downloadCompressed() {
        if (!compressOriginalImage) { alert('请先上传图片'); return; }
        const quality = parseInt(document.getElementById('compress-quality').value) / 100;
        const canvas = document.createElement('canvas');
        canvas.width = compressOriginalImage.width;
        canvas.height = compressOriginalImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(compressOriginalImage, 0, 0);
        canvas.toBlob(function(blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'compressed.jpg';
            a.click();
        }, 'image/jpeg', quality);
    }
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    /* ══ 图片裁剪 ══ */
    let cropImage = null;
    function loadCropImage() {
        const file = document.getElementById('img-crop-upload').files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                cropImage = img;
                const canvas = document.getElementById('crop-canvas');
                const maxW = Math.min(img.width, 500);
                const scale = maxW / img.width;
                canvas.width = maxW;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                document.getElementById('crop-w').value = Math.round(canvas.width / 2);
                document.getElementById('crop-h').value = Math.round(canvas.height / 2);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    function applyCrop() {
        if (!cropImage) { alert('请先上传图片'); return; }
        const x = parseInt(document.getElementById('crop-x').value) || 0;
        const y = parseInt(document.getElementById('crop-y').value) || 0;
        const w = parseInt(document.getElementById('crop-w').value) || 100;
        const h = parseInt(document.getElementById('crop-h').value) || 100;
        const canvas = document.getElementById('crop-canvas');
        const scale = cropImage.width / canvas.width;
        const sx = x * scale, sy = y * scale, sw = w * scale, sh = h * scale;
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = w; resultCanvas.height = h;
        const ctx = resultCanvas.getContext('2d');
        ctx.drawImage(cropImage, sx, sy, sw, sh, 0, 0, w, h);
        const resultDiv = document.getElementById('crop-result');
        resultDiv.innerHTML = '';
        const img = document.createElement('img');
        img.src = resultCanvas.toDataURL();
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.border = '1px solid var(--border)';
        resultDiv.appendChild(img);
        resultDiv.dataset.dataUrl = resultCanvas.toDataURL();
    }
    function downloadCropped() {
        const resultDiv = document.getElementById('crop-result');
        const dataUrl = resultDiv.dataset.dataUrl;
        if (!dataUrl) { alert('请先裁剪图片'); return; }
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'cropped.png';
        a.click();
    }

    /* ══ 图片格式转换 ══ */
    let convertImage = null;
    function loadConvertImage() {
        const file = document.getElementById('img-convert-upload').files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                convertImage = img;
                const preview = document.getElementById('convert-preview');
                preview.innerHTML = '';
                const clone = img.cloneNode();
                clone.style.maxWidth = '100%';
                clone.style.maxHeight = '200px';
                clone.style.borderRadius = '8px';
                preview.appendChild(clone);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    function convertImageFormat() {
        if (!convertImage) { alert('请先上传图片'); return; }
        const format = document.getElementById('convert-format').value;
        const canvas = document.createElement('canvas');
        canvas.width = convertImage.width;
        canvas.height = convertImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(convertImage, 0, 0);
        const dataUrl = canvas.toDataURL(format);
        const preview = document.getElementById('convert-preview');
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '8px';
        preview.appendChild(img);
        preview.dataset.dataUrl = dataUrl;
        const ext = format.split('/')[1];
        preview.dataset.ext = ext === 'jpeg' ? 'jpg' : ext;
    }
    function downloadConverted() {
        const preview = document.getElementById('convert-preview');
        const dataUrl = preview.dataset.dataUrl;
        if (!dataUrl) { alert('请先转换格式'); return; }
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'converted.' + (preview.dataset.ext || 'png');
        a.click();
    }

    /* ══ 简历生成器 ══ */
    function generateResume() {
        const name = document.getElementById('resume-name').value || '未填写';
        const title = document.getElementById('resume-title').value || '';
        const phone = document.getElementById('resume-phone').value || '';
        const email = document.getElementById('resume-email').value || '';
        const summary = document.getElementById('resume-summary').value || '';
        const skills = document.getElementById('resume-skills').value || '';
        const experience = document.getElementById('resume-experience').value || '';
        const education = document.getElementById('resume-education').value || '';
        
        const html = `
            <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:var(--text);">
                <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--primary);">
                    <h2 style="margin:0;font-size:24px;">${escapeHtml(name)}</h2>
                    ${title ? `<p style="margin:4px 0 0;color:var(--text-dim);font-size:16px;">${escapeHtml(title)}</p>` : ''}
                    <p style="margin:8px 0 0;color:var(--text-dim);font-size:13px;">
                        ${phone ? escapeHtml(phone) + ' | ' : ''}${email ? escapeHtml(email) : ''}
                    </p>
                </div>
                ${summary ? `
                <div style="margin-bottom:20px;">
                    <h3 style="font-size:16px;color:var(--primary);margin-bottom:8px;">个人简介</h3>
                    <p style="line-height:1.8;color:var(--text-dim);">${escapeHtml(summary)}</p>
                </div>` : ''}
                ${skills ? `
                <div style="margin-bottom:20px;">
                    <h3 style="font-size:16px;color:var(--primary);margin-bottom:8px;">技能</h3>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${skills.split(',').map(s => `<span style="padding:4px 12px;border-radius:12px;background:rgba(99,102,241,0.15);color:var(--text);font-size:13px;">${escapeHtml(s.trim())}</span>`).join('')}
                    </div>
                </div>` : ''}
                ${experience ? `
                <div style="margin-bottom:20px;">
                    <h3 style="font-size:16px;color:var(--primary);margin-bottom:8px;">工作经历</h3>
                    ${experience.split('\n').filter(e => e.trim()).map(e => `<p style="line-height:1.8;color:var(--text-dim);margin-bottom:8px;">${escapeHtml(e)}</p>`).join('')}
                </div>` : ''}
                ${education ? `
                <div style="margin-bottom:20px;">
                    <h3 style="font-size:16px;color:var(--primary);margin-bottom:8px;">教育背景</h3>
                    <p style="line-height:1.8;color:var(--text-dim);">${escapeHtml(education)}</p>
                </div>` : ''}
            </div>
        `;
        document.getElementById('resume-output').innerHTML = html;
    }
    function printResume() {
        const content = document.getElementById('resume-output').innerHTML;
        if (!content.trim()) { alert('请先生成简历'); return; }
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>简历</title>
            <style>
                body { font-family: 'PingFang SC','Microsoft YaHei',sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
                h2 { font-size: 24px; } h3 { font-size: 16px; color: #6366f1; }
            </style></head><body>${content}</body></html>
        `);
        win.document.close();
        setTimeout(() => win.print(), 500);
    }
    
    /* ══ 反馈功能 ══ */
    
    async function openFeedbackModal() {
        if (!isAdminLoggedIn()) {
            alert('请先登录后再提交反馈');
            showLoginModal();
            return;
        }
        
        // 获取剩余反馈次数
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch('/api/feedback/remaining', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok && data.remaining !== undefined) {
                document.getElementById('feedbackRemaining').textContent = `今日还可提交 ${data.remaining} 次反馈`;
            } else {
                document.getElementById('feedbackRemaining').textContent = '今日还可提交 5 次反馈';
            }
        } catch (error) {
            document.getElementById('feedbackRemaining').textContent = '今日还可提交 5 次反馈';
        }
        
        document.getElementById('feedbackModal').style.display = 'flex';
        document.getElementById('feedbackContent').value = '';
        resetImagePreviews();
    }
    
    function hideFeedbackModal() {
        document.getElementById('feedbackModal').style.display = 'none';
    }
    
    function resetImagePreviews() {
        for (let i = 1; i <= 2; i++) {
            const preview = document.getElementById(`preview${i}`);
            const placeholder = document.querySelector(`#imageBox${i} .upload-placeholder`);
            const removeBtn = document.querySelector(`#imageBox${i} .remove-image-btn`);
            const input = document.getElementById(`image${i}`);
            if (preview) preview.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
            if (removeBtn) removeBtn.style.display = 'none';
            if (input) input.value = '';
        }
    }
    
    function previewImage(input, num) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('图片大小不能超过5MB');
                input.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById(`preview${num}`);
                const placeholder = document.querySelector(`#imageBox${num} .upload-placeholder`);
                const removeBtn = document.querySelector(`#imageBox${num} .remove-image-btn`);
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
    }
    
    function removeImage(num, event) {
        event.stopPropagation();
        const preview = document.getElementById(`preview${num}`);
        const placeholder = document.querySelector(`#imageBox${num} .upload-placeholder`);
        const removeBtn = document.querySelector(`#imageBox${num} .remove-image-btn`);
        const input = document.getElementById(`image${num}`);
        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        if (removeBtn) removeBtn.style.display = 'none';
        if (input) input.value = '';
    }
    
    async function submitFeedback() {
        const content = document.getElementById('feedbackContent').value.trim();
        if (!content) {
            alert('请输入反馈内容');
            return;
        }
        
        const formData = new FormData();
        formData.append('content', content);
        
        const image1 = document.getElementById('image1');
        const image2 = document.getElementById('image2');
        
        if (image1.files && image1.files[0]) {
            formData.append('image1', image1.files[0]);
        }
        if (image2.files && image2.files[0]) {
            formData.append('image2', image2.files[0]);
        }
        
        const token = localStorage.getItem('admin_token');
        const btn = document.getElementById('submitFeedbackBtn');
        const originalText = btn.textContent;
        btn.textContent = '提交中...';
        btn.disabled = true;
        
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await response.json();
            if (response.ok) {
                alert('反馈提交成功！感谢您的建议');
                if (data.remaining !== undefined) {
                    document.getElementById('feedbackRemaining').textContent = `今日还可提交 ${data.remaining} 次反馈`;
                }
                hideFeedbackModal();
            } else if (response.status === 429) {
                alert(data.error || '今日反馈次数已达上限');
            } else {
                alert(data.error || '提交失败，请稍后重试');
            }
        } catch (error) {
            console.error(error);
            alert('网络错误，请稍后重试');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
