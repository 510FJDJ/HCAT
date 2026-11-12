// ============================================================
// all.js — 全站統一入口，所有頁面只引入這一個檔案
// 每個區塊各自是獨立 IIFE，開頭皆以 if (!el) return; 判斷頁面是否有對應元素，
// 沒有該元素的頁面會自動跳過該區塊，因此全部頁面皆可安全引入同一份檔案。
// 維護時仍可對照下方區塊標題，單獨修改對應段落。
// ============================================================

// ------------------------------------------------------------
// 原 js/main.js
// ------------------------------------------------------------
(function () {
    'use strict';

    // ---- 版面區塊載入（header／footer 等 layout/*.html）----
    function loadLayouts() {
        var slots = document.querySelectorAll('[data-layout]');
        var pending = slots.length;

        if (pending === 0) {
            document.dispatchEvent(new CustomEvent('layout:loaded'));
            return;
        }

        slots.forEach(function (slot) {
            var layoutPath = slot.getAttribute('data-layout');
            var basePrefix = layoutPath.indexOf('../') === 0 ? '../' : '';

            fetch(layoutPath)
                .then(function (res) { return res.text(); })
                .then(function (html) {
                    // layout 內共用檔案（如 footer.html）以根目錄絕對路徑書寫，
                    // 依載入頁面的深度動態改寫成正確的相對路徑
                    html = html.replace(/(href|src)="\/(?!\/)/g, '$1="' + basePrefix);
                    slot.innerHTML = html;
                })
                .catch(function (err) {
                    console.error('載入版面失敗：' + layoutPath, err);
                })
                .finally(function () {
                    pending -= 1;
                    if (pending === 0) {
                        document.dispatchEvent(new CustomEvent('layout:loaded'));
                    }
                });
        });
    }

    // ---- 目前頁面導覽標示 ----
    function markCurrentNav() {
        var currentFile = window.location.pathname.split('/').pop() || 'index.html';
        var navLinks = document.querySelectorAll('.siteHeader-navList a, .navBar-link, .navBar-dropdownLink, .panelFull a');

        navLinks.forEach(function (link) {
            link.removeAttribute('aria-current');
            link.classList.remove('listRow-current');
            if (link.classList.contains('navBar-dropdownLink')) {
                var navItem = link.closest('.navBar-item');
                var navTrigger = navItem ? navItem.querySelector('.navBar-trigger') : null;
                if (navTrigger) { navTrigger.classList.remove('is-currentGroup'); }
            }
        });

        navLinks.forEach(function (link) {
            var href = (link.getAttribute('href') || '').split('#')[0].split('/').pop();
            if (href !== currentFile) { return; }

            link.setAttribute('aria-current', 'page');
            if (link.classList.contains('listRow') && !link.hasAttribute('data-nav-skip-current')) {
                link.classList.add('listRow-current');
            }

            if (link.classList.contains('navBar-dropdownLink')) {
                var navItem = link.closest('.navBar-item');
                var navTrigger = navItem ? navItem.querySelector('.navBar-trigger') : null;
                if (navTrigger) { navTrigger.classList.add('is-currentGroup'); }
            }
        });
    }

    // ---- 字級切換（A／A+／A++）----
    // 元件字級多為 design.md 指定的固定 px 值，改 html 的 rem 基準無法連動縮放，
    // 改用 zoom 整體等比放大（含間距），行為較接近瀏覽器縮放，各元件無須改寫。
    var FONT_SIZE_STEPS = { '1': 1, '2': 1.125, '3': 1.25 };
    var FONT_SIZE_KEY = 'hcat-font-size';
    var SECTION_SCROLL_KEY = 'hcat-scroll-target';

    function applyFontSize(size) {
        document.documentElement.style.zoom = FONT_SIZE_STEPS[size] || FONT_SIZE_STEPS['1'];

        document.querySelectorAll('[data-js="fontSize"]').forEach(function (btn) {
            btn.setAttribute('aria-pressed', btn.getAttribute('data-size') === size ? 'true' : 'false');
        });
    }

    function initFontSize() {
        var saved = window.localStorage.getItem(FONT_SIZE_KEY) || '1';
        applyFontSize(saved);

        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-js="fontSize"]') : null;
            if (!btn) { return; }
            var size = btn.getAttribute('data-size');
            applyFontSize(size);
            window.localStorage.setItem(FONT_SIZE_KEY, size);
        });
    }

    // ---- 手機版全螢幕選單 ----
    function initMobileMenu() {
        var panel = document.querySelector('[data-js="menuPanel"]');
        var trigger = document.querySelector('[data-js="menuOpen"]');
        if (!panel || !trigger) { return; }

        function openMenu() {
            panel.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            var closeBtn = panel.querySelector('[data-js="menuClose"]');
            if (closeBtn) { closeBtn.focus(); }
        }

        function closeMenu() {
            panel.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.focus();
        }

        trigger.addEventListener('click', openMenu);

        panel.addEventListener('click', function (e) {
            if (e.target.closest('[data-js="menuClose"]')) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('is-open')) {
                closeMenu();
            }
        });

    }

    // ---- 桌面主選單下拉（輔具申請／學校與帳號，點擊切換、Escape／點外部關閉）----
    function initNavDropdown() {
        var triggers = document.querySelectorAll('[data-js="navDropdown"]');
        if (triggers.length === 0) { return; }

        function closeDropdown(trigger) {
            var dropdown = document.getElementById(trigger.getAttribute('aria-controls'));
            trigger.setAttribute('aria-expanded', 'false');
            if (dropdown) { dropdown.hidden = true; }
        }

        function openDropdown(trigger) {
            var dropdown = document.getElementById(trigger.getAttribute('aria-controls'));
            trigger.setAttribute('aria-expanded', 'true');
            if (dropdown) { dropdown.hidden = false; }
        }

        function closeAll(except) {
            triggers.forEach(function (trigger) {
                if (trigger !== except) { closeDropdown(trigger); }
            });
        }

        triggers.forEach(function (trigger) {
            trigger.addEventListener('click', function () {
                var isOpen = trigger.getAttribute('aria-expanded') === 'true';
                closeAll(trigger);
                if (isOpen) {
                    closeDropdown(trigger);
                } else {
                    openDropdown(trigger);
                }
            });
        });

        document.addEventListener('click', function (e) {
            if (e.target.closest('[data-js="navDropdown"]') || e.target.closest('.navBar-dropdown')) { return; }
            closeAll(null);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { closeAll(null); }
        });
    }

    // ---- 手機選單可展開分組（輔具申請／學校與帳號）----
    function initMobileNavGroups() {
        document.querySelectorAll('[data-js="navMobileGroup"]').forEach(function (group) {
            var toggle = group.querySelector('[data-js="navMobileToggle"]');
            if (!toggle) { return; }
            var sublist = document.getElementById(toggle.getAttribute('aria-controls'));

            toggle.addEventListener('click', function () {
                var isOpen = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                group.classList.toggle('is-open', !isOpen);
                if (sublist) { sublist.hidden = isOpen; }
            });
        });
    }

    // ---- 區塊捲動連結（借用流程／友善連結，桌面導覽與手機選單共用）----
    // index.html <head> 的同步腳本會清掉網址列的錨點 hash，從其他頁面無法靠 href="index.html#flow" 自動捲動，
    // 改用 sessionStorage 暫存目標，回到首頁後讀取並捲動。
    function initScrollLinks() {
        function scrollToTarget(target) {
            var header = document.getElementById('header');
            var offset = header ? header.offsetHeight : 0;
            var top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: top < 0 ? 0 : top, behavior: 'smooth' });
        }

        document.querySelectorAll('[data-js="scrollLink"]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                var hash = link.getAttribute('href');

                var panel = link.closest('[data-js="menuPanel"]');
                if (panel) {
                    panel.classList.remove('is-open');
                    var trigger = document.querySelector('[data-js="menuOpen"]');
                    if (trigger) {
                        trigger.setAttribute('aria-expanded', 'false');
                        trigger.focus();
                    }
                }

                var currentFile = window.location.pathname.split('/').pop() || 'index.html';
                if (currentFile !== 'index.html') {
                    window.sessionStorage.setItem(SECTION_SCROLL_KEY, hash);
                    window.location.href = 'index.html';
                    return;
                }

                var target = document.querySelector(hash);
                if (target) { scrollToTarget(target); }
            });
        });

        var pendingHash = window.sessionStorage.getItem(SECTION_SCROLL_KEY);
        if (pendingHash) {
            window.sessionStorage.removeItem(SECTION_SCROLL_KEY);
            var pendingTarget = document.querySelector(pendingHash);
            if (pendingTarget) {
                window.setTimeout(function () { scrollToTarget(pendingTarget); }, 50);
            }
        }
    }

    // ---- 分類頁籤篩選（最新消息／輔具目錄，頁籤鍵盤與點擊邏輯由 js/tabs.js 統一處理）----
    function initCategoryFilter() {
        document.addEventListener('tabs:activate', function (e) {
            var tab = e.detail && e.detail.tab;
            var panel = e.detail && e.detail.panel;
            if (!tab || !panel) { return; }

            var category = tab.getAttribute('data-category');
            if (!category) { return; }

            var items = panel.querySelectorAll('[data-category]');
            if (items.length === 0) { return; }

            var visibleCount = 0;
            items.forEach(function (item) {
                var match = category === 'all' || item.getAttribute('data-category') === category;
                item.hidden = !match;
                if (match) { visibleCount += 1; }
            });

            var emptyNote = panel.querySelector('[data-js="emptyNote"]');
            if (emptyNote) {
                emptyNote.hidden = visibleCount > 0;
            }
        });
    }

    // ---- 頁首捲動收合：往下滑動收合第一排、第二排變窄，回到頁面最頂才還原 ----
    function initHeaderScroll() {
        var header = document.getElementById('header');
        if (!header) { return; }
        var collapsibles = header.querySelectorAll('.barSlim, .appBar');
        var collapseQuery = window.matchMedia('(min-width: 901px)');

        function update() {
            // 收合樣式（_navBarLogged.scss／_barSlim.scss）只在 ≥901px 生效，
            // inert 切換須對齊同一斷點，否則手機寬度選單按鈕看得到卻點不開
            var isCompact = collapseQuery.matches && window.scrollY > 0;
            header.classList.toggle('is-compact', isCompact);
            collapsibles.forEach(function (el) {
                if (isCompact) {
                    el.setAttribute('inert', '');
                } else {
                    el.removeAttribute('inert');
                }
            });
        }

        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    // ---- 回到頂部 ----
    function initBackToTop() {
        var btn = document.querySelector('[data-js="backToTop"]');
        if (!btn) { return; }

        function toggleVisibility() {
            btn.classList.toggle('is-visible', window.scrollY > 320);
        }

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        toggleVisibility();

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    document.addEventListener('layout:loaded', function () {
        markCurrentNav();
        initFontSize();
        initMobileMenu();
        initNavDropdown();
        initMobileNavGroups();
        initScrollLinks();
        initHeaderScroll();
        initBackToTop();
    });

    // 不依賴 header／footer 版面載入，頁籤本身在靜態內容裡已存在，直接初始化即可
    initCategoryFilter();

    loadLayouts();
})();

// ------------------------------------------------------------
// 原 js/tabs.js
// ------------------------------------------------------------
(function () {
    'use strict';

    // 無障礙頁籤共用邏輯（ACCESSIBILITY.md §13）：roving tabindex、方向鍵自動啟用、點擊啟用
    // 嚴禁在個別頁面另外寫 keydown／click 邏輯處理頁籤，避免與此檔衝突

    function initTabs(tablist) {
        var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
        if (tabs.length === 0) { return; }

        function activate(tab, focusTab) {
            tabs.forEach(function (t) {
                var selected = t === tab;
                t.setAttribute('aria-selected', selected ? 'true' : 'false');
                t.tabIndex = selected ? 0 : -1;
            });

            var panel = document.getElementById(tab.getAttribute('aria-controls'));
            if (panel) {
                panel.setAttribute('aria-labelledby', tab.id);
            }

            if (focusTab) { tab.focus(); }

            document.dispatchEvent(new CustomEvent('tabs:activate', {
                detail: { tab: tab, tablist: tablist, panel: panel }
            }));
        }

        tablist.addEventListener('click', function (e) {
            var tab = e.target.closest ? e.target.closest('[role="tab"]') : null;
            if (!tab || tabs.indexOf(tab) === -1 || tab.getAttribute('aria-selected') === 'true') { return; }
            activate(tab, false);
        });

        tablist.addEventListener('keydown', function (e) {
            var currentIndex = tabs.indexOf(document.activeElement);
            if (currentIndex === -1) { return; }

            var targetIndex;
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    targetIndex = (currentIndex + 1) % tabs.length;
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    break;
                case 'Home':
                    targetIndex = 0;
                    break;
                case 'End':
                    targetIndex = tabs.length - 1;
                    break;
                default:
                    return;
            }

            e.preventDefault();
            activate(tabs[targetIndex], true);
        });
    }

    document.querySelectorAll('[role="tablist"]').forEach(initTabs);
})();

// ------------------------------------------------------------
// 原 js/catalog.js
// ------------------------------------------------------------
(function () {
    'use strict';

    // catalog.html 專用：分類頁籤（js/tabs.js 處理鍵盤／aria）＋只看免評估＋搜尋＋排序的組合篩選
    // main.js 的 initCategoryFilter() 只處理單一分類篩選，此檔在其後重新套用完整條件覆寫結果

    var panel = document.getElementById('catalogResultsPanel');
    var grid = document.querySelector('[data-js="catalogGrid"]');
    if (!panel || !grid) { return; }

    var tablist = document.querySelector('[role="tablist"][aria-label="輔具分類"]');
    var freeOnlyCheckbox = document.querySelector('[data-js="catalogFreeOnly"]');
    var searchInput = document.querySelector('[data-js="catalogSearch"]');
    var sortSelect = document.querySelector('[data-js="catalogSort"]');
    var countNum = document.querySelector('[data-js="catalogCountNum"]');
    var emptyNote = panel.querySelector('[data-js="emptyNote"]');

    // 手機版專用控制項：分類改用下拉選單、免評估改用單一勾選，狀態仍以桌面版的 tablist／checkbox 為主
    var mobileCategorySelect = document.querySelector('[data-js="catalogMobileCategory"]');
    var freeOnlyCheckboxMobile = document.querySelector('[data-js="catalogFreeOnlyMobile"]');

    var originalOrder = Array.prototype.slice.call(grid.querySelectorAll('[data-category]'));

    function getActiveCategory() {
        var activeTab = tablist ? tablist.querySelector('[aria-selected="true"]') : null;
        return activeTab ? activeTab.getAttribute('data-category') : 'all';
    }

    function applyFilters() {
        var category = getActiveCategory();
        var freeOnly = !!((freeOnlyCheckbox && freeOnlyCheckbox.checked) || (freeOnlyCheckboxMobile && freeOnlyCheckboxMobile.checked));
        var keyword = searchInput ? searchInput.value.trim() : '';
        var visibleCount = 0;

        originalOrder.forEach(function (item) {
            var matchesCategory = category === 'all' || item.getAttribute('data-category') === category;
            var matchesFree = !freeOnly || item.getAttribute('data-free') === 'true';
            var matchesKeyword = !keyword || (item.getAttribute('data-name') || '').indexOf(keyword) !== -1;
            var visible = matchesCategory && matchesFree && matchesKeyword;

            item.hidden = !visible;
            if (visible) { visibleCount += 1; }
        });

        if (emptyNote) { emptyNote.hidden = visibleCount > 0; }
        if (countNum) { countNum.textContent = String(visibleCount); }
    }

    function applySort() {
        var mode = sortSelect ? sortSelect.value : 'category';
        var items = originalOrder;

        if (mode === 'stockDesc') {
            items = originalOrder.slice().sort(function (a, b) {
                return Number(b.getAttribute('data-stock')) - Number(a.getAttribute('data-stock'));
            });
        }

        items.forEach(function (item) { grid.appendChild(item); });
    }

    document.addEventListener('tabs:activate', function (e) {
        var tab = e.detail && e.detail.tab;
        if (!tab || !tablist || !tablist.contains(tab)) { return; }
        if (mobileCategorySelect) { mobileCategorySelect.value = tab.getAttribute('data-category') || 'all'; }
        applyFilters();
    });

    function syncFreeOnly(checked) {
        if (freeOnlyCheckbox) { freeOnlyCheckbox.checked = checked; }
        if (freeOnlyCheckboxMobile) { freeOnlyCheckboxMobile.checked = checked; }
        applyFilters();
    }

    if (freeOnlyCheckbox) {
        freeOnlyCheckbox.addEventListener('change', function () { syncFreeOnly(this.checked); });
    }

    if (freeOnlyCheckboxMobile) {
        freeOnlyCheckboxMobile.addEventListener('change', function () { syncFreeOnly(this.checked); });
    }

    if (mobileCategorySelect && tablist) {
        mobileCategorySelect.addEventListener('change', function () {
            var targetTab = tablist.querySelector('[data-category="' + this.value + '"]');
            if (targetTab && targetTab.getAttribute('aria-selected') !== 'true') {
                targetTab.click();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            applySort();
            applyFilters();
        });
    }

    applySort();
    applyFilters();
})();

// ------------------------------------------------------------
// 原 js/auth.js
// ------------------------------------------------------------
(function () {
    'use strict';

    // ---- 密碼顯示切換 ----
    function initPasswordToggle() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-js="togglePassword"]') : null;
            if (!btn) { return; }

            var input = document.getElementById(btn.getAttribute('data-target'));
            if (!input) { return; }

            var icon = btn.querySelector('.bi');
            var showing = input.type === 'text';

            input.type = showing ? 'password' : 'text';
            btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
            btn.setAttribute('aria-label', showing ? '顯示密碼' : '隱藏密碼');
            if (icon) {
                icon.classList.toggle('bi-eye', showing);
                icon.classList.toggle('bi-eye-slash', !showing);
            }
        });
    }

    // ---- 驗證碼（示範用前端亂碼，排除容易混淆的字元）----
    var CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    function generateCaptchaValue() {
        var value = '';
        for (var i = 0; i < 4; i += 1) {
            value += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
        }
        return value;
    }

    function setCaptchaValue(group, value) {
        group.dataset.value = value;
        var display = group.querySelector('[data-js="captchaText"]');
        var srText = group.querySelector('[data-js="captchaSrText"]');
        if (display) { display.textContent = value; }
        if (srText) { srText.textContent = '驗證碼圖形顯示為 ' + value.split('').join(' '); }
    }

    function initCaptcha() {
        document.querySelectorAll('[data-js="captchaGroup"]').forEach(function (group) {
            setCaptchaValue(group, generateCaptchaValue());

            var refreshBtn = group.querySelector('[data-js="captchaRefresh"]');
            var voiceBtn = group.querySelector('[data-js="captchaVoice"]');
            var input = group.querySelector('input');

            if (refreshBtn) {
                refreshBtn.addEventListener('click', function () {
                    setCaptchaValue(group, generateCaptchaValue());
                    if (input) { input.value = ''; input.focus(); }
                });
            }

            if (voiceBtn) {
                voiceBtn.addEventListener('click', function () {
                    if (!window.speechSynthesis) { return; }
                    var utterance = new SpeechSynthesisUtterance(group.dataset.value.split('').join(' '));
                    utterance.lang = 'en-US';
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                });
            }
        });
    }

    function captchaMatches(group, inputValue) {
        return !!group && (inputValue || '').toUpperCase() === (group.dataset.value || '').toUpperCase();
    }

    // ---- 對話框通用開關：bootstrap.Modal 負責遮罩、Escape、焦點交回觸發元素 ----
    function initModal(modal, triggerSelector, onOpen) {
        if (!modal) { return; }
        var instance = bootstrap.Modal.getOrCreateInstance(modal);

        document.addEventListener('click', function (e) {
            var trigger = e.target.closest ? e.target.closest(triggerSelector) : null;
            if (!trigger) { return; }
            if (onOpen) { onOpen(); }
            instance.show();
        });

        return { open: function () { instance.show(); }, close: function () { instance.hide(); } };
    }

    // ---- 忘記密碼 Modal（登入頁）----
    function initForgotPasswordModal() {
        var modal = document.querySelector('[data-js="forgotPasswordModal"]');
        if (!modal) { return; }

        var stateForm = modal.querySelector('[data-js="forgotStateForm"]');
        var stateSent = modal.querySelector('[data-js="forgotStateSent"]');
        var form = modal.querySelector('[data-js="forgotPasswordForm"]');
        var errorText = modal.querySelector('[data-js="forgotFormError"]');

        function resetToForm() {
            stateForm.hidden = false;
            stateSent.hidden = true;
            modal.setAttribute('aria-labelledby', 'forgotTitle');
            errorText.hidden = true;
            form.reset();
        }

        initModal(modal, '[data-js="openForgotPassword"]', resetToForm);

        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var account = form.querySelector('#forgotAccount');

                if (!account.value.trim()) {
                    errorText.textContent = '請輸入帳號';
                    errorText.hidden = false;
                    account.focus();
                    return;
                }

                // CLAUDE.md §6：無論帳號是否存在皆回傳相同訊息，避免帳號列舉
                stateForm.hidden = true;
                stateSent.hidden = false;
                modal.setAttribute('aria-labelledby', 'forgotSentTitle');
                modal.querySelector('[data-js="forgotStateSent"] .btnIcon').focus();
            });
        }
    }

    // ---- 資訊安全及隱私權政策 Modal（註冊頁）----
    function initPrivacyModal() {
        var modal = document.querySelector('[data-js="privacyModal"]');
        if (!modal) { return; }

        var controls = initModal(modal, '[data-js="openPrivacyModal"]');
        if (!controls) { return; }

        var agreeBtn = modal.querySelector('[data-js="policyAgree"]');
        if (agreeBtn) {
            agreeBtn.addEventListener('click', function () {
                var checkbox = document.getElementById('agreePolicy');
                if (checkbox) { checkbox.checked = true; }
                controls.close();
            });
        }
    }

    // ---- 登入表單（示範畫面，尚未串接後端）----
    function initLoginForm() {
        var form = document.querySelector('[data-js="loginForm"]');
        if (!form) { return; }

        var captchaGroup = form.querySelector('[data-js="captchaGroup"]');
        var captchaInput = form.querySelector('#loginCaptcha');
        var errorText = form.querySelector('[data-js="loginFormError"]');
        var statusText = form.querySelector('[data-js="loginFormStatus"]');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            errorText.hidden = true;
            statusText.hidden = true;

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            if (!captchaMatches(captchaGroup, captchaInput.value)) {
                errorText.textContent = '驗證碼不正確，請重新輸入';
                errorText.hidden = false;
                setCaptchaValue(captchaGroup, generateCaptchaValue());
                captchaInput.value = '';
                captchaInput.focus();
                return;
            }

            statusText.textContent = '登入成功（示範畫面，尚未串接後端）';
            statusText.hidden = false;
        });
    }

    // ---- 註冊表單 ----
    function initRegisterForm() {
        var form = document.querySelector('[data-js="registerForm"]');
        if (!form) { return; }

        var formView = document.querySelector('[data-js="registerFormView"]');
        var doneView = document.querySelector('[data-js="registerDoneView"]');
        var captchaGroup = form.querySelector('[data-js="captchaGroup"]');
        var captchaInput = form.querySelector('#registerCaptcha');
        var password = form.querySelector('#registerPassword');
        var passwordConfirm = form.querySelector('#registerPasswordConfirm');
        var passwordMatchError = form.querySelector('[data-js="passwordMatchError"]');
        var captchaError = form.querySelector('[data-js="registerFormError"]');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            passwordMatchError.hidden = true;
            captchaError.hidden = true;

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            if (password.value !== passwordConfirm.value) {
                passwordMatchError.textContent = '密碼與確認密碼不一致';
                passwordMatchError.hidden = false;
                passwordConfirm.focus();
                return;
            }

            if (!captchaMatches(captchaGroup, captchaInput.value)) {
                captchaError.textContent = '驗證碼不正確，請重新輸入';
                captchaError.hidden = false;
                setCaptchaValue(captchaGroup, generateCaptchaValue());
                captchaInput.value = '';
                captchaInput.focus();
                return;
            }

            formView.hidden = true;
            doneView.hidden = false;
            doneView.querySelector('.cardDone-title').focus();
        });
    }

    initPasswordToggle();
    initCaptcha();
    initForgotPasswordModal();
    initPrivacyModal();
    initLoginForm();
    initRegisterForm();
})();

// ------------------------------------------------------------
// 原 js/school-apply.js
// ------------------------------------------------------------
(function () {
    'use strict';

    var form = document.getElementById('applyForm');
    if (!form) { return; }

    // 輔具品項資料（暫用示意資料，正式上線改由中心後台維護的輔具清單 API 提供）
    var IT = [
        { id: 'cctv', name: '擴視機', cat: 'vision', kind: 'free', photo: 'img/devices/cctv.jpg' },
        { id: 'mag', name: '放大鏡', cat: 'vision', kind: 'general', photo: 'img/devices/magnifier.jpg' },
        { id: 'tcctv', name: '攜帶型擴視機', cat: 'vision', kind: 'free', photo: 'img/devices/portable-cctv.jpg' },
        { id: 'cane', name: '白杖', cat: 'vision', kind: 'free', field: '身高（公分）', ph: '例：140' },
        { id: 'fm', name: '調頻輔聽系統', cat: 'hearing', kind: 'hearing', photo: 'img/devices/fm-system.jpg' },
        { id: 'wheel', name: '兒童輪椅', cat: 'mobility', kind: 'general', photo: 'img/devices/wheelchair.jpg' },
        { id: 'walker', name: '助行器', cat: 'mobility', kind: 'general', photo: 'img/devices/walker.jpg' },
        { id: 'stand', name: '站立架', cat: 'mobility', kind: 'general', photo: 'img/devices/stander.jpg', stock: 0 },
        { id: 'tchair', name: 'T型椅', cat: 'mobility', kind: 'free' },
        { id: 'seat', name: '擺位椅', cat: 'mobility', kind: 'general', photo: 'img/devices/positioning-chair.jpg' },
        { id: 'helmet', name: '安全頭套', cat: 'mobility', kind: 'free', field: '頭圍（公分）', ph: '例：52' },
        { id: 'splint', name: '副木', cat: 'mobility', kind: 'free', field: '公分數', ph: '例：18' },
        { id: 'board', name: '溝通板', cat: 'comm', kind: 'general', photo: 'img/devices/communication-board.jpg', stock: 0 },
        { id: 'aac', name: '語音溝通器', cat: 'comm', kind: 'general', photo: 'img/devices/aac-device.jpg', stock: 0 },
        { id: 'touch', name: '觸摸顯示器', cat: 'computer', kind: 'free', photo: 'img/devices/touch-monitor.jpg' },
        { id: 'joy', name: '搖桿滑鼠', cat: 'computer', kind: 'general', photo: 'img/devices/joystick-mouse.jpg' },
        { id: 'guard', name: '鍵盤保護框', cat: 'computer', kind: 'general', photo: 'img/devices/keyguard.jpg' }
    ];

    var CATS = { vision: '視障輔具', hearing: '聽障輔具', mobility: '行動與擺位輔具', comm: '溝通輔具', computer: '資訊輔具' };

    var TAGS = {
        general: { text: '需評估', cls: 'tagPill tag-greyLight' },
        hearing: { text: '聽障・需聽力圖', cls: 'tagPill tag-cyanLight' },
        free: { text: '免評估', cls: 'tagPill tag-greenLight' }
    };

    function findItem(id) {
        for (var i = 0; i < IT.length; i++) {
            if (IT[i].id === id) { return IT[i]; }
        }
        return null;
    }

    // 輔具品項尚未選擇時，trigger 顯示「請選擇」；選了具體分類後顯示「請選擇ＯＯ輔具（N）」
    function pickerPlaceholderText() {
        if (state.cat === 'all') { return '請選擇'; }
        var count = 0;
        for (var i = 0; i < IT.length; i++) {
            if (IT[i].cat === state.cat) { count++; }
        }
        return '請選擇' + CATS[state.cat] + '（' + count + '）';
    }

    var state = {
        use: 'student',
        itemId: null,
        ev: 'ther',
        dis: 'yes',
        mv: 'none',
        cat: 'all',
        q: '',
        pickOpen: false
    };

    function q(name) { return form.querySelector('[data-js="' + name + '"]'); }
    function qa(name) { return form.querySelectorAll('[data-js="' + name + '"]'); }

    var el = {
        schoolUseNotice: q('schooluse-notice'),
        pickerCat: q('picker-cat'),
        pickerTrigger: q('picker-trigger'),
        pickerThumbImg: q('picker-thumb-img'),
        pickerThumbEmpty: q('picker-thumb-empty'),
        pickerName: q('picker-name'),
        pickerTag: q('picker-tag'),
        pickerCatLabel: q('picker-cat-label'),
        pickerPanel: q('picker-panel'),
        pickerSearch: q('picker-search'),
        pickerList: q('picker-list'),
        pickerRestock: q('picker-restock'),
        pickerRestockName: q('picker-restock-name'),
        sectionStudent: q('section-student'),
        selBadge: q('sel-badge'),
        sectionHearing: q('section-hearing'),
        hearingBadge: q('hearing-badge'),
        disDetail: q('dis-detail'),
        mvLocal: q('mv-local'),
        mvOther: q('mv-other'),
        mvStage: q('mv-stage'),
        mvSchool: q('mv-school'),
        detBadge: q('det-badge'),
        detItemNameWrap: q('det-item-name-wrap'),
        detItemName: q('det-item-name'),
        detEmptyHint: q('det-empty-hint'),
        detGeneral: q('det-general'),
        detHearing: q('det-hearing'),
        detFree: q('det-free'),
        freeName: q('free-name'),
        freeFieldWrap: q('free-field-wrap'),
        freeFieldLabel: q('free-field-label'),
        freeFieldInput: q('free-field-input'),
        sectionEval: q('section-eval'),
        evalBadge: q('eval-badge'),
        evTherapist: q('ev-therapist'),
        evCenter: q('ev-center'),
        submitBtn: q('submit-btn')
    };

    // ------------------------------------------------------------
    // 主要內容渲染：依目前 state 切換所有條件區塊的顯示與文字
    // ------------------------------------------------------------
    function render() {
        var cur = state.itemId ? findItem(state.itemId) : null;

        // 校內使用只能選免評估品項，切到校內使用時若目前品項不是免評估，改選第一個免評估品項
        if (state.use === 'school' && cur && cur.kind !== 'free') {
            state.itemId = 'tcctv';
            cur = findItem(state.itemId);
        }

        if (el.schoolUseNotice) { el.schoolUseNotice.hidden = state.use !== 'school'; }

        if (cur) {
            if (cur.photo) {
                if (el.pickerThumbImg) {
                    el.pickerThumbImg.src = '../' + cur.photo;
                    el.pickerThumbImg.hidden = false;
                }
                if (el.pickerThumbEmpty) { el.pickerThumbEmpty.hidden = true; }
            } else {
                if (el.pickerThumbImg) { el.pickerThumbImg.hidden = true; }
                if (el.pickerThumbEmpty) { el.pickerThumbEmpty.hidden = false; }
            }
            if (el.pickerName) {
                el.pickerName.textContent = cur.name;
                el.pickerName.className = 'comboPicker-selected-name';
            }
            if (el.pickerTag) {
                var tag = TAGS[cur.kind];
                el.pickerTag.textContent = tag.text;
                el.pickerTag.className = tag.cls;
                el.pickerTag.hidden = false;
            }
            if (el.pickerCatLabel) {
                el.pickerCatLabel.textContent = CATS[cur.cat];
                el.pickerCatLabel.hidden = false;
            }

            var isRestock = cur.stock === 0 && state.use === 'student';
            if (el.pickerRestock) { el.pickerRestock.hidden = !isRestock; }
            if (isRestock && el.pickerRestockName) {
                el.pickerRestockName.textContent = '「' + cur.name + '」目前沒有可借庫存，送出後會列為增購需求';
            }
        } else {
            if (el.pickerThumbImg) { el.pickerThumbImg.hidden = true; }
            if (el.pickerThumbEmpty) { el.pickerThumbEmpty.hidden = false; }
            if (el.pickerName) {
                el.pickerName.textContent = pickerPlaceholderText();
                el.pickerName.className = 'comboPicker-selected-placeholder';
            }
            if (el.pickerTag) { el.pickerTag.hidden = true; }
            if (el.pickerCatLabel) { el.pickerCatLabel.hidden = true; }
            if (el.pickerRestock) { el.pickerRestock.hidden = true; }
        }

        var isHearing = !!cur && cur.kind === 'hearing';
        var nSel = state.use === 'student' ? 3 : 2;
        var nHearing = nSel + 1;
        var nDet = isHearing ? nHearing + 1 : nHearing;
        var nEv = nDet + 1;
        if (el.selBadge) { el.selBadge.textContent = String(nSel); }
        if (el.hearingBadge) { el.hearingBadge.textContent = String(nHearing); }
        if (el.detBadge) { el.detBadge.textContent = String(nDet); }
        if (el.evalBadge) { el.evalBadge.textContent = String(nEv); }

        if (el.detItemNameWrap) { el.detItemNameWrap.hidden = !cur; }
        if (cur && el.detItemName) { el.detItemName.textContent = cur.name; }
        if (el.detEmptyHint) { el.detEmptyHint.hidden = !!cur; }

        if (el.sectionStudent) { el.sectionStudent.hidden = state.use !== 'student'; }
        if (el.sectionHearing) { el.sectionHearing.hidden = !isHearing; }

        if (el.detGeneral) { el.detGeneral.hidden = !cur || cur.kind !== 'general'; }
        if (el.detHearing) { el.detHearing.hidden = !cur || cur.kind !== 'hearing'; }
        if (el.detFree) { el.detFree.hidden = !cur || cur.kind !== 'free'; }

        if (cur && cur.kind === 'free') {
            if (el.freeName) { el.freeName.textContent = cur.name; }
            var hasField = !!cur.field;
            if (el.freeFieldWrap) { el.freeFieldWrap.hidden = !hasField; }
            if (hasField) {
                if (el.freeFieldLabel) { el.freeFieldLabel.textContent = cur.field; }
                if (el.freeFieldInput) { el.freeFieldInput.placeholder = cur.ph || ''; }
            }
        }

        if (el.sectionEval) { el.sectionEval.hidden = !cur || cur.kind !== 'general'; }
        if (el.evTherapist) { el.evTherapist.hidden = state.ev !== 'ther'; }
        if (el.evCenter) { el.evCenter.hidden = state.ev !== 'center'; }

        if (el.disDetail) { el.disDetail.hidden = state.dis !== 'yes'; }
        if (el.mvLocal) { el.mvLocal.hidden = state.mv !== 'local'; }
        if (el.mvOther) { el.mvOther.hidden = state.mv !== 'other'; }

        renderPickerList();
    }

    // ------------------------------------------------------------
    // 輔具品項下拉清單：依分類與關鍵字過濾、依分類分組渲染
    // ------------------------------------------------------------
    function renderPickerList() {
        if (!el.pickerList) { return; }

        var kw = state.q.trim();
        var filtered = IT.filter(function (item) {
            if (state.cat !== 'all' && item.cat !== state.cat) { return false; }
            if (kw && item.name.indexOf(kw) === -1) { return false; }
            return true;
        });

        el.pickerList.innerHTML = '';

        if (filtered.length === 0) {
            var empty = document.createElement('li');
            empty.className = 'comboPicker-empty';
            empty.textContent = '找不到符合的輔具品項';
            el.pickerList.appendChild(empty);
            return;
        }

        var order = [];
        var groups = {};
        filtered.forEach(function (item) {
            if (!groups[item.cat]) {
                groups[item.cat] = [];
                order.push(item.cat);
            }
            groups[item.cat].push(item);
        });

        order.forEach(function (catKey) {
            var groupLi = document.createElement('li');
            groupLi.className = 'comboPicker-groupList';

            var label = document.createElement('p');
            label.className = 'comboPicker-groupLabel';
            label.textContent = CATS[catKey];
            groupLi.appendChild(label);

            var ul = document.createElement('ul');

            groups[catKey].forEach(function (item) {
                var disabled = state.use === 'school' && item.kind !== 'free';

                var li = document.createElement('li');
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'comboPicker-item';
                btn.setAttribute('aria-pressed', item.id === state.itemId ? 'true' : 'false');
                if (disabled) { btn.setAttribute('aria-disabled', 'true'); }

                if (item.photo) {
                    var img = document.createElement('img');
                    img.className = 'comboPicker-item-thumb';
                    img.src = '../' + item.photo;
                    img.alt = '';
                    btn.appendChild(img);
                } else {
                    var emptyThumb = document.createElement('span');
                    emptyThumb.className = 'comboPicker-item-thumb-empty';
                    emptyThumb.setAttribute('aria-hidden', 'true');
                    btn.appendChild(emptyThumb);
                }

                var nameSpan = document.createElement('span');
                nameSpan.className = 'comboPicker-item-name';
                nameSpan.textContent = item.name;
                btn.appendChild(nameSpan);

                var itemTag = TAGS[item.kind];
                var tagSpan = document.createElement('span');
                tagSpan.className = itemTag.cls;
                tagSpan.textContent = itemTag.text;
                btn.appendChild(tagSpan);

                btn.addEventListener('click', function () {
                    if (disabled) { return; }
                    state.itemId = item.id;
                    closePicker();
                    el.pickerTrigger.focus();
                    render();
                });

                li.appendChild(btn);
                ul.appendChild(li);
            });

            groupLi.appendChild(ul);
            el.pickerList.appendChild(groupLi);
        });
    }

    // ------------------------------------------------------------
    // 輔具品項下拉開關（比照 js/main.js 的 initNavDropdown 模式）
    // ------------------------------------------------------------
    function openPicker() {
        state.pickOpen = true;
        if (el.pickerTrigger) { el.pickerTrigger.setAttribute('aria-expanded', 'true'); }
        if (el.pickerPanel) { el.pickerPanel.hidden = false; }
    }

    function closePicker() {
        state.pickOpen = false;
        if (el.pickerTrigger) { el.pickerTrigger.setAttribute('aria-expanded', 'false'); }
        if (el.pickerPanel) { el.pickerPanel.hidden = true; }
    }

    if (el.pickerTrigger) {
        el.pickerTrigger.addEventListener('click', function () {
            if (state.pickOpen) { closePicker(); } else { openPicker(); }
        });
    }

    document.addEventListener('click', function (e) {
        if (!state.pickOpen) { return; }
        if (e.target.closest('[data-js="picker-trigger"]') || e.target.closest('[data-js="picker-panel"]')) { return; }
        closePicker();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && state.pickOpen) {
            closePicker();
            if (el.pickerTrigger) { el.pickerTrigger.focus(); }
        }
    });

    if (el.pickerCat) {
        el.pickerCat.addEventListener('change', function () {
            state.cat = el.pickerCat.value;
            state.itemId = null;
            render();
        });
    }

    if (el.pickerSearch) {
        el.pickerSearch.addEventListener('input', function () {
            state.q = el.pickerSearch.value;
            renderPickerList();
        });
    }

    // ------------------------------------------------------------
    // 卡片式單選群組：切換 .is-selected 外觀並同步 state
    // ------------------------------------------------------------
    function wireCardGroup(radioName, cardName, onChange) {
        qa(radioName).forEach(function (radio) {
            radio.addEventListener('change', function () {
                qa(cardName).forEach(function (card) { card.classList.remove('is-selected'); });
                var label = radio.closest('label');
                if (label) { label.classList.add('is-selected'); }
                onChange(radio.value);
                render();
            });
        });
    }

    wireCardGroup('use-radio', 'use-card', function (v) { state.use = v; });
    wireCardGroup('ev-radio', 'ev-card', function (v) { state.ev = v; });
    wireCardGroup('mv-radio', 'mv-card', function (v) { state.mv = v; });

    // 轉入本縣學校：依學制篩選學校清單（比照「借用中輔具」轉銜續借 modal 的作法）
    var MV_STAGE_LABEL = { k: '幼兒園', e: '國小', j: '國中', h: '高中職' };
    var MV_STAGE_SCHOOLS = {
        k: ['竹北市 竹北國小附設幼兒園', '竹東鎮 竹東國小附設幼兒園', '湖口鄉 湖口國小附設幼兒園', '縣立 竹北幼兒園'],
        e: ['竹北市 博愛國小', '竹北市 東海國小', '竹北市 十興國小', '竹東鎮 竹東國小', '湖口鄉 湖口國小', '新豐鄉 新豐國小'],
        j: ['竹北市 竹北國中', '竹北市 博愛國中', '竹東鎮 竹東國中', '新豐鄉 新豐國中'],
        h: ['縣立 湖口高中', '縣立 竹北高中', '縣立 六家高中']
    };

    function renderMvSchoolOptions(stage) {
        var options = MV_STAGE_SCHOOLS[stage] || [];
        var html = '<option value="">請選擇' + MV_STAGE_LABEL[stage] + '</option>';
        options.forEach(function (name) { html += '<option>' + name + '</option>'; });
        el.mvSchool.innerHTML = html;
    }

    if (el.mvStage && el.mvSchool) {
        el.mvStage.addEventListener('change', function () { renderMvSchoolOptions(el.mvStage.value); });
    }

    qa('dis-radio').forEach(function (radio) {
        radio.addEventListener('change', function () {
            state.dis = radio.value;
            render();
        });
    });

    // ------------------------------------------------------------
    // 檔案上傳：點擊或拖曳皆可選檔，上傳後顯示可刪除的檔案列表（fileRow 外型）
    // ------------------------------------------------------------
    function formatFileSize(bytes) {
        if (bytes < 1024) { return bytes + ' B'; }
        if (bytes < 1024 * 1024) { return Math.round(bytes / 1024) + ' KB'; }
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function fileExt(file) {
        var m = file.name.match(/\.([a-zA-Z0-9]+)$/);
        return m ? m[1].toUpperCase() : '檔案';
    }

    function fileIconClass(file) {
        var ext = fileExt(file).toLowerCase();
        if (ext === 'pdf') { return 'bi-file-earmark-pdf'; }
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) { return 'bi-file-earmark-image'; }
        return 'bi-file-earmark-text';
    }

    function createFileRow(file, onDelete) {
        var row = document.createElement('div');
        row.className = 'fileRow fileRow-upload';

        var icon = document.createElement('span');
        icon.className = 'fileRow-icon';
        icon.setAttribute('aria-hidden', 'true');
        var iconI = document.createElement('i');
        iconI.className = 'bi ' + fileIconClass(file);
        icon.appendChild(iconI);

        var body = document.createElement('span');
        body.className = 'fileRow-body';
        var nameEl = document.createElement('span');
        nameEl.className = 'fileRow-name';
        nameEl.textContent = file.name;
        var metaEl = document.createElement('span');
        metaEl.className = 'fileRow-meta';
        metaEl.textContent = fileExt(file) + '．' + formatFileSize(file.size);
        body.appendChild(nameEl);
        body.appendChild(metaEl);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'fileRow-delete';
        delBtn.setAttribute('aria-label', '刪除檔案 ' + file.name);
        var delI = document.createElement('i');
        delI.className = 'bi bi-trash3';
        delI.setAttribute('aria-hidden', 'true');
        delBtn.appendChild(delI);
        delBtn.addEventListener('click', onDelete);

        row.appendChild(icon);
        row.appendChild(body);
        row.appendChild(delBtn);
        return row;
    }

    // multiple 為 false 時，新選取或拖曳的檔案會取代現有檔案（input 本身沒有 multiple 屬性）
    function wireFileUpload(label, input, listEl, multiple) {
        if (!label || !input || !listEl) { return; }
        var files = [];

        function sync() {
            var dt = new DataTransfer();
            files.forEach(function (f) { dt.items.add(f); });
            input.files = dt.files;
        }

        function renderList() {
            listEl.innerHTML = '';
            listEl.hidden = files.length === 0;
            files.forEach(function (file, i) {
                listEl.appendChild(createFileRow(file, function () {
                    files.splice(i, 1);
                    sync();
                    renderList();
                }));
            });
        }

        function addFiles(list) {
            var incoming = Array.prototype.slice.call(list);
            if (!incoming.length) { return; }
            files = multiple ? files.concat(incoming) : incoming.slice(0, 1);
            sync();
            renderList();
        }

        input.addEventListener('change', function () { addFiles(input.files); });

        ['dragenter', 'dragover'].forEach(function (evt) {
            label.addEventListener(evt, function (e) {
                e.preventDefault();
                label.classList.add('is-dragover');
            });
        });

        ['dragleave', 'dragend'].forEach(function (evt) {
            label.addEventListener(evt, function () { label.classList.remove('is-dragover'); });
        });

        label.addEventListener('drop', function (e) {
            e.preventDefault();
            label.classList.remove('is-dragover');
            if (e.dataTransfer) { addFiles(e.dataTransfer.files); }
        });
    }

    wireFileUpload(document.querySelector('label[for="evFile"]'), document.getElementById('evFile'), q('ev-file-list'), true);
    wireFileUpload(document.querySelector('label[for="disFile"]'), document.getElementById('disFile'), q('dis-file-list'), true);
    wireFileUpload(document.querySelector('label[for="hrFile"]'), document.getElementById('hrFile'), q('hr-file-list'), false);

    // ------------------------------------------------------------
    // 送出申請成功 Modal
    // ------------------------------------------------------------
    var modal = document.querySelector('[data-js="doneModal"]');
    var modalInstance = modal ? bootstrap.Modal.getOrCreateInstance(modal) : null;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (modalInstance) { modalInstance.show(); }
    });

    var recordsBtn = document.querySelector('[data-js="done-modal-records"]');
    if (recordsBtn) {
        recordsBtn.addEventListener('click', function () {
            if (modalInstance) { modalInstance.hide(); }
            window.location.href = 'records.html';
        });
    }

    render();
})();

// ------------------------------------------------------------
// 原 js/school-temp-borrow.js
// ------------------------------------------------------------
(function () {
    'use strict';

    var IT = [
        { id: 'wheel', name: '兒童輪椅', cat: 'mobility', catLabel: '行動與擺位輔具', stock: 4, photo: 'wheelchair.jpg' },
        { id: 'walker', name: '助行器', cat: 'mobility', catLabel: '行動與擺位輔具', stock: 5, photo: 'walker.jpg' },
        { id: 'cctv', name: '擴視機', cat: 'vision', catLabel: '視障輔具', stock: 3, photo: 'cctv.jpg' },
        { id: 'mag', name: '放大鏡', cat: 'vision', catLabel: '視障輔具', stock: 12, photo: 'magnifier.jpg' },
        { id: 'cane', name: '白杖', cat: 'vision', catLabel: '視障輔具', stock: 6, photo: null },
        { id: 'tcctv', name: '攜帶型擴視機', cat: 'vision', catLabel: '視障輔具', stock: 0, photo: 'portable-cctv.jpg' }
    ];

    function findItem(id) {
        for (var i = 0; i < IT.length; i++) if (IT[i].id === id) return IT[i];
        return null;
    }

    function stockTag(item) {
        return item.stock === 0
            ? { text: '目前已借完', cls: 'tagPill tag-greyLight' }
            : { text: '在庫 ' + item.stock + ' 台', cls: 'tagPill tag-greenLight' };
    }

    var state = { itemId: null, q: '', pickOpen: false };

    function q(name) { return document.querySelector('[data-js="' + name + '"]'); }
    function qa(name) { return document.querySelectorAll('[data-js="' + name + '"]'); }

    var el = {
        form: document.getElementById('tempBorrowForm'),
        pickerTrigger: q('picker-trigger'),
        pickerThumbImg: q('picker-thumb-img'),
        pickerThumbEmpty: q('picker-thumb-empty'),
        pickerName: q('picker-name'),
        pickerTag: q('picker-tag'),
        pickerCatLabel: q('picker-cat-label'),
        pickerPanel: q('picker-panel'),
        pickerSearch: q('picker-search'),
        pickerList: q('picker-list'),
        submitBtn: q('submit-btn'),
        doneModal: q('doneModal'),
        doneModalRecords: q('done-modal-records')
    };

    if (!el.form) { return; }

    function render() {
        var item = state.itemId ? findItem(state.itemId) : null;

        if (!item) {
            el.pickerName.textContent = '請選擇';
            el.pickerThumbImg.hidden = true;
            el.pickerThumbEmpty.hidden = false;
            el.pickerTag.hidden = true;
            el.pickerCatLabel.hidden = true;
            return;
        }

        el.pickerName.textContent = item.name;

        if (item.photo) {
            el.pickerThumbImg.src = '../img/devices/' + item.photo;
            el.pickerThumbImg.hidden = false;
            el.pickerThumbEmpty.hidden = true;
        } else {
            el.pickerThumbImg.hidden = true;
            el.pickerThumbEmpty.hidden = false;
        }

        var tag = stockTag(item);
        el.pickerTag.textContent = tag.text;
        el.pickerTag.className = tag.cls;
        el.pickerTag.hidden = false;

        el.pickerCatLabel.textContent = item.catLabel;
        el.pickerCatLabel.hidden = false;
    }

    function renderPickerList() {
        var groups = [];
        var byCat = {};
        var keyword = state.q.trim();

        IT.forEach(function (item) {
            if (keyword && item.name.indexOf(keyword) === -1) return;
            if (!byCat[item.cat]) {
                byCat[item.cat] = { label: item.catLabel, items: [] };
                groups.push(byCat[item.cat]);
            }
            byCat[item.cat].items.push(item);
        });

        el.pickerList.innerHTML = '';

        if (!groups.length) {
            var empty = document.createElement('li');
            empty.className = 'comboPicker-empty';
            empty.textContent = '沒有符合的輔具';
            el.pickerList.appendChild(empty);
            return;
        }

        groups.forEach(function (group) {
            var head = document.createElement('li');
            head.className = 'comboPicker-groupLabel';
            head.setAttribute('role', 'presentation');
            head.textContent = group.label;
            el.pickerList.appendChild(head);

            group.items.forEach(function (item) {
                var li = document.createElement('li');
                var disabled = item.stock === 0;
                var tag = stockTag(item);

                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'comboPicker-item';
                btn.setAttribute('aria-pressed', state.itemId === item.id ? 'true' : 'false');
                if (disabled) btn.setAttribute('aria-disabled', 'true');

                var thumbHtml = item.photo
                    ? '<img class="comboPicker-thumb" src="../img/devices/' + item.photo + '" alt="">'
                    : '<span class="comboPicker-thumb-empty" aria-hidden="true"></span>';

                btn.innerHTML =
                    thumbHtml +
                    '<span class="comboPicker-item-name">' + item.name + '</span>' +
                    '<span class="' + tag.cls + '">' + tag.text + '</span>';

                btn.addEventListener('click', function () {
                    if (disabled) return;
                    state.itemId = item.id;
                    render();
                    closePicker();
                });

                li.appendChild(btn);
                el.pickerList.appendChild(li);
            });
        });
    }

    function openPicker() {
        state.pickOpen = true;
        el.pickerPanel.hidden = false;
        el.pickerTrigger.setAttribute('aria-expanded', 'true');
        renderPickerList();
        el.pickerSearch.value = '';
        state.q = '';
        el.pickerSearch.focus();
        document.addEventListener('click', onOutsideClick, true);
        document.addEventListener('keydown', onPickerKeydown, true);
    }

    function closePicker() {
        state.pickOpen = false;
        el.pickerPanel.hidden = true;
        el.pickerTrigger.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onOutsideClick, true);
        document.removeEventListener('keydown', onPickerKeydown, true);
    }

    function onOutsideClick(e) {
        if (el.pickerPanel.contains(e.target) || el.pickerTrigger.contains(e.target)) return;
        closePicker();
    }

    function onPickerKeydown(e) {
        if (e.key === 'Escape') {
            closePicker();
            el.pickerTrigger.focus();
        }
    }

    el.pickerTrigger.addEventListener('click', function () {
        if (state.pickOpen) closePicker();
        else openPicker();
    });

    el.pickerSearch.addEventListener('input', function () {
        state.q = el.pickerSearch.value;
        renderPickerList();
    });

    function wireCardGroup(cardName, radioName) {
        var cards = qa(cardName);
        var radios = qa(radioName);

        function sync() {
            radios.forEach(function (radio, i) {
                cards[i].classList.toggle('is-selected', radio.checked);
            });
        }

        radios.forEach(function (radio) {
            radio.addEventListener('change', sync);
        });

        sync();
    }

    wireCardGroup('tev-card', 'tev-radio');

    var doneModalInstance = el.doneModal ? bootstrap.Modal.getOrCreateInstance(el.doneModal) : null;

    el.doneModalRecords.addEventListener('click', function () {
        if (doneModalInstance) { doneModalInstance.hide(); }
        window.location.href = 'records.html';
    });

    el.form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (doneModalInstance) { doneModalInstance.show(); }
    });

    render();
})();

// ------------------------------------------------------------
// 原 js/school-borrowing.js
// ------------------------------------------------------------
// ============================================================
// school/borrowing.html 專屬邏輯：輔具報修 modal、歸還．轉銜申請 modal
// Modal 開關、檔案上傳比照 js/records.js／js/school-apply.js 既有慣例
// ============================================================
(function () {
    'use strict';

    // ------------------------------------------------------------
    // 檔案列表（比照 js/records.js 的 fileRow 渲染方式，這裡允許多檔、上限 5 個）
    // ------------------------------------------------------------
    function formatFileSize(bytes) {
        if (bytes < 1024) { return bytes + ' B'; }
        if (bytes < 1024 * 1024) { return Math.round(bytes / 1024) + ' KB'; }
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function fileExt(file) {
        var m = file.name.match(/\.([a-zA-Z0-9]+)$/);
        return m ? m[1].toUpperCase() : '檔案';
    }

    function fileIconClass(file) {
        var ext = fileExt(file).toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) { return 'bi-file-earmark-image'; }
        if (['mp4', 'mov', 'webm'].indexOf(ext) !== -1) { return 'bi-file-earmark-play'; }
        return 'bi-file-earmark-text';
    }

    function createFileRow(file, onDelete) {
        var row = document.createElement('div');
        row.className = 'fileRow fileRow-upload';

        var icon = document.createElement('span');
        icon.className = 'fileRow-icon';
        icon.setAttribute('aria-hidden', 'true');
        var iconI = document.createElement('i');
        iconI.className = 'bi ' + fileIconClass(file);
        icon.appendChild(iconI);

        var body = document.createElement('span');
        body.className = 'fileRow-body';
        var nameEl = document.createElement('span');
        nameEl.className = 'fileRow-name';
        nameEl.textContent = file.name;
        var metaEl = document.createElement('span');
        metaEl.className = 'fileRow-meta';
        metaEl.textContent = fileExt(file) + '．' + formatFileSize(file.size);
        body.appendChild(nameEl);
        body.appendChild(metaEl);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'fileRow-delete';
        delBtn.setAttribute('aria-label', '刪除檔案 ' + file.name);
        var delI = document.createElement('i');
        delI.className = 'bi bi-trash3';
        delI.setAttribute('aria-hidden', 'true');
        delBtn.appendChild(delI);
        delBtn.addEventListener('click', onDelete);

        row.appendChild(icon);
        row.appendChild(body);
        row.appendChild(delBtn);
        return row;
    }

    // 最多 5 個檔案：超過上限時只取前 5 個
    function wireFileUpload(label, input, listEl, maxFiles) {
        if (!label || !input || !listEl) { return null; }
        var files = [];

        function sync() {
            var dt = new DataTransfer();
            files.forEach(function (f) { dt.items.add(f); });
            input.files = dt.files;
        }

        function renderList() {
            listEl.innerHTML = '';
            listEl.hidden = files.length === 0;
            files.forEach(function (file, i) {
                listEl.appendChild(createFileRow(file, function () {
                    files.splice(i, 1);
                    sync();
                    renderList();
                }));
            });
        }

        function addFiles(list) {
            var incoming = Array.prototype.slice.call(list);
            if (!incoming.length) { return; }
            files = files.concat(incoming).slice(0, maxFiles);
            sync();
            renderList();
        }

        function reset() {
            files = [];
            sync();
            renderList();
        }

        input.addEventListener('change', function () { addFiles(input.files); });

        ['dragenter', 'dragover'].forEach(function (evt) {
            label.addEventListener(evt, function (e) {
                e.preventDefault();
                label.classList.add('is-dragover');
            });
        });

        ['dragleave', 'dragend'].forEach(function (evt) {
            label.addEventListener(evt, function () { label.classList.remove('is-dragover'); });
        });

        label.addEventListener('drop', function (e) {
            e.preventDefault();
            label.classList.remove('is-dragover');
            if (e.dataTransfer) { addFiles(e.dataTransfer.files); }
        });

        return { reset: reset };
    }

    // ------------------------------------------------------------
    // 輔具報修 modal
    // ------------------------------------------------------------
    var repairModal = document.querySelector('[data-js="repairModal"]');

    if (repairModal) {
        var repairUpload = wireFileUpload(
            document.querySelector('label[for="rpMedia"]'),
            document.getElementById('rpMedia'),
            document.querySelector('[data-js="rpFileList"]'),
            5
        );

        var repairModalInstance = bootstrap.Modal.getOrCreateInstance(repairModal);

        function openRepairModal(trigger) {
            var device = trigger.getAttribute('data-device') || '';
            var property = trigger.getAttribute('data-property') || '';
            var user = trigger.getAttribute('data-user') || '';
            var photo = trigger.getAttribute('data-photo') || '';

            repairModal.querySelector('[data-js="rpDevice"]').textContent = device + '　' + property;
            repairModal.querySelector('[data-js="rpUser"]').textContent = user;
            var photoEl = repairModal.querySelector('[data-js="rpPhoto"]');
            photoEl.src = photo;
            photoEl.alt = device;

            document.getElementById('rpDesc').value = '';
            document.getElementById('rpCalled').checked = false;
            if (repairUpload) { repairUpload.reset(); }

            repairModalInstance.show();
        }

        document.querySelectorAll('[data-js="borrowingRepair"]').forEach(function (btn) {
            btn.addEventListener('click', function () { openRepairModal(btn); });
        });

        var repairSubmit = repairModal.querySelector('[data-js="repairSubmit"]');
        if (repairSubmit) {
            repairSubmit.addEventListener('click', function () { repairModalInstance.hide(); });
        }
    }

    // ------------------------------------------------------------
    // 歸還．轉銜申請 modal
    // ------------------------------------------------------------
    var changeModal = document.querySelector('[data-js="changeModal"]');

    if (changeModal) {
        var STAGE_LABEL = { k: '幼兒園', e: '國小', j: '國中', h: '高中職' };
        var STAGE_SCHOOLS = {
            k: ['竹北市 竹北國小附設幼兒園', '竹東鎮 竹東國小附設幼兒園', '湖口鄉 湖口國小附設幼兒園', '縣立 竹北幼兒園'],
            e: ['竹北市 博愛國小', '竹北市 東海國小', '竹北市 十興國小', '竹東鎮 竹東國小', '湖口鄉 湖口國小', '新豐鄉 新豐國小'],
            j: ['竹北市 竹北國中', '竹北市 博愛國中', '竹東鎮 竹東國中', '新豐鄉 新豐國中'],
            h: ['縣立 湖口高中', '縣立 竹北高中', '縣立 六家高中']
        };

        var KIND_NOTE = {
            grad: '送出後由中心審核。核准後請到「申請紀錄」下載歸還單，簽章後上傳。',
            transfer: '送出後由中心審核，核准後這項輔具會轉到新學校名下，由新學校繼續借用。',
            stop: '送出後由中心審核。核准後請到「申請紀錄」下載歸還單，簽章後上傳。'
        };

        var KIND_NOTE_PH = {
            grad: '例：配件已整理齊全，可安排收回時間',
            transfer: '例：新學校承辦人姓名、聯絡電話',
            stop: '例：學生改用學校現有設備'
        };

        var chStage = document.getElementById('chStage');
        var chSchool = document.getElementById('chSchool');

        function renderSchoolOptions(stage) {
            var options = STAGE_SCHOOLS[stage] || [];
            var html = '<option value="">請選擇' + STAGE_LABEL[stage] + '</option>';
            options.forEach(function (name) { html += '<option>' + name + '</option>'; });
            chSchool.innerHTML = html;
        }

        if (chStage && chSchool) {
            chStage.addEventListener('change', function () { renderSchoolOptions(chStage.value); });
        }

        function setKind(kind) {
            changeModal.querySelector('[data-js="ch-transfer"]').hidden = kind !== 'transfer';
            changeModal.querySelector('[data-js="ch-grad"]').hidden = kind !== 'grad';
            changeModal.querySelector('[data-js="ch-stop"]').hidden = kind !== 'stop';
            changeModal.querySelector('[data-js="chNoteText"]').textContent = KIND_NOTE[kind];
            changeModal.querySelector('[data-js="ch-notePh"]').setAttribute('placeholder', KIND_NOTE_PH[kind]);
        }

        // 卡片式單選群組：切換 .is-selected 外觀並同步顯示對應的子欄位（比照 js/school-apply.js 的 wireCardGroup）
        changeModal.querySelectorAll('[data-js="ch-radio"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                changeModal.querySelectorAll('[data-js="ch-card"]').forEach(function (card) { card.classList.remove('is-selected'); });
                var label = radio.closest('label');
                if (label) { label.classList.add('is-selected'); }
                setKind(radio.value);
            });
        });

        var changeModalInstance = bootstrap.Modal.getOrCreateInstance(changeModal);

        function openChangeModal(trigger) {
            var device = trigger.getAttribute('data-device') || '';
            var property = trigger.getAttribute('data-property') || '';
            var user = trigger.getAttribute('data-user') || '';

            changeModal.querySelector('[data-js="chSubtitle"]').textContent = device + '　' + property + '｜' + user;

            // 每次開啟都重置為預設選項「畢業歸還」
            var gradRadio = changeModal.querySelector('input[name="chKind"][value="grad"]');
            gradRadio.checked = true;
            changeModal.querySelectorAll('[data-js="ch-card"]').forEach(function (card) { card.classList.remove('is-selected'); });
            var gradLabel = gradRadio.closest('label');
            if (gradLabel) { gradLabel.classList.add('is-selected'); }
            setKind('grad');

            if (chStage) {
                chStage.value = 'e';
                renderSchoolOptions('e');
            }
            document.getElementById('chNote').value = '';

            changeModalInstance.show();
        }

        document.querySelectorAll('[data-js="borrowingChange"]').forEach(function (btn) {
            btn.addEventListener('click', function () { openChangeModal(btn); });
        });

        var changeSubmit = changeModal.querySelector('[data-js="changeSubmit"]');
        if (changeSubmit) {
            changeSubmit.addEventListener('click', function () { changeModalInstance.hide(); });
        }
    }
})();

// ------------------------------------------------------------
// 原 js/records.js
// ------------------------------------------------------------
// ============================================================
// school/records.html 專屬邏輯：上傳簽核申請表／簽章借用單 modal
// 頁籤篩選交由 js/tabs.js（鍵盤操作）＋ js/main.js 的 initCategoryFilter 處理，這裡不重複寫
// ============================================================
(function () {
    'use strict';

    var modal = document.querySelector('[data-js="uploadModal"]');
    if (!modal) { return; }

    function formatFileSize(bytes) {
        if (bytes < 1024) { return bytes + ' B'; }
        if (bytes < 1024 * 1024) { return Math.round(bytes / 1024) + ' KB'; }
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function fileExt(file) {
        var m = file.name.match(/\.([a-zA-Z0-9]+)$/);
        return m ? m[1].toUpperCase() : '檔案';
    }

    function fileIconClass(file) {
        var ext = fileExt(file).toLowerCase();
        if (ext === 'pdf') { return 'bi-file-earmark-pdf'; }
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) { return 'bi-file-earmark-image'; }
        return 'bi-file-earmark-text';
    }

    function createFileRow(file, onDelete) {
        var row = document.createElement('div');
        row.className = 'fileRow fileRow-upload';

        var icon = document.createElement('span');
        icon.className = 'fileRow-icon';
        icon.setAttribute('aria-hidden', 'true');
        var iconI = document.createElement('i');
        iconI.className = 'bi ' + fileIconClass(file);
        icon.appendChild(iconI);

        var body = document.createElement('span');
        body.className = 'fileRow-body';
        var nameEl = document.createElement('span');
        nameEl.className = 'fileRow-name';
        nameEl.textContent = file.name;
        var metaEl = document.createElement('span');
        metaEl.className = 'fileRow-meta';
        metaEl.textContent = fileExt(file) + '．' + formatFileSize(file.size);
        body.appendChild(nameEl);
        body.appendChild(metaEl);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'fileRow-delete';
        delBtn.setAttribute('aria-label', '刪除檔案 ' + file.name);
        var delI = document.createElement('i');
        delI.className = 'bi bi-trash3';
        delI.setAttribute('aria-hidden', 'true');
        delBtn.appendChild(delI);
        delBtn.addEventListener('click', onDelete);

        row.appendChild(icon);
        row.appendChild(body);
        row.appendChild(delBtn);
        return row;
    }

    // ------------------------------------------------------------
    // 申請流程卡：全螢幕尺寸皆可收合，預設收合
    // ------------------------------------------------------------
    var flowToggle = document.querySelector('[data-js="flowToggle"]');
    var flowBody = document.querySelector('[data-js="flowBody"]');

    if (flowToggle && flowBody) {
        flowToggle.addEventListener('click', function () {
            var expanded = flowToggle.getAttribute('aria-expanded') === 'true';
            flowToggle.setAttribute('aria-expanded', String(!expanded));
            flowBody.classList.toggle('is-collapsed', expanded);
        });
    }

    // ------------------------------------------------------------
    // 固定最後兩欄（.dataTable--stickyEnd2）：量測最後一欄實際寬度，寫入 CSS 變數
    // 供倒數第二欄的 right 位移對齊；一個頁面可能有多張表格（如分頁籤各自一張），逐一處理
    // ------------------------------------------------------------
    document.querySelectorAll('.dataTable--stickyEnd2').forEach(function (stickyTable) {
        var stickyLastHeadCell = stickyTable.querySelector('thead th:last-child');
        if (!stickyLastHeadCell) { return; }

        var syncStickyTable = function () {
            stickyTable.style.setProperty('--dataTable-lastColWidth', stickyLastHeadCell.getBoundingClientRect().width + 'px');
        };

        if (window.ResizeObserver) {
            // 欄寬會隨字型載入完成、切換狀態頁籤（顯示／隱藏不同按鈕文字長度的列）、視窗縮放而變動，
            // 用 ResizeObserver 直接監看表格尺寸變化，一次處理所有情境
            var stickyObserver = new ResizeObserver(syncStickyTable);
            stickyObserver.observe(stickyTable);
        } else {
            syncStickyTable();
            window.addEventListener('resize', syncStickyTable);
            document.addEventListener('tabs:activate', syncStickyTable);
        }
    });

    // ------------------------------------------------------------
    // 單檔上傳（新選取或拖曳的檔案會取代現有檔案）
    // ------------------------------------------------------------
    var uploadInput = document.getElementById('uploadFile');
    var uploadLabel = document.querySelector('label[for="uploadFile"]');
    var uploadList = document.querySelector('[data-js="uploadFileList"]');
    var files = [];

    function syncInput() {
        var dt = new DataTransfer();
        files.forEach(function (f) { dt.items.add(f); });
        uploadInput.files = dt.files;
    }

    function renderFileList() {
        uploadList.innerHTML = '';
        uploadList.hidden = files.length === 0;
        files.forEach(function (file, i) {
            uploadList.appendChild(createFileRow(file, function () {
                files.splice(i, 1);
                syncInput();
                renderFileList();
            }));
        });
    }

    function addFiles(list) {
        var incoming = Array.prototype.slice.call(list);
        if (!incoming.length) { return; }
        files = incoming.slice(0, 1);
        syncInput();
        renderFileList();
    }

    if (uploadInput && uploadLabel && uploadList) {
        uploadInput.addEventListener('change', function () { addFiles(uploadInput.files); });

        ['dragenter', 'dragover'].forEach(function (evt) {
            uploadLabel.addEventListener(evt, function (e) {
                e.preventDefault();
                uploadLabel.classList.add('is-dragover');
            });
        });

        ['dragleave', 'dragend'].forEach(function (evt) {
            uploadLabel.addEventListener(evt, function () { uploadLabel.classList.remove('is-dragover'); });
        });

        uploadLabel.addEventListener('drop', function (e) {
            e.preventDefault();
            uploadLabel.classList.remove('is-dragover');
            if (e.dataTransfer) { addFiles(e.dataTransfer.files); }
        });
    }

    // ------------------------------------------------------------
    // 步驟軌跡：依點擊的按鈕是第 1 步（簽核申請表）或第 3 步（簽章借用單）切換目前位置
    // ------------------------------------------------------------
    function setStep(step) {
        var items = modal.querySelectorAll('.stepTracker-item');
        items.forEach(function (item, i) {
            var isActive = i === step - 1;
            if (isActive) {
                item.setAttribute('aria-current', 'step');
            } else {
                item.removeAttribute('aria-current');
            }
            item.querySelector('.stepTracker-circle').classList.toggle('is-active', isActive);
            item.querySelector('.stepTracker-label').classList.toggle('is-active', isActive);
        });
    }

    // 第 3、5 步的文字依「借用」或「歸還」流程切換，其餘步驟固定不變
    function setStepLabels(isReturn) {
        modal.querySelector('[data-js="upStep3Label"]').textContent = isReturn ? '簽章歸還單' : '簽章借用單';
        modal.querySelector('[data-js="upStep5Label"]').textContent = isReturn ? '完成歸還' : '開始借用';
    }

    // ------------------------------------------------------------
    // Modal 開關：內容依觸發按鈕動態帶入，開啟前先寫入資料再呼叫 bootstrap.Modal
    // ------------------------------------------------------------
    var modalInstance = bootstrap.Modal.getOrCreateInstance(modal);

    function openModal(trigger) {
        files = [];
        syncInput();
        renderFileList();

        var step = parseInt(trigger.getAttribute('data-step'), 10);
        var isReturn = trigger.getAttribute('data-kind') === 'return';
        var app = trigger.getAttribute('data-app') || '';
        var device = trigger.getAttribute('data-device') || '';
        var student = trigger.getAttribute('data-student') || '';
        var property = trigger.getAttribute('data-property') || '';
        var returnDate = trigger.getAttribute('data-return') || '';
        var docName = step === 1 ? '申請表' : (isReturn ? '歸還單' : '借用單');

        modal.querySelector('[data-js="upTitle"]').textContent = step === 1 ? '上傳簽核後的申請表' : ('上傳簽章後的' + docName);
        modal.querySelector('[data-js="upSubtitle"]').textContent = '申請編號 ' + app + '｜' + student + '・' + device;
        modal.querySelector('[data-js="upSubmitText"]').textContent = step === 1 ? '給中心審核' : '給中心確認';

        var docSummary = modal.querySelector('[data-js="upDocSummary"]');
        docSummary.hidden = step !== 3;
        if (step === 3) {
            modal.querySelector('[data-js="upDocTitle"]').textContent = '請核對' + docName + '內容';
            modal.querySelector('[data-js="upReturnLabel"]').textContent = isReturn ? '歸還日期' : '預計歸還日';
            modal.querySelector('[data-js="upProperty"]').textContent = property || '－';
            modal.querySelector('[data-js="upDevice"]').textContent = device || '－';
            modal.querySelector('[data-js="upStudent"]').textContent = student || '－';
            modal.querySelector('[data-js="upReturn"]').textContent = returnDate || '－';
        }

        setStepLabels(isReturn);
        setStep(step);

        modalInstance.show();
    }

    document.querySelectorAll('[data-js="recordsUpload"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openModal(btn); });
    });

    var submitBtn = modal.querySelector('[data-js="uploadSubmit"]');
    if (submitBtn) {
        submitBtn.addEventListener('click', function () { modalInstance.hide(); });
    }
})();

// ------------------------------------------------------------
// 原 js/school-repairs.js
// ------------------------------------------------------------
// ============================================================
// school/repairs.html 專屬邏輯：報修明細 modal（進度步驟、照片放大／下載、處理紀錄）
// Modal 開關比照 js/records.js／js/school-borrowing.js 既有慣例
// ============================================================
(function () {
    'use strict';

    var modal = document.querySelector('[data-js="repairDetailModal"]');
    if (!modal) { return; }

    // 各進度對應四個步驟的狀態：done／active／error／pending（未標示則為 pending）
    var STEP_STATES = {
        assigned: ['done', 'active', 'pending', 'pending'],
        repairing: ['done', 'done', 'active', 'pending'],
        done: ['done', 'done', 'done', 'done'],
        failed: ['done', 'done', 'done', 'error']
    };

    function setSteps(status) {
        var states = STEP_STATES[status] || STEP_STATES.assigned;

        modal.querySelector('[data-js="rdStep4Label"]').textContent = status === 'failed' ? '無法修復' : '完成維修';

        states.forEach(function (state, i) {
            var item = modal.querySelector('[data-js="rdStep-' + (i + 1) + '"]');
            if (!item) { return; }

            var circle = item.querySelector('.stepTracker-circle');
            var label = item.querySelector('.stepTracker-label');

            circle.classList.remove('is-active', 'is-done', 'is-error');
            label.classList.remove('is-active', 'is-done', 'is-error');
            item.classList.remove('stepTracker-item--lineDone');
            item.removeAttribute('aria-current');
            circle.textContent = String(i + 1);

            if (state === 'active') {
                circle.classList.add('is-active');
                label.classList.add('is-active');
                item.setAttribute('aria-current', 'step');
            } else if (state === 'done') {
                circle.classList.add('is-done');
                circle.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i>';
                label.classList.add('is-done');
            } else if (state === 'error') {
                circle.classList.add('is-error');
                circle.innerHTML = '<i class="bi bi-exclamation" aria-hidden="true"></i>';
                label.classList.add('is-error');
            }

            // 已完成或進行中的步驟前方連接線一併轉為青綠色，標示「已走過」
            var prevState = states[i - 1];
            if (i > 0 && prevState && prevState !== 'pending') {
                item.classList.add('stepTracker-item--lineDone');
            }
        });
    }

    // ------------------------------------------------------------
    // 照片縮圖／放大檢視：同一個 modal 內切換顯示，不另開第二層 modal
    // ------------------------------------------------------------
    var photoGrid = modal.querySelector('[data-js="rdPhotoGrid"]');
    var photoViewer = modal.querySelector('[data-js="rdPhotoViewer"]');
    var photoViewerImg = modal.querySelector('[data-js="rdPhotoViewerImg"]');
    var photoDownload = modal.querySelector('[data-js="rdPhotoDownload"]');
    var photoBack = modal.querySelector('[data-js="rdPhotoBack"]');

    function openPhotoViewer(src, name) {
        photoViewerImg.src = src;
        photoViewerImg.alt = name;
        photoDownload.href = src;
        photoDownload.setAttribute('download', name);
        photoGrid.hidden = true;
        photoViewer.hidden = false;
    }

    function closePhotoViewer() {
        photoViewer.hidden = true;
        photoGrid.hidden = false;
    }

    if (photoBack) {
        photoBack.addEventListener('click', closePhotoViewer);
    }

    function renderPhoto(src, name) {
        photoGrid.innerHTML = '';
        closePhotoViewer();

        if (!src) {
            var empty = document.createElement('p');
            empty.className = 'textNote';
            empty.textContent = '尚無照片';
            photoGrid.appendChild(empty);
            return;
        }

        var thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'photoLightbox-thumb';
        thumb.setAttribute('aria-label', '放大檢視照片：' + name);

        var img = document.createElement('img');
        img.src = src;
        img.alt = '';

        var overlay = document.createElement('span');
        overlay.className = 'photoLightbox-thumb-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<i class="bi bi-zoom-in"></i>';

        thumb.appendChild(img);
        thumb.appendChild(overlay);
        thumb.addEventListener('click', function () { openPhotoViewer(src, name); });

        photoGrid.appendChild(thumb);
    }

    // ------------------------------------------------------------
    // 處理紀錄：由觸發按鈕的 data-log（JSON 陣列）渲染，由新到舊
    // ------------------------------------------------------------
    function renderLog(log) {
        var list = modal.querySelector('[data-js="rdLog"]');
        list.innerHTML = '';

        log.forEach(function (entry) {
            var item = document.createElement('li');
            item.className = 'repairLog-item';

            var date = document.createElement('span');
            date.className = 'repairLog-date';
            date.textContent = entry.date;

            var text = document.createElement('span');
            text.className = 'repairLog-text';
            text.textContent = entry.text;

            item.appendChild(date);
            item.appendChild(text);
            list.appendChild(item);
        });
    }

    // ------------------------------------------------------------
    // Modal 開關：內容依觸發按鈕動態帶入
    // ------------------------------------------------------------
    var modalInstance = bootstrap.Modal.getOrCreateInstance(modal);

    function openDetailModal(trigger) {
        var caseNo = trigger.getAttribute('data-case') || '';
        var device = trigger.getAttribute('data-device') || '';
        var property = trigger.getAttribute('data-property') || '';
        var photo = trigger.getAttribute('data-photo') || '';
        var desc = trigger.getAttribute('data-desc') || '－';
        var vendor = trigger.getAttribute('data-vendor') || '－';
        var vendorTel = trigger.getAttribute('data-vendor-tel') || '－';
        var contact = trigger.getAttribute('data-contact') || '－';
        var called = trigger.getAttribute('data-called') || '－';
        var status = trigger.getAttribute('data-status') || 'assigned';
        var log = [];

        try {
            log = JSON.parse(trigger.getAttribute('data-log') || '[]');
        } catch (e) {
            log = [];
        }

        modal.querySelector('[data-js="rdSubtitle"]').textContent = '報修編號 ' + caseNo + '｜' + device + '・' + property;
        modal.querySelector('[data-js="rdVendor"]').textContent = vendor;
        modal.querySelector('[data-js="rdVendorTel"]').textContent = vendorTel;
        modal.querySelector('[data-js="rdContact"]').textContent = contact;
        modal.querySelector('[data-js="rdCalled"]').textContent = called;
        modal.querySelector('[data-js="rdDesc"]').textContent = desc;
        modal.querySelector('[data-js="rdFailNote"]').hidden = status !== 'failed';

        setSteps(status);
        renderPhoto(photo, device);
        renderLog(log);

        modalInstance.show();
    }

    document.querySelectorAll('[data-js="repairsDetail"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openDetailModal(btn); });
    });
})();

// ------------------------------------------------------------
// 原 js/school-staff.js
// ------------------------------------------------------------
// ============================================================
// school/staff.html 專屬邏輯：輔具管理人員清單的新增／編輯／移除
// Modal 開關比照 js/school-borrowing.js 既有慣例（bootstrap.Modal.getOrCreateInstance）
// ============================================================
(function () {
    'use strict';

    var staffList = document.querySelector('[data-js="staffList"]');
    if (!staffList) { return; }

    function buildStaffRow(data) {
        var row = document.createElement('div');
        row.className = 'staffRow';
        row.setAttribute('data-js', 'staffRow');

        var main = document.createElement('div');
        main.className = 'staffRow-main';
        var nameLine = document.createElement('div');
        nameLine.className = 'staffRow-nameLine';
        var nameEl = document.createElement('span');
        nameEl.className = 'staffRow-name';
        nameEl.textContent = data.name;
        var titleEl = document.createElement('span');
        titleEl.className = 'staffRow-title';
        titleEl.textContent = data.title;
        nameLine.appendChild(nameEl);
        nameLine.appendChild(titleEl);
        main.appendChild(nameLine);
        row.appendChild(main);

        var contact = document.createElement('div');
        contact.className = 'staffRow-contact';
        var phoneEl = document.createElement('span');
        phoneEl.textContent = data.ext ? (data.phone + ' 分機' + data.ext) : data.phone;
        var emailEl = document.createElement('span');
        emailEl.textContent = data.email;
        contact.appendChild(phoneEl);
        contact.appendChild(emailEl);
        row.appendChild(contact);

        var badges = document.createElement('div');
        badges.className = 'staffRow-badges';
        if (data.primary) {
            var primaryTag = document.createElement('span');
            primaryTag.className = 'tagPill tag-goldLight tagPill-withIcon';
            var starIcon = document.createElement('i');
            starIcon.className = 'bi bi-star-fill';
            starIcon.setAttribute('aria-hidden', 'true');
            primaryTag.appendChild(starIcon);
            primaryTag.appendChild(document.createTextNode('主要聯絡人'));
            badges.appendChild(primaryTag);
        }
        var openIdTag = document.createElement('span');
        openIdTag.className = 'tagPill tag-greyLight';
        openIdTag.textContent = '教育部 OpenID';
        badges.appendChild(openIdTag);
        row.appendChild(badges);

        var actions = document.createElement('div');
        actions.className = 'staffRow-actions';

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'staffRow-iconBtn';
        editBtn.setAttribute('data-js', 'staffEditOpen');
        editBtn.setAttribute('data-name', data.name);
        editBtn.setAttribute('data-title', data.title);
        editBtn.setAttribute('data-phone', data.phone);
        editBtn.setAttribute('data-ext', data.ext || '');
        editBtn.setAttribute('data-email', data.email);
        editBtn.setAttribute('data-primary', data.primary ? 'true' : 'false');
        editBtn.setAttribute('aria-label', '編輯 ' + data.name);
        var editIcon = document.createElement('i');
        editIcon.className = 'bi bi-pencil';
        editIcon.setAttribute('aria-hidden', 'true');
        editBtn.appendChild(editIcon);
        actions.appendChild(editBtn);

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'staffRow-iconBtn staffRow-iconBtn-danger';
        deleteBtn.setAttribute('data-js', 'staffDeleteOpen');
        deleteBtn.setAttribute('data-name', data.name);
        deleteBtn.setAttribute('aria-label', '移除 ' + data.name);
        var deleteIcon = document.createElement('i');
        deleteIcon.className = 'bi bi-trash3';
        deleteIcon.setAttribute('aria-hidden', 'true');
        deleteBtn.appendChild(deleteIcon);
        actions.appendChild(deleteBtn);

        row.appendChild(actions);

        return row;
    }

    function clearOtherPrimaryBadges() {
        staffList.querySelectorAll('[data-js="staffRow"]').forEach(function (row) {
            var editBtn = row.querySelector('[data-js="staffEditOpen"]');
            if (editBtn) { editBtn.setAttribute('data-primary', 'false'); }

            var badges = row.querySelector('.staffRow-badges');
            var primaryTag = badges && badges.querySelector('.tag-goldLight');
            if (primaryTag) { primaryTag.remove(); }

            var deleteBtn = row.querySelector('.staffRow-iconBtn-danger');
            if (deleteBtn && deleteBtn.getAttribute('aria-disabled') === 'true') {
                deleteBtn.removeAttribute('aria-disabled');
                deleteBtn.removeAttribute('aria-describedby');
                deleteBtn.setAttribute('data-js', 'staffDeleteOpen');
                deleteBtn.setAttribute('data-name', editBtn ? editBtn.getAttribute('data-name') : '');
            }
        });
    }

    // ------------------------------------------------------------
    // 新增管理人員 modal
    // ------------------------------------------------------------
    var addModalEl = document.querySelector('[data-js="addStaffModal"]');
    var addForm = document.getElementById('addStaffForm');

    if (addModalEl && addForm) {
        var addModalInstance = bootstrap.Modal.getOrCreateInstance(addModalEl);
        var addOpenBtn = document.querySelector('[data-js="staffAddOpen"]');
        var pickerTrigger = document.querySelector('[data-js="staffPickerTrigger"]');
        var pickerTriggerText = document.querySelector('[data-js="staffPickerTriggerText"]');
        var pickerPanel = document.querySelector('[data-js="staffPickerPanel"]');
        var pickerSearch = document.getElementById('staffPickerSearch');
        var pickerItems = Array.prototype.slice.call(document.querySelectorAll('[data-js="staffPickerItem"]'));
        var pickerEmpty = document.querySelector('[data-js="staffPickerEmpty"]');
        var pickerValue = document.getElementById('staffPickerValue');
        var pickerError = document.querySelector('[data-js="staffPickerError"]');
        var pickerSelected = document.querySelector('[data-js="staffPickerSelected"]');
        var pickerSelectedName = document.querySelector('[data-js="staffPickerSelectedName"]');
        var pickerSelectedTitle = document.querySelector('[data-js="staffPickerSelectedTitle"]');
        var pickerSelectedEmail = document.querySelector('[data-js="staffPickerSelectedEmail"]');
        var asTitleInput = document.getElementById('asTitle');
        var pickerOpen = false;

        function openPicker() {
            pickerOpen = true;
            if (pickerTrigger) { pickerTrigger.setAttribute('aria-expanded', 'true'); }
            if (pickerPanel) { pickerPanel.hidden = false; }
        }

        function closePicker() {
            pickerOpen = false;
            if (pickerTrigger) { pickerTrigger.setAttribute('aria-expanded', 'false'); }
            if (pickerPanel) { pickerPanel.hidden = true; }
        }

        function resetPicker() {
            if (pickerValue) { pickerValue.value = ''; }
            pickerItems.forEach(function (item) {
                item.hidden = false;
                item.setAttribute('aria-pressed', 'false');
            });
            if (pickerEmpty) { pickerEmpty.hidden = true; }
            if (pickerSearch) { pickerSearch.value = ''; }
            if (pickerTriggerText) {
                pickerTriggerText.textContent = '請選擇人員';
                pickerTriggerText.className = 'staffPicker-trigger-placeholder';
            }
            if (pickerSelected) { pickerSelected.hidden = true; }
            if (pickerError) { pickerError.hidden = true; }
            closePicker();
        }

        if (addOpenBtn) {
            addOpenBtn.addEventListener('click', function () {
                addForm.reset();
                resetPicker();
                addModalInstance.show();
            });
        }

        if (pickerTrigger) {
            pickerTrigger.addEventListener('click', function () {
                if (pickerOpen) { closePicker(); } else { openPicker(); }
            });
        }

        document.addEventListener('click', function (e) {
            if (!pickerOpen) { return; }
            if (e.target.closest('[data-js="staffPickerTrigger"]') || e.target.closest('[data-js="staffPickerPanel"]')) { return; }
            closePicker();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && pickerOpen) {
                closePicker();
                if (pickerTrigger) { pickerTrigger.focus(); }
            }
        });

        if (pickerSearch) {
            pickerSearch.addEventListener('input', function () {
                var keyword = pickerSearch.value.trim();
                var visibleCount = 0;
                pickerItems.forEach(function (item) {
                    var match = item.getAttribute('data-filter').indexOf(keyword) !== -1;
                    item.hidden = !match;
                    if (match) { visibleCount += 1; }
                });
                if (pickerEmpty) { pickerEmpty.hidden = visibleCount !== 0; }
            });
        }

        pickerItems.forEach(function (item) {
            item.addEventListener('click', function () {
                var name = item.getAttribute('data-name');
                var title = item.getAttribute('data-title');
                var email = item.getAttribute('data-email');

                pickerItems.forEach(function (other) {
                    other.setAttribute('aria-pressed', other === item ? 'true' : 'false');
                });

                if (pickerValue) { pickerValue.value = name + '|' + title + '|' + email; }
                if (pickerError) { pickerError.hidden = true; }

                if (pickerTriggerText) {
                    pickerTriggerText.textContent = name;
                    pickerTriggerText.className = 'staffPicker-trigger-value';
                }

                if (pickerSelected) { pickerSelected.hidden = false; }
                if (pickerSelectedName) { pickerSelectedName.textContent = name; }
                if (pickerSelectedTitle) { pickerSelectedTitle.textContent = title; }
                if (pickerSelectedEmail) { pickerSelectedEmail.textContent = email; }

                if (asTitleInput && !asTitleInput.value) { asTitleInput.value = title; }

                closePicker();
                pickerTrigger.focus();
            });
        });

        addForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!pickerValue || !pickerValue.value) {
                if (pickerError) { pickerError.hidden = false; }
                if (pickerTrigger) { pickerTrigger.focus(); }
                return;
            }
            var parts = pickerValue.value.split('|');
            var isPrimary = document.getElementById('asPrimary').checked;

            if (isPrimary) { clearOtherPrimaryBadges(); }

            var row = buildStaffRow({
                name: parts[0],
                title: document.getElementById('asTitle').value || parts[1],
                phone: '03-5551234',
                ext: document.getElementById('asExt').value,
                email: parts[2],
                primary: isPrimary
            });
            staffList.appendChild(row);

            addModalInstance.hide();
        });
    }

    // ------------------------------------------------------------
    // 編輯管理人員 modal
    // ------------------------------------------------------------
    var editModalEl = document.querySelector('[data-js="editStaffModal"]');
    var editForm = document.getElementById('editStaffForm');
    var currentEditRow = null;

    if (editModalEl && editForm) {
        var editModalInstance = bootstrap.Modal.getOrCreateInstance(editModalEl);

        function openEditModal(trigger) {
            currentEditRow = trigger.closest('[data-js="staffRow"]');
            var name = trigger.getAttribute('data-name') || '';
            var email = trigger.getAttribute('data-email') || '';

            document.querySelector('[data-js="esAvatar"]').textContent = name.charAt(0);
            document.querySelector('[data-js="esName"]').textContent = name;
            document.querySelector('[data-js="esEmail"]').textContent = email;
            document.getElementById('esTitle').value = trigger.getAttribute('data-title') || '';
            document.getElementById('esExt').value = trigger.getAttribute('data-ext') || '';
            document.getElementById('esPrimary').checked = trigger.getAttribute('data-primary') === 'true';

            editModalInstance.show();
        }

        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!currentEditRow) { return; }

            var isPrimary = document.getElementById('esPrimary').checked;
            if (isPrimary) { clearOtherPrimaryBadges(); }

            var title = document.getElementById('esTitle').value;
            var ext = document.getElementById('esExt').value;

            currentEditRow.querySelector('.staffRow-title').textContent = title;
            var editBtn = currentEditRow.querySelector('[data-js="staffEditOpen"]');
            editBtn.setAttribute('data-title', title);
            editBtn.setAttribute('data-ext', ext);
            editBtn.setAttribute('data-primary', isPrimary ? 'true' : 'false');

            var contactSpans = currentEditRow.querySelectorAll('.staffRow-contact span');
            if (contactSpans[0]) {
                contactSpans[0].textContent = ext ? (editBtn.getAttribute('data-phone') + ' 分機' + ext) : editBtn.getAttribute('data-phone');
            }

            var badges = currentEditRow.querySelector('.staffRow-badges');
            var existingPrimaryTag = badges.querySelector('.tag-goldLight');
            if (isPrimary && !existingPrimaryTag) {
                var primaryTag = document.createElement('span');
                primaryTag.className = 'tagPill tag-goldLight tagPill-withIcon';
                var starIcon = document.createElement('i');
                starIcon.className = 'bi bi-star-fill';
                starIcon.setAttribute('aria-hidden', 'true');
                primaryTag.appendChild(starIcon);
                primaryTag.appendChild(document.createTextNode('主要聯絡人'));
                badges.insertBefore(primaryTag, badges.firstChild);
            } else if (!isPrimary && existingPrimaryTag) {
                existingPrimaryTag.remove();
            }

            editModalInstance.hide();
        });

        staffList.addEventListener('click', function (e) {
            var trigger = e.target.closest('[data-js="staffEditOpen"]');
            if (trigger) { openEditModal(trigger); }
        });
    }

    // ------------------------------------------------------------
    // 移除管理人員確認 modal
    // ------------------------------------------------------------
    var deleteModalEl = document.querySelector('[data-js="deleteStaffModal"]');
    var currentDeleteRow = null;

    if (deleteModalEl) {
        var deleteModalInstance = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
        var deleteNameEl = document.querySelector('[data-js="dsName"]');
        var deleteConfirmBtn = document.querySelector('[data-js="staffDeleteConfirm"]');

        staffList.addEventListener('click', function (e) {
            var trigger = e.target.closest('[data-js="staffDeleteOpen"]');
            if (!trigger || trigger.getAttribute('aria-disabled') === 'true') { return; }

            currentDeleteRow = trigger.closest('[data-js="staffRow"]');
            if (deleteNameEl) { deleteNameEl.textContent = trigger.getAttribute('data-name') || ''; }
            deleteModalInstance.show();
        });

        if (deleteConfirmBtn) {
            deleteConfirmBtn.addEventListener('click', function () {
                if (currentDeleteRow) {
                    currentDeleteRow.remove();
                    currentDeleteRow = null;
                }
                deleteModalInstance.hide();
            });
        }
    }
})();

// ------------------------------------------------------------
// 原 js/vendor-repairs.js
// ------------------------------------------------------------
// ============================================================
// vendor/index.html 專屬邏輯：更新進度／維修紀錄 modal 的資料填入、
// 照片縮圖與全螢幕放大檢視、更新進度表單的動態欄位與上傳檔案列表
// Modal 開關比照 js/school-repairs.js 既有慣例
// ============================================================
(function () {
    'use strict';

    var updateModalEl = document.querySelector('[data-js="vendorUpdateModal"]');
    var recordModalEl = document.querySelector('[data-js="vendorRecordModal"]');
    if (!updateModalEl || !recordModalEl) { return; }

    var STATUS_INFO = {
        pending: { cls: 'statusPill-gold', text: '待處理' },
        repairing: { cls: 'statusPill-blue', text: '維修中' },
        done: { cls: 'statusPill-green', text: '完成維修' },
        failed: { cls: 'statusPill-red', text: '無法修復' }
    };

    // ------------------------------------------------------------
    // 照片縮圖（更新進度／維修紀錄 modal 共用），點擊縮圖開啟全螢幕放大檢視
    // ------------------------------------------------------------
    function renderPhotoGrid(grid, src, name, openFn) {
        grid.innerHTML = '';
        if (!src) {
            var note = document.createElement('p');
            note.className = 'textNote';
            note.textContent = '尚無照片';
            grid.appendChild(note);
            return;
        }
        var thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'photoLightbox-thumb';
        thumb.setAttribute('aria-label', '放大檢視照片：' + name);
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        var overlay = document.createElement('span');
        overlay.className = 'photoLightbox-thumb-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<i class="bi bi-zoom-in"></i>';
        thumb.appendChild(img);
        thumb.appendChild(overlay);
        thumb.addEventListener('click', function () { openFn(src, name, thumb); });
        grid.appendChild(thumb);
    }

    // ------------------------------------------------------------
    // 全螢幕照片放大檢視：疊在對話框之上，開啟時暫時搬進目前開啟的
    // Bootstrap modal 內（維持在其焦點鎖定範圍內），關閉時搬回原位置
    // ------------------------------------------------------------
    var photoViewer = document.querySelector('[data-js="vrPhotoViewer"]');
    var pvImg = photoViewer ? photoViewer.querySelector('[data-js="vrPhotoViewerImg"]') : null;
    var pvCounter = photoViewer ? photoViewer.querySelector('[data-js="vrPhotoViewerCounter"]') : null;
    var pvDownload = photoViewer ? photoViewer.querySelector('[data-js="vrPhotoViewerDownload"]') : null;
    var pvClose = photoViewer ? photoViewer.querySelector('[data-js="vrPhotoViewerClose"]') : null;
    var pvPrev = photoViewer ? photoViewer.querySelector('[data-js="vrPhotoViewerPrev"]') : null;
    var pvNext = photoViewer ? photoViewer.querySelector('[data-js="vrPhotoViewerNext"]') : null;
    var pvReturnParent = null;
    var pvReturnNext = null;
    var pvReturnFocus = null;

    function closePhotoViewer() {
        if (!photoViewer || photoViewer.hidden) { return; }
        photoViewer.hidden = true;
        if (pvReturnParent) {
            pvReturnParent.insertBefore(photoViewer, pvReturnNext);
            pvReturnParent = null;
            pvReturnNext = null;
        }
        if (pvReturnFocus) {
            pvReturnFocus.focus();
            pvReturnFocus = null;
        }
    }

    function openPhotoViewer(src, name, trigger) {
        if (!photoViewer) { return; }
        pvImg.src = src;
        pvImg.alt = name;
        pvCounter.textContent = '照片 1 / 1';
        pvDownload.href = src;
        pvDownload.setAttribute('download', name);
        // 目前每個案件只有一張照片，上一張／下一張沒有作用對象時先隱藏
        if (pvPrev) { pvPrev.hidden = true; }
        if (pvNext) { pvNext.hidden = true; }

        // 搬進目前開啟的 modal 內，避免 Bootstrap 的焦點鎖定把焦點拉回底下的 modal
        var openModalEl = document.querySelector('.modal.show');
        if (openModalEl) {
            var content = openModalEl.querySelector('.modal-content') || openModalEl;
            pvReturnParent = photoViewer.parentNode;
            pvReturnNext = photoViewer.nextSibling;
            content.appendChild(photoViewer);
        }

        pvReturnFocus = trigger || document.activeElement;
        photoViewer.hidden = false;
        if (pvClose) { pvClose.focus(); }
    }

    if (photoViewer) {
        if (pvClose) { pvClose.addEventListener('click', closePhotoViewer); }
        photoViewer.addEventListener('click', function (e) {
            if (e.target === photoViewer) { closePhotoViewer(); }
        });
        // 搬進 modal 後，Escape 會先在這裡被攔截，避免冒泡到底下 modal 觸發 Bootstrap 自身的關閉邏輯
        photoViewer.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                e.stopPropagation();
                closePhotoViewer();
            }
        });
    }

    // ------------------------------------------------------------
    // 處理進度時間軸（維修紀錄 modal）：data-log 內的紀錄皆為已發生事件，一律標記 is-done
    // ------------------------------------------------------------
    function renderTimeline(list, log) {
        list.innerHTML = '';
        log.forEach(function (entry) {
            var item = document.createElement('li');
            item.className = 'dotTimeline-item is-done';
            var dot = document.createElement('span');
            dot.className = 'dotTimeline-dot';
            dot.setAttribute('aria-hidden', 'true');
            var content = document.createElement('div');
            content.className = 'dotTimeline-content';
            var date = document.createElement('p');
            date.className = 'dotTimeline-date';
            date.textContent = entry.date;
            var text = document.createElement('p');
            text.className = 'dotTimeline-text';
            text.textContent = entry.text;
            content.appendChild(date);
            content.appendChild(text);
            item.appendChild(dot);
            item.appendChild(content);
            list.appendChild(item);
        });
    }

    // ------------------------------------------------------------
    // 上傳檔案列表（更新進度 modal 的「上傳照片或維修報告」，選填）
    // 比照 js/school-apply.js 的 createFileRow／wireFileUpload 既有慣例
    // ------------------------------------------------------------
    function formatFileSize(bytes) {
        if (bytes < 1024) { return bytes + ' B'; }
        if (bytes < 1024 * 1024) { return Math.round(bytes / 1024) + ' KB'; }
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function fileExt(file) {
        var m = file.name.match(/\.([a-zA-Z0-9]+)$/);
        return m ? m[1].toUpperCase() : '檔案';
    }

    function fileIconClass(file) {
        var ext = fileExt(file).toLowerCase();
        if (ext === 'pdf') { return 'bi-file-earmark-pdf'; }
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) { return 'bi-file-earmark-image'; }
        return 'bi-file-earmark-text';
    }

    function createFileRow(file, onDelete) {
        var row = document.createElement('div');
        row.className = 'fileRow fileRow-upload';

        var icon = document.createElement('span');
        icon.className = 'fileRow-icon';
        icon.setAttribute('aria-hidden', 'true');
        var iconI = document.createElement('i');
        iconI.className = 'bi ' + fileIconClass(file);
        icon.appendChild(iconI);

        var body = document.createElement('span');
        body.className = 'fileRow-body';
        var nameEl = document.createElement('span');
        nameEl.className = 'fileRow-name';
        nameEl.textContent = file.name;
        var metaEl = document.createElement('span');
        metaEl.className = 'fileRow-meta';
        metaEl.textContent = fileExt(file) + '．' + formatFileSize(file.size);
        body.appendChild(nameEl);
        body.appendChild(metaEl);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'fileRow-delete';
        delBtn.setAttribute('aria-label', '刪除檔案 ' + file.name);
        var delI = document.createElement('i');
        delI.className = 'bi bi-trash3';
        delI.setAttribute('aria-hidden', 'true');
        delBtn.appendChild(delI);
        delBtn.addEventListener('click', onDelete);

        row.appendChild(icon);
        row.appendChild(body);
        row.appendChild(delBtn);
        return row;
    }

    function wireFileUpload(label, input, listEl) {
        if (!label || !input || !listEl) { return function () {}; }
        var files = [];

        function sync() {
            var dt = new DataTransfer();
            files.forEach(function (f) { dt.items.add(f); });
            input.files = dt.files;
        }

        function renderList() {
            listEl.innerHTML = '';
            listEl.hidden = files.length === 0;
            files.forEach(function (file, i) {
                listEl.appendChild(createFileRow(file, function () {
                    files.splice(i, 1);
                    sync();
                    renderList();
                }));
            });
        }

        function addFiles(list) {
            var incoming = Array.prototype.slice.call(list);
            if (!incoming.length) { return; }
            files = files.concat(incoming);
            sync();
            renderList();
        }

        input.addEventListener('change', function () { addFiles(input.files); });

        ['dragenter', 'dragover'].forEach(function (evt) {
            label.addEventListener(evt, function (e) {
                e.preventDefault();
                label.classList.add('is-dragover');
            });
        });

        ['dragleave', 'dragend'].forEach(function (evt) {
            label.addEventListener(evt, function () { label.classList.remove('is-dragover'); });
        });

        label.addEventListener('drop', function (e) {
            e.preventDefault();
            label.classList.remove('is-dragover');
            if (e.dataTransfer) { addFiles(e.dataTransfer.files); }
        });

        return function reset() {
            files = [];
            sync();
            renderList();
        };
    }

    // ------------------------------------------------------------
    // 更新進度 modal
    // ------------------------------------------------------------
    var updateModal = bootstrap.Modal.getOrCreateInstance(updateModalEl);
    var vuForm = updateModalEl.querySelector('form');
    var vuPhotoGrid = updateModalEl.querySelector('[data-js="vuPhotoGrid"]');
    var vuProgressInputs = Array.prototype.slice.call(updateModalEl.querySelectorAll('[data-js="vuProgressInput"]'));
    var vuDateField = updateModalEl.querySelector('[data-js="vuDateField"]');
    var vuDateInput = updateModalEl.querySelector('[data-js="vuDateInput"]');
    var vuFailField = updateModalEl.querySelector('[data-js="vuFailField"]');
    var vuFailReasonInput = updateModalEl.querySelector('[data-js="vuFailReasonInput"]');
    var resetVuUpload = wireFileUpload(
        updateModalEl.querySelector('label[for="vuUpload"]'),
        updateModalEl.querySelector('[data-js="vuUploadInput"]'),
        updateModalEl.querySelector('[data-js="vuUploadList"]')
    );

    // 目前進度三選一：維修中不需額外欄位，完成維修需填完成日期，無法修復需填原因
    function syncProgressFields(value) {
        var isDone = value === 'done';
        var isFailed = value === 'failed';

        vuDateField.hidden = !isDone;
        vuDateInput.required = isDone;
        if (!isDone) { vuDateInput.value = ''; }

        vuFailField.hidden = !isFailed;
        vuFailReasonInput.required = isFailed;
        if (!isFailed) { vuFailReasonInput.value = ''; }
    }

    function clearProgressSelection() {
        vuProgressInputs.forEach(function (radio) {
            var label = radio.closest('label');
            if (label) { label.classList.remove('is-selected'); }
        });
        syncProgressFields('');
    }

    vuProgressInputs.forEach(function (radio) {
        radio.addEventListener('change', function () {
            vuProgressInputs.forEach(function (r) {
                var label = r.closest('label');
                if (label) { label.classList.remove('is-selected'); }
            });
            var selectedLabel = radio.closest('label');
            if (selectedLabel) { selectedLabel.classList.add('is-selected'); }
            syncProgressFields(radio.value);
        });
    });

    function openUpdateModal(trigger) {
        var caseNo = trigger.getAttribute('data-case') || '';
        var school = trigger.getAttribute('data-school') || '－';
        var contact = trigger.getAttribute('data-contact') || '－';
        var device = trigger.getAttribute('data-device') || '－';
        var property = trigger.getAttribute('data-property') || '－';
        var desc = trigger.getAttribute('data-desc') || '－';
        var photo = trigger.getAttribute('data-photo') || '';

        updateModalEl.querySelector('[data-js="vuSubtitle"]').textContent = '報修編號 ' + caseNo;
        updateModalEl.querySelector('[data-js="vuSchool"]').textContent = school;
        updateModalEl.querySelector('[data-js="vuContact"]').textContent = contact;
        updateModalEl.querySelector('[data-js="vuDevice"]').textContent = device;
        updateModalEl.querySelector('[data-js="vuProperty"]').textContent = property;
        updateModalEl.querySelector('[data-js="vuDesc"]').textContent = desc;

        renderPhotoGrid(vuPhotoGrid, photo, device, openPhotoViewer);

        vuForm.reset();
        clearProgressSelection();
        resetVuUpload();

        updateModal.show();
    }

    vuForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!vuForm.checkValidity()) {
            vuForm.reportValidity();
            return;
        }
        updateModal.hide();
    });

    // ------------------------------------------------------------
    // 維修紀錄 modal（唯讀）
    // ------------------------------------------------------------
    var recordModal = bootstrap.Modal.getOrCreateInstance(recordModalEl);
    var vrPhotoGrid = recordModalEl.querySelector('[data-js="vrPhotoGrid"]');

    function openRecordModal(trigger) {
        var caseNo = trigger.getAttribute('data-case') || '';
        var school = trigger.getAttribute('data-school') || '－';
        var contact = trigger.getAttribute('data-contact') || '－';
        var device = trigger.getAttribute('data-device') || '－';
        var property = trigger.getAttribute('data-property') || '－';
        var desc = trigger.getAttribute('data-desc') || '－';
        var photo = trigger.getAttribute('data-photo') || '';
        var status = trigger.getAttribute('data-status') || 'pending';
        var centerNote = trigger.getAttribute('data-center-note') || '';
        var log = [];
        try { log = JSON.parse(trigger.getAttribute('data-log') || '[]'); } catch (e) { log = []; }

        var statusInfo = STATUS_INFO[status] || STATUS_INFO.pending;
        recordModalEl.querySelector('[data-js="vrStatusPill"]').className = 'statusPill ms-2 ' + statusInfo.cls;
        recordModalEl.querySelector('[data-js="vrStatusText"]').textContent = statusInfo.text;

        recordModalEl.querySelector('[data-js="vrSubtitle"]').textContent = '報修編號 ' + caseNo;
        recordModalEl.querySelector('[data-js="vrSchool"]').textContent = school;
        recordModalEl.querySelector('[data-js="vrContact"]').textContent = contact;
        recordModalEl.querySelector('[data-js="vrDevice"]').textContent = device;
        recordModalEl.querySelector('[data-js="vrProperty"]').textContent = property;
        recordModalEl.querySelector('[data-js="vrDesc"]').textContent = desc;

        var centerNoteEl = recordModalEl.querySelector('[data-js="vrCenterNote"]');
        centerNoteEl.hidden = !centerNote;
        if (centerNote) {
            recordModalEl.querySelector('[data-js="vrCenterNoteText"]').textContent = centerNote;
        }

        recordModalEl.querySelector('[data-js="vrFailNote"]').hidden = status !== 'failed';

        renderPhotoGrid(vrPhotoGrid, photo, device, openPhotoViewer);
        renderTimeline(recordModalEl.querySelector('[data-js="vrTimeline"]'), log);

        recordModal.show();
    }

    document.querySelectorAll('[data-js="vendorUpdate"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openUpdateModal(btn); });
    });

    document.querySelectorAll('[data-js="vendorRecord"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openRecordModal(btn); });
    });
})();

// ------------------------------------------------------------
// 原 js/vendor-hearing.js
// ------------------------------------------------------------
// ============================================================
// vendor/hearing.html 專屬邏輯：點交勾選／點交紀錄 modal 的資料填入，
// 配件確認格線（互動版／唯讀版共用 .checkGrid）、是否需要維修的動態欄位
// Modal 開關比照 js/vendor-repairs.js 既有慣例
// ============================================================
(function () {
    'use strict';

    var handoverModalEl = document.querySelector('[data-js="hearingHandoverModal"]');
    var recordModalEl = document.querySelector('[data-js="hearingRecordModal"]');
    if (!handoverModalEl || !recordModalEl) { return; }

    var NAMES = ['發射器', '接收器（左耳）', '接收器（右耳）', '領夾式麥克風', '頭戴式麥克風', '音源線', '充電座', '充電線', '變壓器', '收納盒', '使用說明書', '保固卡'];

    var KIND_INFO = {
        out: { cls: 'tag-blueLight', text: '借出' },
        back: { cls: 'tag-violetLight', text: '歸還' }
    };

    function parseMissing(value) {
        return (value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function subtitleText(trigger) {
        var school = trigger.getAttribute('data-school') || '－';
        var student = trigger.getAttribute('data-student') || '－';
        var device = trigger.getAttribute('data-device') || '－';
        var property = trigger.getAttribute('data-property') || '－';
        return school + '・' + student + '｜' + device + ' ' + property;
    }

    function setKindTag(el, kind) {
        var info = KIND_INFO[kind] || KIND_INFO.out;
        el.className = 'tagPill ms-2 ' + info.cls;
        el.textContent = info.text;
    }

    // ------------------------------------------------------------
    // 點交勾選 modal（互動式配件確認）
    // ------------------------------------------------------------
    var handoverModal = bootstrap.Modal.getOrCreateInstance(handoverModalEl);
    var hhForm = handoverModalEl.querySelector('form');
    var hhPartsGrid = handoverModalEl.querySelector('[data-js="hhPartsGrid"]');
    var hhPartsCount = handoverModalEl.querySelector('[data-js="hhPartsCount"]');
    var hhCheckAllBtn = handoverModalEl.querySelector('[data-js="hhCheckAll"]');
    var hhReasonField = handoverModalEl.querySelector('[data-js="hhReasonField"]');
    var hhReasonInput = handoverModalEl.querySelector('[data-js="hhReasonInput"]');

    function updatePartsCount() {
        var inputs = hhPartsGrid.querySelectorAll('.checkGrid-input');
        var checked = 0;
        inputs.forEach(function (input) { if (input.checked) { checked += 1; } });
        hhPartsCount.textContent = checked + ' / ' + NAMES.length;
    }

    function renderPartsGridInteractive(missingList) {
        hhPartsGrid.innerHTML = '';
        NAMES.forEach(function (name) {
            var isChecked = missingList.indexOf(name) === -1;
            var label = document.createElement('label');
            label.className = 'checkGrid-item' + (isChecked ? ' is-checked' : '');
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'checkGrid-input';
            input.checked = isChecked;
            input.addEventListener('change', function () {
                label.classList.toggle('is-checked', input.checked);
                updatePartsCount();
            });
            label.appendChild(input);
            label.appendChild(document.createTextNode(name));
            hhPartsGrid.appendChild(label);
        });
        updatePartsCount();
    }

    hhCheckAllBtn.addEventListener('click', function () {
        var inputs = hhPartsGrid.querySelectorAll('.checkGrid-input');
        inputs.forEach(function (input) {
            input.checked = true;
            input.closest('.checkGrid-item').classList.add('is-checked');
        });
        updatePartsCount();
    });

    // 是否需要維修：選擇「需要維修」才顯示維修說明欄位
    var hhFixInputs = Array.prototype.slice.call(handoverModalEl.querySelectorAll('[data-js="hhFixInput"]'));

    function syncFixField(value) {
        var needsFix = value === 'yes';
        hhReasonField.hidden = !needsFix;
        hhReasonInput.required = needsFix;
        if (!needsFix) { hhReasonInput.value = ''; }
    }

    function clearFixSelection() {
        hhFixInputs.forEach(function (radio) {
            var label = radio.closest('label');
            if (label) { label.classList.remove('is-selected'); }
        });
        syncFixField('');
    }

    hhFixInputs.forEach(function (radio) {
        radio.addEventListener('change', function () {
            hhFixInputs.forEach(function (r) {
                var label = r.closest('label');
                if (label) { label.classList.remove('is-selected'); }
            });
            var selectedLabel = radio.closest('label');
            if (selectedLabel) { selectedLabel.classList.add('is-selected'); }
            syncFixField(radio.value);
        });
    });

    function openHandoverModal(trigger) {
        var caseNo = trigger.getAttribute('data-case') || '';
        var kind = trigger.getAttribute('data-kind') || 'out';
        var missing = parseMissing(trigger.getAttribute('data-missing'));

        setKindTag(handoverModalEl.querySelector('[data-js="hhKindTag"]'), kind);
        handoverModalEl.querySelector('[data-js="hhSubtitle"]').textContent = subtitleText(trigger);

        hhForm.reset();
        renderPartsGridInteractive(missing);
        clearFixSelection();

        handoverModal.show();
    }

    hhForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!hhForm.checkValidity()) {
            hhForm.reportValidity();
            return;
        }
        handoverModal.hide();
    });

    // ------------------------------------------------------------
    // 點交紀錄 modal（唯讀）
    // ------------------------------------------------------------
    var recordModal = bootstrap.Modal.getOrCreateInstance(recordModalEl);
    var hrPartsGrid = recordModalEl.querySelector('[data-js="hrPartsGrid"]');
    var hrPartsCount = recordModalEl.querySelector('[data-js="hrPartsCount"]');
    var hrFixNote = recordModalEl.querySelector('[data-js="hrFixNote"]');
    var hrNoFixNote = recordModalEl.querySelector('[data-js="hrNoFixNote"]');

    function renderPartsGridStatic(missingList) {
        hrPartsGrid.innerHTML = '';
        NAMES.forEach(function (name) {
            var isChecked = missingList.indexOf(name) === -1;
            var item = document.createElement('span');
            item.className = 'checkGrid-item checkGrid-item-static' + (isChecked ? ' is-checked' : '');
            var icon = document.createElement('span');
            icon.className = 'checkGrid-icon' + (isChecked ? '' : ' checkGrid-icon-empty');
            icon.setAttribute('aria-hidden', 'true');
            var iconI = document.createElement('i');
            iconI.className = isChecked ? 'bi bi-check-lg' : 'bi bi-dash';
            icon.appendChild(iconI);
            item.appendChild(icon);
            item.appendChild(document.createTextNode(name));
            hrPartsGrid.appendChild(item);
        });
        hrPartsCount.textContent = (NAMES.length - missingList.length) + ' / ' + NAMES.length;
    }

    function openRecordModal(trigger) {
        var kind = trigger.getAttribute('data-kind') || 'out';
        var missing = parseMissing(trigger.getAttribute('data-missing'));
        var handoverTime = trigger.getAttribute('data-handover-time') || '－';
        var handoverBy = trigger.getAttribute('data-handover-by') || '－';
        var needsFix = trigger.getAttribute('data-needs-fix') === 'true';
        var repairNote = trigger.getAttribute('data-repair-note') || '';

        setKindTag(recordModalEl.querySelector('[data-js="hrKindTag"]'), kind);
        recordModalEl.querySelector('[data-js="hrSubtitle"]').textContent = subtitleText(trigger);
        recordModalEl.querySelector('[data-js="hrTimeLine"]').textContent = '點交時間 ' + handoverTime + '・' + handoverBy;

        renderPartsGridStatic(missing);

        hrFixNote.hidden = !needsFix;
        if (needsFix) {
            recordModalEl.querySelector('[data-js="hrFixNoteText"]').textContent = repairNote;
        }
        hrNoFixNote.hidden = needsFix;

        recordModal.show();
    }

    document.querySelectorAll('[data-js="hearingHandover"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openHandoverModal(btn); });
    });

    document.querySelectorAll('[data-js="hearingRecord"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openRecordModal(btn); });
    });
})();

// ------------------------------------------------------------
// center/review-detail.html 專屬邏輯：依網址 ?state= 參數切換審核卡／附件／處理紀錄的顯示內容，
// 核准／退回補件決定欄位的顯示，以及安排到校評估 modal 的評估方式自動帶出評估地點
// ------------------------------------------------------------
(function () {
    'use strict';

    var panel = document.querySelector('[data-js="rdPanel"]');
    if (!panel) { return; }

    var STATES = ['review', 'eval', 'evalDone', 'handover', 'returned', 'done'];

    var STATUS_META = {
        review: { text: '待審核', cls: 'statusPill-gold', title: '審核作業' },
        eval: { text: '待到校評估', cls: 'statusPill-blue', title: '審核作業' },
        evalDone: { text: '待審核．已評估', cls: 'statusPill-gold', title: '審核作業' },
        handover: { text: '待點交確認', cls: 'statusPill-teal', title: '點交確認' },
        returned: { text: '退回補件', cls: 'statusPill-red', title: '退回補件' },
        done: { text: '已完成', cls: 'statusPill-green', title: '審核結果' }
    };

    var PILL_CLASSES = ['statusPill-gold', 'statusPill-blue', 'statusPill-teal', 'statusPill-red', 'statusPill-green'];
    var PANEL_CLASSES = STATES.map(function (s) { return 'reviewDetail-panel-' + s; });

    var pill = document.querySelector('[data-js="rdPill"]');
    var pillText = document.querySelector('[data-js="rdPillText"]');
    var panelTitle = document.querySelector('[data-js="rdPanelTitle"]');
    var stateEls = document.querySelectorAll('[data-state-for]');

    function readState() {
        var raw = document.documentElement.getAttribute('data-preview-state');
        return STATES.indexOf(raw) === -1 ? 'review' : raw;
    }

    function setState(state) {
        var meta = STATUS_META[state];

        PILL_CLASSES.forEach(function (cls) { pill.classList.remove(cls); });
        pill.classList.add(meta.cls);
        pillText.textContent = meta.text;
        panelTitle.textContent = meta.title;

        PANEL_CLASSES.forEach(function (cls) { panel.classList.remove(cls); });
        panel.classList.add('reviewDetail-panel-' + state);

        stateEls.forEach(function (node) {
            var list = node.getAttribute('data-state-for').split(/\s+/);
            node.hidden = list.indexOf(state) === -1;
        });
    }

    setState(readState());

    // ------------------------------------------------------------
    // 審核決定：核准／退回補件（待審核、評估完成可審核才會顯示）
    // ------------------------------------------------------------
    var decisionCards = document.querySelectorAll('[data-js="rdDecisionCard"]');
    var decisionInputs = document.querySelectorAll('[data-js="rdDecisionInput"]');
    var approveFields = document.querySelector('[data-js="rdApproveFields"]');
    var noteInput = document.querySelector('[data-js="rdNoteInput"]');
    var noteRequired = document.querySelector('[data-js="rdNoteRequired"]');
    var submitBtn = document.querySelector('[data-js="rdSubmitBtn"]');

    function syncDecision() {
        decisionInputs.forEach(function (radio, i) {
            decisionCards[i].classList.toggle('is-selected', radio.checked);
            if (!radio.checked) { return; }
            var isApprove = radio.value === 'approve';
            approveFields.hidden = !isApprove;
            if (noteInput) {
                noteInput.placeholder = isApprove ? '選填，例如點交注意事項' : '請說明需要補充或修正的內容，將一併通知學校承辦人';
            }
            if (noteRequired) { noteRequired.hidden = isApprove; }
            submitBtn.textContent = isApprove ? '核准並通知學校' : '送出退回';
        });
    }

    decisionInputs.forEach(function (radio) {
        radio.addEventListener('change', syncDecision);
    });

    syncDecision();

    // 送出審核決定（示意）：核准 → 待點交確認；退回補件 → 退回補件狀態
    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            var checked = document.querySelector('[data-js="rdDecisionInput"]:checked');
            setState(checked && checked.value === 'return' ? 'returned' : 'handover');
        });
    }

    // ------------------------------------------------------------
    // 待點交確認：核對借用單無誤後才能按下確認點交；簽章有誤則轉為退回補件
    // ------------------------------------------------------------
    var handoverCheck = document.querySelector('[data-js="rdHandoverCheck"]');
    var handoverConfirm = document.querySelector('[data-js="rdHandoverConfirm"]');

    if (handoverCheck && handoverConfirm) {
        handoverCheck.addEventListener('change', function () {
            handoverConfirm.setAttribute('aria-disabled', handoverCheck.checked ? 'false' : 'true');
        });

        handoverConfirm.addEventListener('click', function () {
            if (handoverConfirm.getAttribute('aria-disabled') === 'true') { return; }
            setState('done');
        });
    }

    var handoverReject = document.querySelector('[data-js="rdHandoverReject"]');
    if (handoverReject) {
        handoverReject.addEventListener('click', function () {
            setState('returned');
        });
    }

    var cancelEvalBtn = document.querySelector('[data-js="rdCancelEval"]');
    if (cancelEvalBtn) {
        cancelEvalBtn.addEventListener('click', function () {
            setState('review');
        });
    }

    // ------------------------------------------------------------
    // 安排到校評估 modal：評估方式自動帶出對應評估地點，確認安排後轉為待到校評估狀態
    // ------------------------------------------------------------
    var scheduleModalEl = document.querySelector('[data-js="scheduleModal"]');

    if (scheduleModalEl && window.bootstrap) {
        var scheduleModal = bootstrap.Modal.getOrCreateInstance(scheduleModalEl);
        var wayCards = scheduleModalEl.querySelectorAll('[data-js="schWayCard"]');
        var wayInputs = scheduleModalEl.querySelectorAll('[data-js="schWayInput"]');
        var placeInput = scheduleModalEl.querySelector('[data-js="schPlaceInput"]');
        var scheduleForm = scheduleModalEl.querySelector('form');

        var PLACES = {
            school: '竹北國小 資源班教室',
            center: '新竹縣特殊教育資源中心',
            home: '學生住家'
        };

        wayInputs.forEach(function (radio) {
            radio.addEventListener('change', function () {
                wayInputs.forEach(function (r, j) {
                    wayCards[j].classList.toggle('is-selected', r.checked);
                });
                if (radio.checked && PLACES[radio.value]) {
                    placeInput.value = PLACES[radio.value];
                }
            });
        });

        scheduleForm.addEventListener('submit', function (e) {
            e.preventDefault();
            scheduleModal.hide();
            setState('eval');
        });
    }

    // ------------------------------------------------------------
    // 評估報告上傳（示意）：到校評估完成後，上傳紀錄即轉為「評估完成，可審核」狀態
    // ------------------------------------------------------------
    var evalUploadInput = document.querySelector('[data-js="rdEvalUploadInput"]');
    if (evalUploadInput) {
        evalUploadInput.addEventListener('change', function () {
            if (evalUploadInput.files && evalUploadInput.files.length) {
                setState('evalDone');
            }
        });
    }
})();

// ------------------------------------------------------------
// 中心端申請審核明細（center/review-detail.html）－評估報告與附件：
// 1. 中心上傳掃描檔後即時加入清單，可用實際的 blob URL 檢視／下載／刪除
// 2. 既有兩列中心上傳的靜態檔案（到校評估紀錄表、評估現場照片）也能直接刪除
// ------------------------------------------------------------
(function () {
    'use strict';

    var scanInput = document.getElementById('rdScanUpload');
    var scanList = document.querySelector('[data-js="rdScanList"]');

    if (scanInput && scanList) {
        var scanFiles = [];

        function formatFileSize(bytes) {
            if (bytes < 1024) { return bytes + ' B'; }
            if (bytes < 1024 * 1024) { return Math.round(bytes / 1024) + ' KB'; }
            return (bytes / 1024 / 1024).toFixed(1) + ' MB';
        }

        function fileExt(file) {
            var m = file.name.match(/\.([a-zA-Z0-9]+)$/);
            return m ? m[1].toUpperCase() : '檔案';
        }

        function fileIconClass(file) {
            var ext = fileExt(file).toLowerCase();
            if (ext === 'pdf') { return 'bi-file-earmark-pdf'; }
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) { return 'bi-file-earmark-image'; }
            return 'bi-file-earmark-text';
        }

        function createScanRow(file, onDelete) {
            var url = URL.createObjectURL(file);

            var row = document.createElement('div');
            row.className = 'fileRow fileRow-preview';

            var icon = document.createElement('span');
            icon.className = 'fileRow-icon';
            icon.setAttribute('aria-hidden', 'true');
            var iconI = document.createElement('i');
            iconI.className = 'bi ' + fileIconClass(file);
            icon.appendChild(iconI);

            var body = document.createElement('span');
            body.className = 'fileRow-body';
            var nameEl = document.createElement('span');
            nameEl.className = 'fileRow-name';
            nameEl.textContent = file.name;
            var metaEl = document.createElement('span');
            metaEl.className = 'fileRow-meta';
            metaEl.textContent = '中心上傳．今日．' + formatFileSize(file.size);
            body.appendChild(nameEl);
            body.appendChild(metaEl);

            var actions = document.createElement('span');
            actions.className = 'fileRow-actions';

            var viewLink = document.createElement('a');
            viewLink.href = url;
            viewLink.target = '_blank';
            viewLink.rel = 'noopener';
            viewLink.className = 'btnPill btn-outline btnPill-sm fileRow-action';
            viewLink.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i>檢視';

            var downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = file.name;
            downloadLink.className = 'btnPill btn-outline btnPill-sm fileRow-action';
            downloadLink.innerHTML = '<i class="bi bi-download" aria-hidden="true"></i>下載';

            var delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'fileRow-delete';
            delBtn.setAttribute('aria-label', '刪除檔案 ' + file.name);
            delBtn.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i>';
            delBtn.addEventListener('click', function () {
                URL.revokeObjectURL(url);
                onDelete();
            });

            actions.appendChild(viewLink);
            actions.appendChild(downloadLink);
            actions.appendChild(delBtn);

            row.appendChild(icon);
            row.appendChild(body);
            row.appendChild(actions);
            return row;
        }

        function renderScanList() {
            scanList.innerHTML = '';
            scanFiles.forEach(function (file, i) {
                scanList.appendChild(createScanRow(file, function () {
                    scanFiles.splice(i, 1);
                    renderScanList();
                }));
            });
        }

        scanInput.addEventListener('change', function () {
            if (!scanInput.files || !scanInput.files.length) { return; }
            scanFiles = scanFiles.concat(Array.prototype.slice.call(scanInput.files));
            renderScanList();
            scanInput.value = '';
        });
    }

    var staticDeleteButtons = document.querySelectorAll('[data-js="rdStaticDelete"]');
    staticDeleteButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var row = btn.closest('.fileRow');
            if (row) { row.remove(); }
        });
    });
})();

// ------------------------------------------------------------
// 中心端借用管理－學校借用紀錄（center/borrow-school.html）
// 借用中／已結束兩個頁籤欄位不同，不能沿用共用的「同一面板內依 data-category 篩選列」邏輯，
// 改成依 tabs.js 已派發的 tabs:activate 事件，直接切換成對應的 tabpanel（aria-controls 各自指向不同面板）
// ------------------------------------------------------------
(function () {
    'use strict';

    var tablist = document.querySelector('[data-js="bsTabs"]');
    if (!tablist) { return; }

    document.addEventListener('tabs:activate', function (e) {
        var tab = e.detail && e.detail.tab;
        if (!tab || !tablist.contains(tab)) { return; }

        tablist.querySelectorAll('[role="tab"]').forEach(function (t) {
            var panel = document.getElementById(t.getAttribute('aria-controls'));
            if (panel) { panel.hidden = t !== tab; }
        });
    });
})();

// ------------------------------------------------------------
// 中心端報修管理（center/repair.html）：指派／結案／查看三個 modal 的資料填入，
// 照片與影片縮圖、全螢幕放大檢視／下載（比照 js/vendor-repairs.js 的 .photoViewerFull 慣例，
// 擴充為支援多項目與影片），結案 modal 依廠商回報結果（完成維修／無法修復）切換選項文字
// ------------------------------------------------------------
(function () {
    'use strict';

    var assignModalEl = document.querySelector('[data-js="repairAssignModal"]');
    var closeModalEl = document.querySelector('[data-js="repairCloseModal"]');
    var viewModalEl = document.querySelector('[data-js="repairViewModal"]');
    if (!assignModalEl || !closeModalEl || !viewModalEl) { return; }

    // ------------------------------------------------------------
    // 照片與影片縮圖（指派／結案／查看 modal 共用），點擊縮圖開啟全螢幕放大檢視
    // ------------------------------------------------------------
    function renderMediaGrid(grid, items, openFn) {
        grid.innerHTML = '';
        if (!items.length) {
            var note = document.createElement('p');
            note.className = 'textNote';
            note.textContent = '尚無照片或影片';
            grid.appendChild(note);
            return;
        }
        items.forEach(function (item, i) {
            var isVideo = item.type === 'video';
            var thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.className = 'photoLightbox-thumb';
            thumb.setAttribute('aria-label', (isVideo ? '放大檢視影片：' : '放大檢視照片：') + item.name);
            var img = document.createElement('img');
            img.src = isVideo ? (item.poster || item.src) : item.src;
            img.alt = '';
            var overlay = document.createElement('span');
            overlay.className = 'photoLightbox-thumb-overlay' + (isVideo ? ' photoLightbox-thumb-overlay-play' : '');
            overlay.setAttribute('aria-hidden', 'true');
            overlay.innerHTML = '<i class="bi ' + (isVideo ? 'bi-play-fill' : 'bi-zoom-in') + '"></i>';
            thumb.appendChild(img);
            thumb.appendChild(overlay);
            if (isVideo && item.duration) {
                var duration = document.createElement('span');
                duration.className = 'photoLightbox-thumb-duration';
                duration.textContent = item.duration;
                thumb.appendChild(duration);
            }
            thumb.addEventListener('click', function () { openFn(items, i, thumb); });
            grid.appendChild(thumb);
        });
    }

    // ------------------------------------------------------------
    // 全螢幕放大檢視：疊在對話框之上，開啟時暫時搬進目前開啟的 Bootstrap modal 內
    // （維持在其焦點鎖定範圍內），關閉時搬回原位置；支援多項目上一張／下一張切換
    // ------------------------------------------------------------
    var photoViewer = document.querySelector('[data-js="repairPhotoViewer"]');
    var rpvImg = photoViewer ? photoViewer.querySelector('[data-js="rpvImg"]') : null;
    var rpvVideo = photoViewer ? photoViewer.querySelector('[data-js="rpvVideo"]') : null;
    var rpvCounter = photoViewer ? photoViewer.querySelector('[data-js="rpvCounter"]') : null;
    var rpvDownload = photoViewer ? photoViewer.querySelector('[data-js="rpvDownload"]') : null;
    var rpvClose = photoViewer ? photoViewer.querySelector('[data-js="rpvClose"]') : null;
    var rpvPrev = photoViewer ? photoViewer.querySelector('[data-js="rpvPrev"]') : null;
    var rpvNext = photoViewer ? photoViewer.querySelector('[data-js="rpvNext"]') : null;
    var pvReturnParent = null;
    var pvReturnNext = null;
    var pvReturnFocus = null;
    var pvItems = [];
    var pvIndex = 0;

    function renderPhotoViewerItem() {
        var item = pvItems[pvIndex];
        var isVideo = item.type === 'video';
        rpvImg.hidden = isVideo;
        rpvVideo.hidden = !isVideo;
        if (isVideo) {
            rpvVideo.pause();
            rpvVideo.src = item.src;
            rpvImg.src = '';
        } else {
            rpvImg.src = item.src;
            rpvImg.alt = item.name;
            rpvVideo.removeAttribute('src');
        }
        rpvCounter.textContent = (pvIndex + 1) + ' / ' + pvItems.length;
        rpvDownload.href = item.src;
        rpvDownload.setAttribute('download', item.name);
        var hasMultiple = pvItems.length > 1;
        if (rpvPrev) { rpvPrev.hidden = !hasMultiple; }
        if (rpvNext) { rpvNext.hidden = !hasMultiple; }
    }

    function closePhotoViewer() {
        if (!photoViewer || photoViewer.hidden) { return; }
        rpvVideo.pause();
        photoViewer.hidden = true;
        if (pvReturnParent) {
            pvReturnParent.insertBefore(photoViewer, pvReturnNext);
            pvReturnParent = null;
            pvReturnNext = null;
        }
        if (pvReturnFocus) {
            pvReturnFocus.focus();
            pvReturnFocus = null;
        }
    }

    function openPhotoViewer(items, startIndex, trigger) {
        if (!photoViewer || !items.length) { return; }
        pvItems = items;
        pvIndex = startIndex || 0;
        renderPhotoViewerItem();

        // 搬進目前開啟的 modal 內，避免 Bootstrap 的焦點鎖定把焦點拉回底下的 modal
        var openModalEl = document.querySelector('.modal.show');
        if (openModalEl) {
            var content = openModalEl.querySelector('.modal-content') || openModalEl;
            pvReturnParent = photoViewer.parentNode;
            pvReturnNext = photoViewer.nextSibling;
            content.appendChild(photoViewer);
        }

        pvReturnFocus = trigger || document.activeElement;
        photoViewer.hidden = false;
        if (rpvClose) { rpvClose.focus(); }
    }

    if (photoViewer) {
        if (rpvClose) { rpvClose.addEventListener('click', closePhotoViewer); }
        if (rpvPrev) {
            rpvPrev.addEventListener('click', function () {
                pvIndex = (pvIndex - 1 + pvItems.length) % pvItems.length;
                renderPhotoViewerItem();
            });
        }
        if (rpvNext) {
            rpvNext.addEventListener('click', function () {
                pvIndex = (pvIndex + 1) % pvItems.length;
                renderPhotoViewerItem();
            });
        }
        photoViewer.addEventListener('click', function (e) {
            if (e.target === photoViewer) { closePhotoViewer(); }
        });
        // 搬進 modal 後，Escape 會先在這裡被攔截，避免冒泡到底下 modal 觸發 Bootstrap 自身的關閉邏輯
        photoViewer.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                e.stopPropagation();
                closePhotoViewer();
            }
        });
    }

    // ------------------------------------------------------------
    // 處理進度時間軸（查看 modal）：data-log 內的紀錄皆為已發生事件，一律標記 is-done
    // ------------------------------------------------------------
    function renderTimeline(list, log) {
        list.innerHTML = '';
        log.forEach(function (entry) {
            var item = document.createElement('li');
            item.className = 'dotTimeline-item is-done';
            var dot = document.createElement('span');
            dot.className = 'dotTimeline-dot';
            dot.setAttribute('aria-hidden', 'true');
            var content = document.createElement('div');
            content.className = 'dotTimeline-content';
            var date = document.createElement('p');
            date.className = 'dotTimeline-date';
            date.textContent = entry.date;
            var text = document.createElement('p');
            text.className = 'dotTimeline-text';
            text.textContent = entry.text;
            content.appendChild(date);
            content.appendChild(text);
            item.appendChild(dot);
            item.appendChild(content);
            list.appendChild(item);
        });
    }

    function parseMedia(trigger) {
        try { return JSON.parse(trigger.getAttribute('data-media') || '[]'); } catch (e) { return []; }
    }

    function fillContactNote(noteEl, textEl, noneEl, trigger) {
        var contacted = trigger.getAttribute('data-contacted') === 'true';
        noteEl.hidden = !contacted;
        noneEl.hidden = contacted;
        if (contacted) {
            var vendor = trigger.getAttribute('data-contact-vendor') || '';
            var phone = trigger.getAttribute('data-contact-phone') || '';
            textEl.textContent = '學校已自行聯繫' + vendor + (phone ? '，電話：' + phone : '');
        }
    }

    // ------------------------------------------------------------
    // 指派維修廠商 modal
    // ------------------------------------------------------------
    var assignModal = bootstrap.Modal.getOrCreateInstance(assignModalEl);
    var raForm = assignModalEl.querySelector('form');
    var raMediaGrid = assignModalEl.querySelector('[data-js="raMediaGrid"]');
    var raVendorSelect = assignModalEl.querySelector('[data-js="raVendorSelect"]');
    var raVendorFirstOption = assignModalEl.querySelector('[data-js="raVendorFirstOption"]');
    var raVendorFirstOptionBaseText = raVendorFirstOption ? raVendorFirstOption.textContent : '';

    function openAssignModal(trigger) {
        var caseNo = trigger.getAttribute('data-case') || '';
        var school = trigger.getAttribute('data-school') || '－';
        var contact = trigger.getAttribute('data-contact') || '－';
        var device = trigger.getAttribute('data-device') || '－';
        var property = trigger.getAttribute('data-property') || '';
        var desc = trigger.getAttribute('data-desc') || '－';
        var contacted = trigger.getAttribute('data-contacted') === 'true';

        assignModalEl.querySelector('[data-js="raSubtitle"]').textContent = '報修編號 ' + caseNo;
        assignModalEl.querySelector('[data-js="raSchool"]').textContent = school;
        assignModalEl.querySelector('[data-js="raContact"]').textContent = contact;
        assignModalEl.querySelector('[data-js="raDevice"]').textContent = device;
        assignModalEl.querySelector('[data-js="raProperty"]').textContent = property ? '　' + property : '';
        assignModalEl.querySelector('[data-js="raDesc"]').textContent = desc;

        renderMediaGrid(raMediaGrid, parseMedia(trigger), openPhotoViewer);
        fillContactNote(
            assignModalEl.querySelector('[data-js="raContactNote"]'),
            assignModalEl.querySelector('[data-js="raContactNoteText"]'),
            assignModalEl.querySelector('[data-js="raContactNoneNote"]'),
            trigger
        );

        if (raVendorFirstOption) {
            raVendorFirstOption.textContent = raVendorFirstOptionBaseText + (contacted ? '（學校已聯繫）' : '');
        }

        raForm.reset();
        assignModal.show();
    }

    raForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!raForm.checkValidity()) {
            raForm.reportValidity();
            return;
        }
        assignModal.hide();
    });

    // ------------------------------------------------------------
    // 報修結案 modal：依廠商回報結果（完成維修／無法修復）切換選項文字與送出按鈕文字
    // ------------------------------------------------------------
    var closeModal = bootstrap.Modal.getOrCreateInstance(closeModalEl);
    var rcForm = closeModalEl.querySelector('form');
    var rcMediaGrid = closeModalEl.querySelector('[data-js="rcMediaGrid"]');
    var rcCloseInputs = Array.prototype.slice.call(closeModalEl.querySelectorAll('[data-js="rcCloseInput"]'));
    var rcSubmitBtn = closeModalEl.querySelector('[data-js="rcSubmitBtn"]');
    var rcOkTitleEl = closeModalEl.querySelector('[data-js="rcCloseOkTitle"]');
    var rcOkDescEl = closeModalEl.querySelector('[data-js="rcCloseOkDesc"]');
    var rcBackDescEl = closeModalEl.querySelector('[data-js="rcBackDesc"]');

    var CLOSE_BRANCH_TEXT = {
        'report-ok': {
            okTitle: '確認結案',
            okDesc: '財產恢復為借用中或在庫',
            backDesc: '學校反映仍有問題時，案件回到「待指派」',
            submitOk: '確認結案'
        },
        'report-fail': {
            okTitle: '結案並改列報廢',
            okDesc: '這台財產狀態改為「已報廢」',
            backDesc: '案件回到「待指派」，可再派給同一家或其他廠商',
            submitOk: '結案並改列報廢'
        }
    };

    function syncCloseSubmitLabel(fail) {
        var checked = closeModalEl.querySelector('[data-js="rcCloseInput"]:checked');
        var branch = CLOSE_BRANCH_TEXT[fail ? 'report-fail' : 'report-ok'];
        rcSubmitBtn.textContent = (checked && checked.value === 'back') ? '改回待指派' : branch.submitOk;
    }

    function clearCloseSelection() {
        rcCloseInputs.forEach(function (radio) {
            var label = radio.closest('label');
            if (label) { label.classList.remove('is-selected'); }
        });
    }

    rcCloseInputs.forEach(function (radio) {
        radio.addEventListener('change', function () {
            clearCloseSelection();
            var label = radio.closest('label');
            if (label) { label.classList.add('is-selected'); }
            syncCloseSubmitLabel(closeModalEl.getAttribute('data-fail') === 'true');
        });
    });

    function openCloseModal(trigger) {
        var caseNo = trigger.getAttribute('data-case') || '';
        var school = trigger.getAttribute('data-school') || '－';
        var contact = trigger.getAttribute('data-contact') || '－';
        var device = trigger.getAttribute('data-device') || '－';
        var property = trigger.getAttribute('data-property') || '';
        var desc = trigger.getAttribute('data-desc') || '－';
        var vendor = trigger.getAttribute('data-vendor') || '－';
        var status = trigger.getAttribute('data-status') || 'report-ok';
        var reportDate = trigger.getAttribute('data-report-date') || '';
        var reportNote = trigger.getAttribute('data-report-note') || '';
        var fail = status === 'report-fail';

        closeModalEl.setAttribute('data-fail', fail ? 'true' : 'false');

        closeModalEl.querySelector('[data-js="rcSubtitle"]').textContent = '報修編號 ' + caseNo;
        closeModalEl.querySelector('[data-js="rcSchool"]').textContent = school;
        closeModalEl.querySelector('[data-js="rcContact"]').textContent = contact;
        closeModalEl.querySelector('[data-js="rcDevice"]').textContent = device;
        closeModalEl.querySelector('[data-js="rcProperty"]').textContent = property ? '　' + property : '';
        closeModalEl.querySelector('[data-js="rcDesc"]').textContent = desc;

        renderMediaGrid(rcMediaGrid, parseMedia(trigger), openPhotoViewer);
        fillContactNote(
            closeModalEl.querySelector('[data-js="rcContactNote"]'),
            closeModalEl.querySelector('[data-js="rcContactNoteText"]'),
            closeModalEl.querySelector('[data-js="rcContactNoneNote"]'),
            trigger
        );

        var reportTagEl = closeModalEl.querySelector('[data-js="rcReportTag"]');
        reportTagEl.className = 'tagPill ' + (fail ? 'tag-redLight' : 'tag-greenLight');
        reportTagEl.textContent = fail ? '無法修復' : '完成維修';
        closeModalEl.querySelector('[data-js="rcReportBox"]').classList.toggle('reportBox-danger', fail);
        closeModalEl.querySelector('[data-js="rcReportMeta"]').textContent = vendor + '・' + reportDate;
        closeModalEl.querySelector('[data-js="rcReportNote"]').textContent = reportNote;

        var branch = CLOSE_BRANCH_TEXT[fail ? 'report-fail' : 'report-ok'];
        rcOkTitleEl.textContent = branch.okTitle;
        rcOkDescEl.textContent = branch.okDesc;
        rcBackDescEl.textContent = branch.backDesc;

        rcForm.reset();
        clearCloseSelection();
        var okInput = closeModalEl.querySelector('[data-js="rcCloseInput"][value="ok"]');
        if (okInput) {
            okInput.checked = true;
            var okLabel = okInput.closest('label');
            if (okLabel) { okLabel.classList.add('is-selected'); }
        }
        syncCloseSubmitLabel(fail);

        closeModal.show();
    }

    rcForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!rcForm.checkValidity()) {
            rcForm.reportValidity();
            return;
        }
        closeModal.hide();
    });

    // ------------------------------------------------------------
    // 查看報修案件 modal（唯讀：維修中／已結案案件的「查看」）
    // ------------------------------------------------------------
    var viewModal = bootstrap.Modal.getOrCreateInstance(viewModalEl);
    var rvMediaGrid = viewModalEl.querySelector('[data-js="rvMediaGrid"]');

    function openViewModal(trigger) {
        var caseNo = trigger.getAttribute('data-case') || '';
        var school = trigger.getAttribute('data-school') || '－';
        var contact = trigger.getAttribute('data-contact') || '－';
        var device = trigger.getAttribute('data-device') || '－';
        var property = trigger.getAttribute('data-property') || '';
        var desc = trigger.getAttribute('data-desc') || '－';
        var vendor = trigger.getAttribute('data-vendor') || '－';
        var reportDate = trigger.getAttribute('data-report-date') || '';
        var reportNote = trigger.getAttribute('data-report-note') || '';
        var log = [];
        try { log = JSON.parse(trigger.getAttribute('data-log') || '[]'); } catch (e) { log = []; }

        viewModalEl.querySelector('[data-js="rvSubtitle"]').textContent = '報修編號 ' + caseNo + '　維修廠商　' + vendor;
        viewModalEl.querySelector('[data-js="rvSchool"]').textContent = school;
        viewModalEl.querySelector('[data-js="rvContact"]').textContent = contact;
        viewModalEl.querySelector('[data-js="rvDevice"]').textContent = device;
        viewModalEl.querySelector('[data-js="rvProperty"]').textContent = property ? '　' + property : '';
        viewModalEl.querySelector('[data-js="rvDesc"]').textContent = desc;

        renderMediaGrid(rvMediaGrid, parseMedia(trigger), openPhotoViewer);
        fillContactNote(
            viewModalEl.querySelector('[data-js="rvContactNote"]'),
            viewModalEl.querySelector('[data-js="rvContactNoteText"]'),
            viewModalEl.querySelector('[data-js="rvContactNoneNote"]'),
            trigger
        );

        var reportSection = viewModalEl.querySelector('[data-js="rvReportSection"]');
        reportSection.hidden = !reportNote;
        if (reportNote) {
            var reportTagEl = viewModalEl.querySelector('[data-js="rvReportTag"]');
            reportTagEl.className = 'tagPill tag-greenLight';
            reportTagEl.textContent = '完成維修';
            viewModalEl.querySelector('[data-js="rvReportMeta"]').textContent = vendor + '・' + reportDate;
            viewModalEl.querySelector('[data-js="rvReportNote"]').textContent = reportNote;
        }

        renderTimeline(viewModalEl.querySelector('[data-js="rvTimeline"]'), log);

        viewModal.show();
    }

    document.querySelectorAll('[data-js="repairAssign"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openAssignModal(btn); });
    });

    document.querySelectorAll('[data-js="repairClose"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openCloseModal(btn); });
    });

    document.querySelectorAll('[data-js="repairView"]').forEach(function (btn) {
        btn.addEventListener('click', function () { openViewModal(btn); });
    });
})();

// ------------------------------------------------------------
// 中心端輔具管理（center/devices.html、device.html、device-qty.html）：
// 品項表單 modal 的管理方式切換與照片上傳預覽、單台財產的異動紀錄展開、
// 財產 modal 新增／編輯共用、入庫 modal 的庫存試算
// ------------------------------------------------------------
(function () {
    var itemModal = document.querySelector('[data-js="deviceItemModal"]');
    var unitModal = document.querySelector('[data-js="deviceUnitModal"]');
    var stockModal = document.querySelector('[data-js="deviceStockModal"]');
    var logToggles = document.querySelectorAll('[data-js="logToggle"]');
    if (!itemModal && !unitModal && !stockModal && logToggles.length === 0) { return; }

    // ---- 品項表單 modal：管理方式單選卡，依選擇切換財產／配發專屬欄位 ----
    if (itemModal) {
        var lockedType = itemModal.getAttribute('data-dm-locked');
        var typeRadios = itemModal.querySelectorAll('[data-js="dmTypeRadio"]');

        var applyType = function (type) {
            itemModal.querySelectorAll('[data-js="dmUnitOnly"]').forEach(function (el) { el.hidden = type !== 'unit'; });
            itemModal.querySelectorAll('[data-js="dmQtyOnly"]').forEach(function (el) { el.hidden = type !== 'qty'; });
        };

        typeRadios.forEach(function (radio) {
            if (lockedType) {
                // 品項建立後不可變更管理方式（aria-disabled，原因見 modal 內鎖定說明文字）：
                // 攔下點擊，鍵盤操作造成的變更也還原回鎖定值
                radio.addEventListener('click', function (e) { e.preventDefault(); });
                radio.addEventListener('change', function () {
                    typeRadios.forEach(function (r) { r.checked = r.value === lockedType; });
                });
                return;
            }

            radio.addEventListener('change', function () {
                typeRadios.forEach(function (r) {
                    var card = r.closest('.cardChoice');
                    if (card) { card.classList.toggle('is-selected', r.checked); }
                });
                applyType(radio.value);
            });
        });

        if (!lockedType) {
            var checkedRadio = itemModal.querySelector('[data-js="dmTypeRadio"]:checked');
            applyType(checkedRadio ? checkedRadio.value : 'unit');
        }
    }

    // ---- 照片上傳預覽：選檔後直接顯示在框內，可重新上傳或移除 ----
    document.querySelectorAll('[data-js="uploadTile"]').forEach(function (tile) {
        var input = tile.querySelector('[data-js="uploadTileInput"]');
        var empty = tile.querySelector('[data-js="uploadTileEmpty"]');
        var preview = tile.querySelector('[data-js="uploadTilePreview"]');
        var actions = tile.querySelector('[data-js="uploadTileActions"]');
        var replaceBtn = tile.querySelector('[data-js="uploadTileReplace"]');
        var removeBtn = tile.querySelector('[data-js="uploadTileRemove"]');
        if (!input || !preview) { return; }

        var objectUrl = null;

        function revokeUrl() {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        }

        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) { return; }
            revokeUrl();
            objectUrl = URL.createObjectURL(file);
            preview.src = objectUrl;
            preview.hidden = false;
            if (empty) { empty.hidden = true; }
            if (actions) { actions.hidden = false; }
        });

        if (replaceBtn) {
            replaceBtn.addEventListener('click', function () { input.click(); });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                input.value = '';
                revokeUrl();
                preview.removeAttribute('src');
                preview.hidden = true;
                if (empty) { empty.hidden = false; }
                if (actions) { actions.hidden = true; }
                input.focus();
            });
        }
    });

    // ---- 單台財產：異動紀錄展開／收合 ----
    logToggles.forEach(function (toggle) {
        var row = document.getElementById(toggle.getAttribute('aria-controls'));
        if (!row) { return; }

        toggle.addEventListener('click', function () {
            var isOpen = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            row.hidden = isOpen;
        });
    });

    // 切換狀態頁籤時收合展開中的紀錄列（紀錄列本身沒有 data-category，共用篩選不會隱藏它）
    if (logToggles.length > 0) {
        document.addEventListener('tabs:activate', function () {
            logToggles.forEach(function (toggle) {
                var row = document.getElementById(toggle.getAttribute('aria-controls'));
                toggle.setAttribute('aria-expanded', 'false');
                if (row) { row.hidden = true; }
            });
        });
    }

    // ---- 財產 modal：依開啟按鈕的 data-um-* 切換新增／編輯並帶入該台資料 ----
    if (unitModal) {
        unitModal.addEventListener('show.bs.modal', function (e) {
            var trigger = e.relatedTarget;
            if (!trigger) { return; }

            var isEdit = trigger.getAttribute('data-um-mode') === 'edit';
            unitModal.querySelector('[data-js="umTitle"]').textContent = isEdit ? '編輯財產' : '新增財產';
            unitModal.querySelector('[data-js="umNo"]').value = isEdit ? (trigger.getAttribute('data-um-no') || '') : '';
            unitModal.querySelector('[data-js="umSpec"]').value = isEdit ? (trigger.getAttribute('data-um-spec') || '') : '';
            unitModal.querySelector('[data-js="umBuy"]').value = isEdit ? (trigger.getAttribute('data-um-buy') || '') : '';
            unitModal.querySelector('[data-js="umLife"]').value = isEdit ? (trigger.getAttribute('data-um-life') || '5') : '5';
            unitModal.querySelector('[data-js="umStatus"]').value = isEdit ? (trigger.getAttribute('data-um-status') || 'stock') : 'stock';
        });
    }

    // ---- 入庫 modal：依輸入數量試算入庫後庫存 ----
    if (stockModal) {
        var currentStock = parseInt(stockModal.getAttribute('data-sm-current'), 10) || 0;
        var qtyInput = stockModal.querySelector('[data-js="smQty"]');
        var afterEl = stockModal.querySelector('[data-js="smAfter"]');

        if (qtyInput && afterEl) {
            var updateAfter = function () {
                var qty = parseInt(qtyInput.value, 10);
                afterEl.textContent = currentStock + (isNaN(qty) || qty < 0 ? 0 : qty);
            };
            qtyInput.addEventListener('input', updateAfter);
            updateAfter();
        }
    }

    // ---- 示意用：各 modal 表單送出僅關閉視窗（尚無後端） ----
    document.querySelectorAll('[data-js="deviceModalForm"]').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var modalEl = form.closest('.modal');
            if (modalEl) {
                var instance = bootstrap.Modal.getInstance(modalEl);
                if (instance) { instance.hide(); }
            }
        });
    });
})();

// ---- center/schools.html：新增／編輯學校 modal、輔具管理人員新增（從本校帳號多選） ----
(function () {
    var schoolModal = document.getElementById('schoolModal');
    if (!schoolModal) { return; }

    var modalTitleEl = schoolModal.querySelector('[data-js="schoolModalTitle"]');
    var modalSubEl = schoolModal.querySelector('[data-js="schoolModalSub"]');
    var mgrNewNote = schoolModal.querySelector('[data-js="schoolMgrNewNote"]');
    var mgrList = schoolModal.querySelector('[data-js="schoolMgrList"]');

    var scCode = document.getElementById('scCode');
    var scName = document.getElementById('scName');
    var scLevel = document.getElementById('scLevel');
    var scTown = document.getElementById('scTown');
    var scAddr = document.getElementById('scAddr');
    var scPhone = document.getElementById('scPhone');
    var scStatus = document.getElementById('scStatus');

    var mgrAddToggle = schoolModal.querySelector('[data-js="mgrAddToggle"]');
    var mgrAddPanel = schoolModal.querySelector('[data-js="mgrAddPanel"]');
    var mgrAddClose = schoolModal.querySelector('[data-js="mgrAddClose"]');

    // 從本校帳號選擇（多選清單，找不到人請改到帳號管理新增，不在這裡手動建立）
    var pickerSearch = schoolModal.querySelector('[data-js="mgrPickerSearch"]');
    var pickerItems = Array.prototype.slice.call(schoolModal.querySelectorAll('[data-js="mgrPickerItem"]'));
    var pickerChecks = Array.prototype.slice.call(schoolModal.querySelectorAll('[data-js="mgrPickerCheck"]'));
    var pickerEmpty = schoolModal.querySelector('[data-js="mgrPickerEmpty"]');
    var pickerError = schoolModal.querySelector('[data-js="mgrPickerError"]');
    var pickCancelBtn = schoolModal.querySelector('[data-js="mgrPickCancel"]');
    var pickConfirmBtn = schoolModal.querySelector('[data-js="mgrPickConfirm"]');
    var pickCountEl = schoolModal.querySelector('[data-js="mgrPickCount"]');

    function toggleEmptyNote() {
        if (!mgrNewNote || !mgrList) { return; }
        mgrNewNote.hidden = mgrList.children.length > 0;
    }

    function buildMgrRow(data, isNew) {
        var li = document.createElement('li');
        li.className = 'schoolMgrRow' + (isNew ? ' schoolMgrRow-new' : '');
        li.setAttribute('data-email', (data.email || '').toLowerCase());

        var wayLabel = data.way === 'center' ? '中心開設帳號' : '教育部 OpenID';
        var wayClass = data.way === 'center' ? 'tag-goldLight' : 'tag-greyLight';

        li.innerHTML =
            '<span class="schoolMgrRow-body">' +
                '<span class="schoolMgrRow-nameLine">' +
                    '<span class="schoolMgrRow-name"></span>' +
                    '<span class="schoolMgrRow-title"></span>' +
                    '<span class="tagPill ' + wayClass + '">' + wayLabel + '</span>' +
                '</span>' +
                '<span class="schoolMgrRow-meta">' +
                    '<span data-js="mgrRowMail"></span>' +
                    '<span data-js="mgrRowPhone"></span>' +
                '</span>' +
            '</span>' +
            '<button type="button" class="schoolMgrRow-iconBtn" aria-label="移除 ' + (data.name || '') + '">' +
                '<i class="bi bi-x-lg" aria-hidden="true"></i>' +
            '</button>';

        li.querySelector('.schoolMgrRow-name').textContent = data.name || '';
        li.querySelector('.schoolMgrRow-title').textContent = data.title || '';
        li.querySelector('[data-js="mgrRowMail"]').textContent = data.email || '';
        li.querySelector('[data-js="mgrRowPhone"]').textContent = data.phone || '';

        li.querySelector('.schoolMgrRow-iconBtn').addEventListener('click', function () {
            li.remove();
            toggleEmptyNote();
            filterPickerItems(pickerSearch ? pickerSearch.value : '');
        });

        return li;
    }

    function renderMgrList(managers) {
        if (!mgrList) { return; }
        mgrList.innerHTML = '';
        (managers || []).forEach(function (m) {
            mgrList.appendChild(buildMgrRow(m, false));
        });
        toggleEmptyNote();
    }

    // ---- 新增管理人員：展開面板＝搜尋框＋多選清單直接可見，面板本身即為收合開關 ----
    function openAddPanel() {
        if (!mgrAddPanel) { return; }
        mgrAddPanel.hidden = false;
        if (mgrAddToggle) { mgrAddToggle.hidden = true; }
        if (pickerSearch) { pickerSearch.value = ''; }
        filterPickerItems('');
        resetPickerChecks();
        if (pickerSearch) { pickerSearch.focus(); }
    }

    function closeAddPanel() {
        if (!mgrAddPanel) { return; }
        mgrAddPanel.hidden = true;
        if (mgrAddToggle) { mgrAddToggle.hidden = false; }
        resetPickerChecks();
    }

    if (mgrAddToggle) { mgrAddToggle.addEventListener('click', openAddPanel); }
    if (mgrAddClose) { mgrAddClose.addEventListener('click', closeAddPanel); }
    if (pickCancelBtn) { pickCancelBtn.addEventListener('click', closeAddPanel); }

    // 目前已是本校輔具管理人員的信箱（含剛加入、尚未儲存的），這些人從候選清單隱藏，不重複出現
    function getCurrentManagerEmails() {
        if (!mgrList) { return []; }
        return Array.prototype.map.call(mgrList.children, function (li) {
            return li.getAttribute('data-email') || '';
        });
    }

    // ---- 從本校帳號選擇（多選）：搜尋過濾、勾選計數、一次加入所有勾選的人員 ----
    function filterPickerItems(keyword) {
        var kw = (keyword || '').trim().toLowerCase();
        var existingEmails = getCurrentManagerEmails();
        var anyVisible = false;
        pickerItems.forEach(function (item) {
            var email = (item.getAttribute('data-email') || '').toLowerCase();
            var alreadyAdded = existingEmails.indexOf(email) !== -1;
            var match = !alreadyAdded && (!kw ||
                (item.getAttribute('data-filter') || '').toLowerCase().indexOf(kw) !== -1 ||
                (item.getAttribute('data-title') || '').toLowerCase().indexOf(kw) !== -1 ||
                email.indexOf(kw) !== -1);
            item.hidden = !match;
            if (match) { anyVisible = true; }
        });
        if (pickerEmpty) { pickerEmpty.hidden = anyVisible; }
    }

    function updatePickCount() {
        var count = pickerChecks.filter(function (c) { return c.checked; }).length;
        if (pickCountEl) { pickCountEl.textContent = count > 0 ? '（' + count + '）' : ''; }
    }

    function resetPickerChecks() {
        pickerChecks.forEach(function (c) { c.checked = false; });
        if (pickerError) { pickerError.hidden = true; }
        updatePickCount();
    }

    if (pickerSearch) {
        pickerSearch.addEventListener('input', function () { filterPickerItems(pickerSearch.value); });
    }

    pickerChecks.forEach(function (check) {
        check.addEventListener('change', function () {
            if (pickerError && check.checked) { pickerError.hidden = true; }
            updatePickCount();
        });
    });

    if (pickConfirmBtn) {
        pickConfirmBtn.addEventListener('click', function () {
            var checkedItems = pickerItems.filter(function (item) {
                var check = item.querySelector('[data-js="mgrPickerCheck"]');
                return check && check.checked;
            });
            if (checkedItems.length === 0) {
                if (pickerError) { pickerError.hidden = false; }
                return;
            }
            checkedItems.forEach(function (item) {
                mgrList.appendChild(buildMgrRow({
                    name: item.getAttribute('data-name') || '',
                    title: item.getAttribute('data-title') || '',
                    email: item.getAttribute('data-email') || '',
                    way: 'openid'
                }, true));
            });
            toggleEmptyNote();
            closeAddPanel();
        });
    }

    // ---- 新增／編輯學校：開啟時依觸發按鈕決定模式與帶入資料 ----
    schoolModal.addEventListener('show.bs.modal', function (e) {
        var trigger = e.relatedTarget;
        var isEdit = !!(trigger && trigger.getAttribute('data-js') === 'schoolEditOpen');

        if (modalTitleEl) { modalTitleEl.textContent = isEdit ? '編輯學校' : '新增學校'; }
        if (modalSubEl) {
            modalSubEl.textContent = isEdit
                ? '修改學校基本資料與輔具管理人員名單。'
                : '填寫學校基本資料，建立後可在這裡新增輔具管理人員。';
        }

        if (scCode) { scCode.value = isEdit ? (trigger.getAttribute('data-code') || '') : ''; }
        if (scName) { scName.value = isEdit ? (trigger.getAttribute('data-name') || '') : ''; }
        if (scLevel) { scLevel.value = isEdit ? (trigger.getAttribute('data-level') || '') : ''; }
        if (scTown) { scTown.value = isEdit ? (trigger.getAttribute('data-town') || '') : ''; }
        if (scAddr) { scAddr.value = isEdit ? (trigger.getAttribute('data-addr') || '') : ''; }
        if (scPhone) { scPhone.value = isEdit ? (trigger.getAttribute('data-phone') || '') : ''; }
        if (scStatus) { scStatus.value = isEdit ? (trigger.getAttribute('data-status') || 'active') : 'active'; }

        var managers = [];
        if (isEdit) {
            try {
                managers = JSON.parse(trigger.getAttribute('data-managers') || '[]');
            } catch (err) {
                managers = [];
            }
        }
        renderMgrList(managers);
        closeAddPanel();
    });

    // ---- 示意用：表單送出僅關閉視窗（尚無後端） ----
    var schoolForm = document.getElementById('schoolForm');
    if (schoolForm) {
        schoolForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var instance = bootstrap.Modal.getInstance(schoolModal);
            if (instance) { instance.hide(); }
        });
    }
})();

// ------------------------------------------------------------
// center/vendors.html：「全部」頁籤排除已停用廠商、審核註冊 modal、新增／編輯廠商 modal
// ------------------------------------------------------------
(function () {
    'use strict';

    var vdPanel = document.getElementById('panel-vdList');
    if (!vdPanel) { return; }

    // ---- 「全部」頁籤不顯示已停用廠商：main.js 的 initCategoryFilter 只比對單一分類，這裡覆寫結果 ----
    var vdTablist = document.querySelector('.tabsCount[aria-label="依類型檢視"]');
    var vdRows = Array.prototype.slice.call(vdPanel.querySelectorAll('[data-category]'));
    var vdEmptyNote = vdPanel.querySelector('[data-js="emptyNote"]');

    function applyVendorTabFilter() {
        var activeTab = vdTablist ? vdTablist.querySelector('[aria-selected="true"]') : null;
        var category = activeTab ? activeTab.getAttribute('data-category') : 'all';
        var visibleCount = 0;

        vdRows.forEach(function (row) {
            var rowCategory = row.getAttribute('data-category');
            var visible = category === 'all' ? rowCategory !== 'off' : rowCategory === category;
            row.hidden = !visible;
            if (visible) { visibleCount += 1; }
        });

        if (vdEmptyNote) { vdEmptyNote.hidden = visibleCount > 0; }
    }

    document.addEventListener('tabs:activate', function (e) {
        var tab = e.detail && e.detail.tab;
        if (!tab || !vdTablist || !vdTablist.contains(tab)) { return; }
        applyVendorTabFilter();
    });

    applyVendorTabFilter();

    // ------------------------------------------------------------
    // 審核註冊申請 modal：依觸發按鈕帶入廠商資料；審核結果切換核准／不核准時
    // 同步審核意見欄的 placeholder、必填標示、錯誤訊息、提示文字與送出按鈕文字
    // ------------------------------------------------------------
    var reviewModal = document.getElementById('vendorReviewModal');
    if (reviewModal) {
        var vrCompany = reviewModal.querySelector('[data-js="vendorReviewCompany"]');
        var vrTime = reviewModal.querySelector('[data-js="vendorReviewTime"]');
        var vrType = reviewModal.querySelector('[data-js="vendorReviewType"]');
        var vrTax = reviewModal.querySelector('[data-js="vendorReviewTax"]');
        var vrContact = reviewModal.querySelector('[data-js="vendorReviewContact"]');
        var vrTel = reviewModal.querySelector('[data-js="vendorReviewTel"]');
        var vrMail = reviewModal.querySelector('[data-js="vendorReviewMail"]');
        var vrService = reviewModal.querySelector('[data-js="vendorReviewService"]');

        var vrDecisionCards = reviewModal.querySelectorAll('[data-js="vendorDecisionCard"]');
        var vrDecisionInputs = reviewModal.querySelectorAll('[data-js="vendorDecisionInput"]');
        var vrNoteInput = reviewModal.querySelector('[data-js="vendorReviewNoteInput"]');
        var vrNoteRequired = reviewModal.querySelector('[data-js="vendorReviewNoteRequired"]');
        var vrNoteError = reviewModal.querySelector('[data-js="vendorReviewNoteError"]');
        var vrHintText = reviewModal.querySelector('[data-js="vendorReviewHintText"]');
        var vrSubmitBtn = reviewModal.querySelector('[data-js="vendorReviewSubmit"]');

        function syncVendorDecision() {
            vrDecisionInputs.forEach(function (radio, i) {
                vrDecisionCards[i].classList.toggle('is-selected', radio.checked);
                if (!radio.checked) { return; }

                var isReject = radio.value === 'reject';
                if (vrNoteInput) {
                    vrNoteInput.placeholder = isReject ? '請說明不核准的原因，會寄給廠商' : '選填';
                }
                if (vrNoteRequired) { vrNoteRequired.hidden = !isReject; }
                if (vrNoteError) { vrNoteError.hidden = true; }
                if (vrHintText) {
                    vrHintText.textContent = isReject
                        ? '不核准後系統會寄信通知廠商，廠商可依意見補正後重新申請。'
                        : '核准後系統會寄送啟用通知到廠商信箱，廠商即可用註冊的帳號登入。';
                }
                if (vrSubmitBtn) { vrSubmitBtn.textContent = isReject ? '送出不核准' : '核准並寄送啟用通知'; }
            });
        }

        vrDecisionInputs.forEach(function (radio) {
            radio.addEventListener('change', syncVendorDecision);
        });

        reviewModal.addEventListener('show.bs.modal', function (e) {
            var trigger = e.relatedTarget;
            if (vrCompany) { vrCompany.textContent = (trigger && trigger.getAttribute('data-name')) || '－'; }
            if (vrTime) { vrTime.textContent = (trigger && trigger.getAttribute('data-time')) || '－'; }
            if (vrType) { vrType.textContent = (trigger && trigger.getAttribute('data-typelabel')) || '－'; }
            if (vrTax) { vrTax.textContent = (trigger && trigger.getAttribute('data-tax')) || '－'; }
            if (vrContact) { vrContact.textContent = (trigger && trigger.getAttribute('data-contact')) || '－'; }
            if (vrTel) { vrTel.textContent = (trigger && trigger.getAttribute('data-tel')) || '－'; }
            if (vrMail) { vrMail.textContent = (trigger && trigger.getAttribute('data-mail')) || '－'; }
            if (vrService) { vrService.textContent = (trigger && trigger.getAttribute('data-service')) || '－'; }

            vrDecisionInputs.forEach(function (radio, i) { radio.checked = i === 0; });
            if (vrNoteInput) { vrNoteInput.value = ''; }
            syncVendorDecision();
        });

        var reviewForm = document.getElementById('vendorReviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var checked = reviewModal.querySelector('[data-js="vendorDecisionInput"]:checked');
                var isReject = !!(checked && checked.value === 'reject');

                if (isReject && vrNoteInput && !vrNoteInput.value.trim()) {
                    if (vrNoteError) { vrNoteError.hidden = false; }
                    vrNoteInput.focus();
                    return;
                }

                var instance = bootstrap.Modal.getInstance(reviewModal);
                if (instance) { instance.hide(); }
            });
        }
    }

    // ------------------------------------------------------------
    // 新增／編輯廠商 modal：共用同一個 modal，開啟時依觸發按鈕決定模式與帶入資料
    // ------------------------------------------------------------
    var vendorModal = document.getElementById('vendorModal');
    if (vendorModal) {
        var vmTitle = vendorModal.querySelector('[data-js="vendorModalTitle"]');
        var vmSub = vendorModal.querySelector('[data-js="vendorModalSub"]');

        var vmTypeCards = vendorModal.querySelectorAll('[data-js="vendorTypeCard"]');
        var vmTypeInputs = vendorModal.querySelectorAll('[data-js="vendorTypeInput"]');
        var vmCatChecks = vendorModal.querySelectorAll('[data-js="vendorCatCheck"]');

        var vdNameInput = document.getElementById('vdName');
        var vdTaxInput = document.getElementById('vdTax');
        var vdContactInput = document.getElementById('vdContact');
        var vdTelInput = document.getElementById('vdTel');
        var vdMailInput = document.getElementById('vdMail');
        var vdStatusInput = document.getElementById('vdStatus');

        function syncVendorType() {
            vmTypeInputs.forEach(function (radio, i) {
                vmTypeCards[i].classList.toggle('is-selected', radio.checked);
            });
        }

        vmTypeInputs.forEach(function (radio) {
            radio.addEventListener('change', syncVendorType);
        });

        vendorModal.addEventListener('show.bs.modal', function (e) {
            var trigger = e.relatedTarget;
            var isEdit = !!(trigger && trigger.getAttribute('data-js') === 'vendorEditOpen');

            if (vmTitle) { vmTitle.textContent = isEdit ? '編輯廠商' : '新增廠商'; }
            if (vmSub) {
                vmSub.textContent = isEdit
                    ? '修改廠商基本資料、服務輔具類別與帳號狀態。'
                    : '由中心直接建立的廠商不需審核，建立後會寄送設定密碼信。';
            }

            var type = isEdit ? (trigger.getAttribute('data-type') || 'fix') : 'fix';
            vmTypeInputs.forEach(function (radio) { radio.checked = radio.value === type; });
            syncVendorType();

            if (vdNameInput) { vdNameInput.value = isEdit ? (trigger.getAttribute('data-name') || '') : ''; }
            if (vdTaxInput) { vdTaxInput.value = isEdit ? (trigger.getAttribute('data-tax') || '') : ''; }
            if (vdContactInput) { vdContactInput.value = isEdit ? (trigger.getAttribute('data-contact') || '') : ''; }
            if (vdTelInput) { vdTelInput.value = isEdit ? (trigger.getAttribute('data-tel') || '') : ''; }
            if (vdMailInput) { vdMailInput.value = isEdit ? (trigger.getAttribute('data-mail') || '') : ''; }
            if (vdStatusInput) { vdStatusInput.value = isEdit ? (trigger.getAttribute('data-status') || 'active') : 'active'; }

            var cats = isEdit ? (trigger.getAttribute('data-cats') || '').split(',') : [];
            vmCatChecks.forEach(function (check) {
                check.checked = cats.indexOf(check.value) !== -1;
            });
        });

        var vendorForm = document.getElementById('vendorForm');
        if (vendorForm) {
            vendorForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var instance = bootstrap.Modal.getInstance(vendorModal);
                if (instance) { instance.hide(); }
            });
        }
    }
})();

// ------------------------------------------------------------
// 中心端帳號管理（center/accounts.html）：重設密碼 modal
// 依觸發按鈕帶入姓名／所屬單位／帳號；重設方式切換連結／臨時密碼時
// 同步臨時密碼欄位顯示、送出按鈕文字與提示文字
// ------------------------------------------------------------
(function () {
    var accountResetModal = document.getElementById('accountResetModal');
    if (!accountResetModal) { return; }

    var arName = accountResetModal.querySelector('[data-js="accountResetName"]');
    var arUnit = accountResetModal.querySelector('[data-js="accountResetUnit"]');
    var arAccount = accountResetModal.querySelector('[data-js="accountResetAccount"]');

    var arWayCards = accountResetModal.querySelectorAll('[data-js="accountResetWayCard"]');
    var arWayInputs = accountResetModal.querySelectorAll('[data-js="accountResetWayInput"]');
    var arTempFields = accountResetModal.querySelector('[data-js="accountResetTempFields"]');
    var arSubmit = accountResetModal.querySelector('[data-js="accountResetSubmit"]');
    var arHintText = accountResetModal.querySelector('[data-js="accountResetHintText"]');

    function syncResetWay() {
        var checked = accountResetModal.querySelector('[data-js="accountResetWayInput"]:checked');
        var way = checked ? checked.value : 'link';

        arWayInputs.forEach(function (radio, i) {
            arWayCards[i].classList.toggle('is-selected', radio.checked);
        });

        if (arTempFields) { arTempFields.hidden = way !== 'temp'; }
        if (arSubmit) { arSubmit.textContent = way === 'temp' ? '設定臨時密碼' : '寄送重設連結'; }
        if (arHintText) {
            arHintText.textContent = way === 'temp'
                ? '請用電話或當面告知對方臨時密碼，不要用電子郵件傳送；對方登入後必須立即變更。'
                : '重設連結 24 小時內有效，對方點開後自行設定新密碼，中心不會看到密碼。';
        }
    }

    arWayInputs.forEach(function (radio) {
        radio.addEventListener('change', syncResetWay);
    });

    accountResetModal.addEventListener('show.bs.modal', function (e) {
        var trigger = e.relatedTarget;
        if (arName) { arName.textContent = (trigger && trigger.getAttribute('data-name')) || '－'; }
        if (arUnit) { arUnit.textContent = (trigger && trigger.getAttribute('data-unit')) || '－'; }
        if (arAccount) { arAccount.textContent = (trigger && trigger.getAttribute('data-account')) || '－'; }

        arWayInputs.forEach(function (radio, i) { radio.checked = i === 0; });
        syncResetWay();

        var pw = document.getElementById('acResetPw');
        var pw2 = document.getElementById('acResetPw2');
        if (pw) { pw.value = ''; }
        if (pw2) { pw2.value = ''; }
    });

    var accountResetForm = document.getElementById('accountResetForm');
    if (accountResetForm) {
        accountResetForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var instance = bootstrap.Modal.getInstance(accountResetModal);
            if (instance) { instance.hide(); }
        });
    }
})();

// ------------------------------------------------------------
// 中心端帳號管理（center/accounts.html）：新增／編輯帳號 modal
// 依觸發按鈕決定新增／編輯模式；角色切換時同步所屬單位欄位（含 label for）與權限區塊顯示
// ------------------------------------------------------------
(function () {
    var accountFormModal = document.getElementById('accountFormModal');
    if (!accountFormModal) { return; }

    var acmTitle = accountFormModal.querySelector('[data-js="accountModalTitle"]');
    var acmSub = accountFormModal.querySelector('[data-js="accountModalSub"]');
    var acmFoot = accountFormModal.querySelector('[data-js="accountModalFoot"]');
    var acmSubmit = accountFormModal.querySelector('[data-js="accountSubmit"]');

    var acRoleCards = accountFormModal.querySelectorAll('[data-js="accountRoleCard"]');
    var acRoleInputs = accountFormModal.querySelectorAll('[data-js="accountRoleInput"]');
    var acUnitSelects = accountFormModal.querySelectorAll('[data-js="accountUnitSelect"]');
    var acUnitLabel = accountFormModal.querySelector('[data-js="accountUnitLabel"]');
    var acUnitHint = accountFormModal.querySelector('[data-js="accountUnitHint"]');
    var acPermFieldset = accountFormModal.querySelector('[data-js="accountPermFieldset"]');
    var acSchoolType = accountFormModal.querySelector('[data-js="accountSchoolType"]');
    var acUnitSchool = accountFormModal.querySelector('[data-js="accountSchoolName"]');

    var acNameInput = document.getElementById('acName');
    var acTelInput = document.getElementById('acTel');
    var acMailInput = document.getElementById('acMail');
    var acStatusInput = document.getElementById('acStatus');

    var UNIT_LABEL = {
        center: ['所屬單位', '中心人員固定為特教資源中心'],
        school: ['所屬學校', '例外帳號可指定一所學校，跨校人員可在學校管理再加入其他學校'],
        vendor: ['所屬廠商', '廠商需先在廠商管理建立或審核通過']
    };

    function syncSchoolOptions() {
        if (!acSchoolType || !acUnitSchool) { return; }
        var type = acSchoolType.value;
        var firstVisible = null;
        var currentStillValid = false;

        Array.prototype.forEach.call(acUnitSchool.options, function (opt) {
            var match = opt.getAttribute('data-level') === type;
            opt.hidden = !match;
            if (match && !firstVisible) { firstVisible = opt; }
            if (match && opt.selected) { currentStillValid = true; }
        });

        if (!currentStillValid && firstVisible) {
            acUnitSchool.value = firstVisible.value;
        }
    }

    if (acSchoolType) {
        acSchoolType.addEventListener('change', syncSchoolOptions);
    }

    function syncAccountRole() {
        var checked = accountFormModal.querySelector('[data-js="accountRoleInput"]:checked');
        var role = checked ? checked.value : 'center';

        acRoleInputs.forEach(function (radio, i) {
            acRoleCards[i].classList.toggle('is-selected', radio.checked);
        });

        acUnitSelects.forEach(function (select) {
            var match = select.getAttribute('data-role') === role;
            select.hidden = !match;
            select.disabled = !match;
        });
        if (acSchoolType && acUnitSchool) {
            acSchoolType.disabled = role !== 'school';
            acUnitSchool.disabled = role !== 'school';
        }

        var labelText = UNIT_LABEL[role] || UNIT_LABEL.center;
        if (acUnitLabel) {
            acUnitLabel.childNodes[0].nodeValue = labelText[0] + ' ';
            if (role === 'school') {
                acUnitLabel.removeAttribute('for');
            } else {
                acUnitLabel.setAttribute('for', 'acUnit' + role.charAt(0).toUpperCase() + role.slice(1));
            }
        }
        if (acUnitHint) { acUnitHint.textContent = labelText[1]; }

        if (acPermFieldset) { acPermFieldset.hidden = role !== 'center'; }
    }

    acRoleInputs.forEach(function (radio) {
        radio.addEventListener('change', syncAccountRole);
    });

    accountFormModal.addEventListener('show.bs.modal', function (e) {
        var trigger = e.relatedTarget;
        var isEdit = !!(trigger && trigger.getAttribute('data-js') === 'accountEditOpen');

        if (acmTitle) { acmTitle.textContent = isEdit ? '編輯帳號' : '新增帳號'; }
        if (acmSub) {
            acmSub.textContent = isEdit
                ? ((trigger.getAttribute('data-name') || '') + '・' + (trigger.getAttribute('data-mail') || ''))
                : '使用教育部 OpenID 的學校人員不需在這裡新增';
        }
        if (acmSubmit) { acmSubmit.textContent = isEdit ? '儲存' : '建立帳號'; }
        if (acmFoot) {
            acmFoot.textContent = isEdit
                ? '修改登入信箱後，系統會寄送確認信到新信箱。'
                : '建立後系統會寄送設定密碼信到登入信箱，連結 24 小時內有效。';
        }

        var role = isEdit ? (trigger.getAttribute('data-role') || 'center') : 'center';
        acRoleInputs.forEach(function (radio) { radio.checked = radio.value === role; });
        syncAccountRole();

        if (acNameInput) { acNameInput.value = isEdit ? (trigger.getAttribute('data-name') || '') : ''; }
        if (acTelInput) { acTelInput.value = isEdit ? (trigger.getAttribute('data-tel') || '') : ''; }
        if (acMailInput) { acMailInput.value = isEdit ? (trigger.getAttribute('data-mail') || '') : ''; }
        if (acStatusInput) { acStatusInput.value = isEdit ? (trigger.getAttribute('data-status') || 'active') : 'active'; }

        var unitValue = isEdit ? (trigger.getAttribute('data-unit') || '') : '';
        if (role === 'school' && acSchoolType && acUnitSchool) {
            acSchoolType.value = isEdit ? (trigger.getAttribute('data-level') || 'e') : 'e';
            syncSchoolOptions();
            if (unitValue) { acUnitSchool.value = unitValue; }
        } else if (unitValue) {
            acUnitSelects.forEach(function (select) {
                if (select.getAttribute('data-role') === role) { select.value = unitValue; }
            });
        }

        var perm = isEdit ? (trigger.getAttribute('data-perm') || 'staff') : 'staff';
        var permInput = accountFormModal.querySelector('input[name="acPerm"][value="' + perm + '"]');
        if (permInput) { permInput.checked = true; }
    });

    var accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var instance = bootstrap.Modal.getInstance(accountFormModal);
            if (instance) { instance.hide(); }
        });
    }
})();

// ------------------------------------------------------------
// 中心端最新消息管理（center/news.html）：新增／編輯消息 modal
// 依觸發按鈕的 data-news-* 決定新增／編輯模式；附件與相關連結在 modal 內自行管理，送出前不離開頁面
// ------------------------------------------------------------
(function () {
    var newsFormModal = document.getElementById('newsFormModal');
    if (!newsFormModal) { return; }

    var nfmTitle = newsFormModal.querySelector('[data-js="newsModalTitle"]');
    var neTitleInput = document.getElementById('neTitle');
    var neCatInput = document.getElementById('neCat');
    var neFromInput = document.getElementById('neFrom');
    var neToInput = document.getElementById('neTo');
    var neBodyInput = newsFormModal.querySelector('[data-js="neBodyInput"]');
    var neOnInput = newsFormModal.querySelector('[data-js="neOnInput"]');
    var neOnLabel = newsFormModal.querySelector('[data-js="neOnLabel"]');
    var neOnDesc = newsFormModal.querySelector('[data-js="neOnDesc"]');
    var nePinnedInput = document.getElementById('nePinned');
    var neHomeInput = document.getElementById('neHome');

    // ---- 附件上傳（比照全站共用 fileRow 模式，可多檔；編輯既有消息時先列出後台已上傳的檔案）----
    function formatFileSize(bytes) {
        if (bytes < 1024) { return bytes + ' B'; }
        if (bytes < 1024 * 1024) { return Math.round(bytes / 1024) + ' KB'; }
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function fileExt(file) {
        var m = file.name.match(/\.([a-zA-Z0-9]+)$/);
        return m ? m[1].toUpperCase() : '檔案';
    }

    function fileIconClass(file) {
        var ext = fileExt(file).toLowerCase();
        if (ext === 'pdf') { return 'bi-file-earmark-pdf'; }
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].indexOf(ext) !== -1) { return 'bi-file-earmark-image'; }
        return 'bi-file-earmark-text';
    }

    function createFileRow(name, meta, onDelete) {
        var row = document.createElement('div');
        row.className = 'fileRow fileRow-upload';

        var icon = document.createElement('span');
        icon.className = 'fileRow-icon';
        icon.setAttribute('aria-hidden', 'true');
        var iconI = document.createElement('i');
        iconI.className = 'bi ' + meta.iconClass;
        icon.appendChild(iconI);

        var body = document.createElement('span');
        body.className = 'fileRow-body';
        var nameEl = document.createElement('span');
        nameEl.className = 'fileRow-name';
        nameEl.textContent = name;
        var metaEl = document.createElement('span');
        metaEl.className = 'fileRow-meta';
        metaEl.textContent = meta.text;
        body.appendChild(nameEl);
        body.appendChild(metaEl);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'fileRow-delete';
        delBtn.setAttribute('aria-label', '刪除檔案 ' + name);
        var delI = document.createElement('i');
        delI.className = 'bi bi-trash3';
        delI.setAttribute('aria-hidden', 'true');
        delBtn.appendChild(delI);
        delBtn.addEventListener('click', onDelete);

        row.appendChild(icon);
        row.appendChild(body);
        row.appendChild(delBtn);
        return row;
    }

    var neFileLabel = newsFormModal.querySelector('label[for="neFile"]');
    var neFileInput = document.getElementById('neFile');
    var neFileList = newsFormModal.querySelector('[data-js="neFileList"]');
    var neFiles = [];
    var neExistingFile = null;

    function syncNeFiles() {
        var dt = new DataTransfer();
        neFiles.forEach(function (f) { dt.items.add(f); });
        neFileInput.files = dt.files;
    }

    function renderNeFiles() {
        neFileList.innerHTML = '';
        if (neExistingFile) {
            neFileList.appendChild(createFileRow(neExistingFile.name, {
                iconClass: 'bi-file-earmark-text',
                text: neExistingFile.size || '已上傳'
            }, function () {
                neExistingFile = null;
                renderNeFiles();
            }));
        }
        neFiles.forEach(function (file, i) {
            neFileList.appendChild(createFileRow(file.name, {
                iconClass: fileIconClass(file),
                text: fileExt(file) + '．' + formatFileSize(file.size)
            }, function () {
                neFiles.splice(i, 1);
                syncNeFiles();
                renderNeFiles();
            }));
        });
        neFileList.hidden = !neExistingFile && neFiles.length === 0;
    }

    function addNeFiles(list) {
        var incoming = Array.prototype.slice.call(list);
        if (!incoming.length) { return; }
        neFiles = neFiles.concat(incoming);
        syncNeFiles();
        renderNeFiles();
    }

    if (neFileLabel && neFileInput && neFileList) {
        neFileInput.addEventListener('change', function () { addNeFiles(neFileInput.files); });

        ['dragenter', 'dragover'].forEach(function (evt) {
            neFileLabel.addEventListener(evt, function (e) {
                e.preventDefault();
                neFileLabel.classList.add('is-dragover');
            });
        });
        ['dragleave', 'dragend'].forEach(function (evt) {
            neFileLabel.addEventListener(evt, function () { neFileLabel.classList.remove('is-dragover'); });
        });
        neFileLabel.addEventListener('drop', function (e) {
            e.preventDefault();
            neFileLabel.classList.remove('is-dragover');
            if (e.dataTransfer) { addNeFiles(e.dataTransfer.files); }
        });
    }

    // ---- 相關連結：新增／編輯／刪除（編輯＝移除原列＋把內容帶回表單，送出後重新加入）----
    var neLinkList = newsFormModal.querySelector('[data-js="neLinkList"]');
    var neLinkForm = newsFormModal.querySelector('[data-js="neLinkForm"]');
    var neLinkTextInput = document.getElementById('neLinkText');
    var neLinkUrlInput = document.getElementById('neLinkUrl');
    var neLinkAddOpenBtn = newsFormModal.querySelector('[data-js="neLinkAddOpen"]');
    var neLinkCancelBtn = newsFormModal.querySelector('[data-js="neLinkCancel"]');
    var neLinkAddBtn = newsFormModal.querySelector('[data-js="neLinkAdd"]');
    var neLinks = [];

    function openNeLinkForm(editingLink) {
        neLinkTextInput.value = editingLink ? editingLink.text : '';
        neLinkUrlInput.value = editingLink ? editingLink.url : '';
        neLinkForm.hidden = false;
        neLinkAddOpenBtn.hidden = true;
        neLinkTextInput.focus();
    }

    function closeNeLinkForm() {
        neLinkForm.hidden = true;
        neLinkAddOpenBtn.hidden = false;
        neLinkTextInput.value = '';
        neLinkUrlInput.value = '';
    }

    function renderNeLinks() {
        Array.prototype.forEach.call(neLinkList.querySelectorAll('.fileRow'), function (el) { el.remove(); });
        neLinks.forEach(function (link, i) {
            var row = document.createElement('div');
            row.className = 'fileRow fileRow-preview';

            var icon = document.createElement('span');
            icon.className = 'fileRow-icon';
            icon.setAttribute('aria-hidden', 'true');
            var iconI = document.createElement('i');
            iconI.className = 'bi bi-link-45deg';
            icon.appendChild(iconI);

            var body = document.createElement('span');
            body.className = 'fileRow-body';
            var nameEl = document.createElement('span');
            nameEl.className = 'fileRow-name';
            nameEl.textContent = link.text;
            var metaEl = document.createElement('span');
            metaEl.className = 'fileRow-meta';
            metaEl.textContent = link.url;
            body.appendChild(nameEl);
            body.appendChild(metaEl);

            var actions = document.createElement('span');
            actions.className = 'fileRow-actions';

            var editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'btnIconCircle btnIconCircle-sm';
            editBtn.setAttribute('aria-label', '編輯連結 ' + link.text);
            editBtn.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i>';
            editBtn.addEventListener('click', function () {
                neLinks.splice(i, 1);
                renderNeLinks();
                openNeLinkForm(link);
            });

            var delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btnIconCircle btnIconCircle-sm btnIconCircle-danger';
            delBtn.setAttribute('aria-label', '刪除連結 ' + link.text);
            delBtn.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i>';
            delBtn.addEventListener('click', function () {
                neLinks.splice(i, 1);
                renderNeLinks();
            });

            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            row.appendChild(icon);
            row.appendChild(body);
            row.appendChild(actions);
            neLinkList.insertBefore(row, neLinkAddOpenBtn);
        });
    }

    if (neLinkAddOpenBtn) { neLinkAddOpenBtn.addEventListener('click', function () { openNeLinkForm(null); }); }
    if (neLinkCancelBtn) { neLinkCancelBtn.addEventListener('click', closeNeLinkForm); }
    if (neLinkAddBtn) {
        neLinkAddBtn.addEventListener('click', function () {
            var text = neLinkTextInput.value.trim();
            var url = neLinkUrlInput.value.trim();
            if (!text || !url) { return; }
            neLinks.push({ text: text, url: url });
            renderNeLinks();
            closeNeLinkForm();
        });
    }

    // ---- 啟用開關：整列即是開關按鈕，切換說明文字，停用即為草稿（不只靠顏色辨識）----
    function setNeOn(isOn) {
        neOnInput.classList.toggle('is-on', isOn);
        neOnInput.setAttribute('aria-checked', isOn ? 'true' : 'false');
        var knob = neOnInput.querySelector('.toggleSwitch');
        if (knob) { knob.classList.toggle('is-on', isOn); }
        if (isOn) {
            neOnLabel.textContent = '啟用';
            neOnDesc.textContent = '儲存後依上架日期顯示在前台，到了下架日期會自動下架';
        } else {
            neOnLabel.textContent = '停用（草稿）';
            neOnDesc.textContent = '不會顯示在前台，之後可以再回來開啟';
        }
    }

    if (neOnInput) {
        neOnInput.addEventListener('click', function () {
            setNeOn(!neOnInput.classList.contains('is-on'));
        });
    }

    // ---- 開啟 modal：依觸發按鈕決定新增／編輯內容 ----
    newsFormModal.addEventListener('show.bs.modal', function (e) {
        var trigger = e.relatedTarget;
        var isEdit = !!(trigger && trigger.getAttribute('data-js') === 'newsEditOpen');

        if (nfmTitle) { nfmTitle.textContent = isEdit ? '編輯消息' : '新增消息'; }

        neTitleInput.value = isEdit ? (trigger.getAttribute('data-news-title') || '') : '';
        neCatInput.value = isEdit ? (trigger.getAttribute('data-news-cat') || 'apply') : 'apply';
        neFromInput.value = isEdit ? (trigger.getAttribute('data-news-from') || '') : '';
        neToInput.value = isEdit ? (trigger.getAttribute('data-news-to') || '') : '';
        neBodyInput.value = isEdit ? (trigger.getAttribute('data-news-body') || '') : '';
        nePinnedInput.checked = isEdit && trigger.getAttribute('data-news-pinned') === 'true';
        neHomeInput.checked = isEdit ? trigger.getAttribute('data-news-home') === 'true' : true;
        setNeOn(isEdit ? trigger.getAttribute('data-news-enabled') !== 'false' : true);

        neFiles = [];
        neExistingFile = null;
        if (isEdit) {
            var fileJson = trigger.getAttribute('data-news-file');
            if (fileJson) {
                try { neExistingFile = JSON.parse(fileJson); } catch (err) { neExistingFile = null; }
            }
        }
        if (neFileInput) { neFileInput.value = ''; }
        renderNeFiles();

        neLinks = [];
        if (isEdit) {
            var linksJson = trigger.getAttribute('data-news-links');
            if (linksJson) {
                try { neLinks = JSON.parse(linksJson); } catch (err2) { neLinks = []; }
            }
        }
        renderNeLinks();
        closeNeLinkForm();
    });

    var newsForm = document.getElementById('newsForm');
    if (newsForm) {
        newsForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var instance = bootstrap.Modal.getInstance(newsFormModal);
            if (instance) { instance.hide(); }
        });
    }
})();

// ------------------------------------------------------------
// 中心端最新消息管理（center/news.html）：刪除消息確認 modal
// 確認刪除後從列表移除該列，並同步頁籤數字與總筆數
// ------------------------------------------------------------
(function () {
    var newsDeleteModal = document.getElementById('newsDeleteModal');
    if (!newsDeleteModal) { return; }

    var ndTitle = newsDeleteModal.querySelector('[data-js="ndTitle"]');
    var confirmBtn = newsDeleteModal.querySelector('[data-js="newsDeleteConfirm"]');
    var pendingRow = null;

    newsDeleteModal.addEventListener('show.bs.modal', function (e) {
        var trigger = e.relatedTarget;
        if (ndTitle) { ndTitle.textContent = trigger ? (trigger.getAttribute('data-title') || '') : ''; }
        pendingRow = trigger ? trigger.closest('tr') : null;
    });

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
            if (pendingRow) {
                var category = pendingRow.getAttribute('data-category');

                var tablist = document.querySelector('[role="tablist"][aria-label="依狀態檢視"]');
                if (tablist) {
                    var allBadge = tablist.querySelector('[data-category="all"] .tabsCount-badge');
                    var catBadge = tablist.querySelector('[data-category="' + category + '"] .tabsCount-badge');
                    if (allBadge) { allBadge.textContent = Math.max(0, parseInt(allBadge.textContent, 10) - 1); }
                    if (catBadge) { catBadge.textContent = Math.max(0, parseInt(catBadge.textContent, 10) - 1); }
                }

                var totalNote = document.querySelector('[data-js="newsTotalNote"]');
                if (totalNote) {
                    var n = parseInt((totalNote.textContent.match(/\d+/) || ['0'])[0], 10);
                    totalNote.textContent = '總筆數：' + Math.max(0, n - 1);
                }

                pendingRow.remove();
                pendingRow = null;
            }
            var instance = bootstrap.Modal.getInstance(newsDeleteModal);
            if (instance) { instance.hide(); }
        });
    }
})();

// ------------------------------------------------------------
// 中心端最新消息管理（center/news.html）：分類管理 modal（排序／改名／新增／刪除）
// 刪除僅在該分類目前沒有消息時可用（aria-disabled 由列表上的 data-cat-count 決定）
// ------------------------------------------------------------
(function () {
    var newsCatModal = document.getElementById('newsCatModal');
    if (!newsCatModal) { return; }

    var catList = newsCatModal.querySelector('[data-js="newsCatList"]');
    var newCatInput = document.getElementById('newsCatNew');
    var addCatBtn = newsCatModal.querySelector('[data-js="newsCatAddBtn"]');
    var CAT_TAG_CLASSES = ['tag-tealSoft', 'tag-goldLight', 'tag-coralLight'];

    function refreshMoveButtons() {
        var rows = Array.prototype.slice.call(catList.querySelectorAll('.newsCatRow'));
        rows.forEach(function (row, i) {
            var upBtn = row.querySelector('[data-js="catMoveUp"]');
            var downBtn = row.querySelector('[data-js="catMoveDown"]');
            if (upBtn) {
                if (i === 0) { upBtn.setAttribute('aria-disabled', 'true'); } else { upBtn.removeAttribute('aria-disabled'); }
            }
            if (downBtn) {
                if (i === rows.length - 1) { downBtn.setAttribute('aria-disabled', 'true'); } else { downBtn.removeAttribute('aria-disabled'); }
            }
        });
    }

    function renameCategoryEverywhere(catKey, newName) {
        document.querySelectorAll('.tagPill[data-cat="' + catKey + '"]').forEach(function (t) {
            if (t.closest('#newsCatModal')) { return; }
            t.textContent = newName;
        });
        document.querySelectorAll('#newsFilterCat option[value="' + catKey + '"], #neCat option[value="' + catKey + '"]').forEach(function (opt) {
            opt.textContent = newName;
        });
    }

    function removeCategoryEverywhere(catKey) {
        document.querySelectorAll('#newsFilterCat option[value="' + catKey + '"], #neCat option[value="' + catKey + '"]').forEach(function (opt) {
            opt.remove();
        });
    }

    catList.addEventListener('click', function (e) {
        var row = e.target.closest ? e.target.closest('.newsCatRow') : null;
        if (!row) { return; }
        var catKey = row.getAttribute('data-cat');

        var upBtn = e.target.closest('[data-js="catMoveUp"]');
        if (upBtn) {
            if (upBtn.getAttribute('aria-disabled') === 'true') { return; }
            var prev = row.previousElementSibling;
            if (prev) { catList.insertBefore(row, prev); refreshMoveButtons(); upBtn.focus(); }
            return;
        }

        var downBtn = e.target.closest('[data-js="catMoveDown"]');
        if (downBtn) {
            if (downBtn.getAttribute('aria-disabled') === 'true') { return; }
            var next = row.nextElementSibling;
            if (next) { catList.insertBefore(next, row); refreshMoveButtons(); downBtn.focus(); }
            return;
        }

        var renameToggle = e.target.closest('[data-js="catRenameToggle"]');
        if (renameToggle) {
            var tag = row.querySelector('[data-js="catTag"]');
            var input = row.querySelector('[data-js="catRenameInput"]');
            if (input.hidden) {
                input.value = tag.textContent.trim();
                tag.hidden = true;
                input.hidden = false;
                input.focus();
                renameToggle.textContent = '完成';
            } else {
                var newName = input.value.trim();
                if (newName) {
                    tag.textContent = newName;
                    if (catKey) { renameCategoryEverywhere(catKey, newName); }
                    var moveLabel = row.querySelector('[data-js="catMoveUp"]');
                    if (moveLabel) { moveLabel.setAttribute('aria-label', '上移 ' + newName); }
                    var moveLabelDown = row.querySelector('[data-js="catMoveDown"]');
                    if (moveLabelDown) { moveLabelDown.setAttribute('aria-label', '下移 ' + newName); }
                    var delBtnLabel = row.querySelector('[data-js="catDelete"]');
                    if (delBtnLabel) { delBtnLabel.setAttribute('aria-label', '刪除分類 ' + newName); }
                    renameToggle.setAttribute('aria-label', '修改分類名稱 ' + newName);
                }
                input.hidden = true;
                tag.hidden = false;
                renameToggle.textContent = '改名';
            }
            return;
        }

        var deleteBtn = e.target.closest('[data-js="catDelete"]');
        if (deleteBtn) {
            if (deleteBtn.getAttribute('aria-disabled') === 'true') { return; }
            if (catKey) { removeCategoryEverywhere(catKey); }
            row.remove();
            refreshMoveButtons();
        }
    });

    if (addCatBtn && newCatInput) {
        addCatBtn.addEventListener('click', function () {
            var name = newCatInput.value.trim();
            if (!name) { return; }
            var catKey = 'cat' + Date.now();
            var tagClass = CAT_TAG_CLASSES[catList.querySelectorAll('.newsCatRow').length % CAT_TAG_CLASSES.length];

            var row = document.createElement('div');
            row.className = 'newsCatRow';
            row.setAttribute('data-cat', catKey);
            row.setAttribute('data-cat-count', '0');

            var moveGroup = document.createElement('div');
            moveGroup.className = 'newsCatRow-moveGroup';
            var upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'newsCatRow-moveBtn';
            upBtn.setAttribute('aria-label', '上移 ' + name);
            upBtn.setAttribute('data-js', 'catMoveUp');
            upBtn.innerHTML = '<i class="bi bi-chevron-up" aria-hidden="true"></i>';
            var downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'newsCatRow-moveBtn';
            downBtn.setAttribute('aria-disabled', 'true');
            downBtn.setAttribute('aria-label', '下移 ' + name);
            downBtn.setAttribute('data-js', 'catMoveDown');
            downBtn.innerHTML = '<i class="bi bi-chevron-down" aria-hidden="true"></i>';
            moveGroup.appendChild(upBtn);
            moveGroup.appendChild(downBtn);
            row.appendChild(moveGroup);

            var tag = document.createElement('span');
            tag.className = 'tagPill ' + tagClass;
            tag.setAttribute('data-js', 'catTag');
            tag.textContent = name;
            row.appendChild(tag);

            var renameInput = document.createElement('input');
            renameInput.type = 'text';
            renameInput.className = 'form-control newsCatRow-renameInput';
            renameInput.value = name;
            renameInput.setAttribute('data-js', 'catRenameInput');
            renameInput.hidden = true;
            row.appendChild(renameInput);

            var countEl = document.createElement('span');
            countEl.className = 'newsCatRow-count';
            countEl.setAttribute('data-js', 'catCount');
            countEl.textContent = '0 則';
            row.appendChild(countEl);

            var renameToggle = document.createElement('button');
            renameToggle.type = 'button';
            renameToggle.className = 'btnPill btn-outline btnPill-sm';
            renameToggle.setAttribute('data-js', 'catRenameToggle');
            renameToggle.setAttribute('aria-label', '修改分類名稱 ' + name);
            renameToggle.textContent = '改名';
            row.appendChild(renameToggle);

            var deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btnIconCircle btnIconCircle-sm btnIconCircle-danger';
            deleteBtn.setAttribute('data-js', 'catDelete');
            deleteBtn.setAttribute('aria-describedby', 'catDeleteNote');
            deleteBtn.setAttribute('aria-label', '刪除分類 ' + name);
            deleteBtn.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i>';
            row.appendChild(deleteBtn);

            catList.appendChild(row);
            refreshMoveButtons();

            var filterOpt = document.createElement('option');
            filterOpt.value = catKey;
            filterOpt.textContent = name;
            var filterSelect = document.getElementById('newsFilterCat');
            if (filterSelect) { filterSelect.appendChild(filterOpt); }

            var formOpt = document.createElement('option');
            formOpt.value = catKey;
            formOpt.textContent = name;
            var formSelect = document.getElementById('neCat');
            if (formSelect) { formSelect.appendChild(formOpt); }

            newCatInput.value = '';
            newCatInput.focus();
        });
    }

    refreshMoveButtons();
})();

// ------------------------------------------------------------
// 中心端系統設定（center/settings.html）：左側導覽滾動偵測，捲動時標示目前所在區塊
// ------------------------------------------------------------
(function () {
    var nav = document.querySelector('[data-js="settingsNav"]');
    if (!nav) { return; }

    var links = nav.querySelectorAll('[data-js="settingsNavLink"]');
    if (!links.length) { return; }

    var linkByHash = {};
    var sections = [];
    links.forEach(function (link) {
        var hash = link.getAttribute('href');
        var section = document.querySelector(hash);
        if (!section) { return; }
        linkByHash[hash] = link;
        sections.push(section);
    });

    function setActive(hash) {
        links.forEach(function (link) {
            var isActive = link.getAttribute('href') === hash;
            link.classList.toggle('is-active', isActive);
            if (isActive) {
                link.setAttribute('aria-current', 'true');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    if (!('IntersectionObserver' in window) || !sections.length) { return; }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                setActive('#' + entry.target.id);
            }
        });
    }, { rootMargin: '-96px 0px -70% 0px' });

    sections.forEach(function (section) { observer.observe(section); });
})();

// ------------------------------------------------------------
// 中心端系統設定（center/settings.html）：通知信各項目開關（toggleSwitch）
// ------------------------------------------------------------
(function () {
    var toggles = document.querySelectorAll('[data-js="mailToggle"]');
    if (!toggles.length) { return; }

    toggles.forEach(function (toggle) {
        toggle.addEventListener('click', function () {
            var isOn = toggle.classList.toggle('is-on');
            toggle.setAttribute('aria-checked', isOn ? 'true' : 'false');
        });
    });
})();

