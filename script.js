// ============================================
// ヒヤリハット報告書 - メインスクリプト
// ============================================

(function () {
    'use strict';

    const STORAGE_KEY = 'hiyarihatto_reports';

    // DOM Elements
    const form = document.getElementById('hiyarihattForm');
    const formContainer = document.getElementById('formContainer');
    const confirmationScreen = document.getElementById('confirmationScreen');
    const confirmationSummary = document.getElementById('confirmationSummary');
    const historyModal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    const reportCountEl = document.getElementById('reportCount');

    // Buttons
    const submitBtn = document.getElementById('submitBtn');
    const clearBtn = document.getElementById('clearBtn');
    const historyBtn = document.getElementById('historyBtn');
    const exportBtn = document.getElementById('exportBtn');
    const newReportBtn = document.getElementById('newReportBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // --- Initialize ---
    function init() {
        setDefaultDates();
        setupCharCount();
        setupEventListeners();
        updateReportCount();
    }

    function setDefaultDates() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        document.getElementById('reportDate').value = today;

        const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
        document.getElementById('incidentDate').value = localISO;
    }

    function setupCharCount() {
        const desc = document.getElementById('description');
        const counter = document.getElementById('descriptionCount');
        desc.addEventListener('input', () => {
            const len = desc.value.length;
            counter.textContent = len;
            if (len > 1000) {
                counter.style.color = 'var(--error)';
            } else {
                counter.style.color = '';
            }
        });
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        form.addEventListener('submit', handleSubmit);
        clearBtn.addEventListener('click', handleClear);
        historyBtn.addEventListener('click', openHistory);
        exportBtn.addEventListener('click', exportCSV);
        newReportBtn.addEventListener('click', showForm);
        modalCloseBtn.addEventListener('click', closeHistory);

        // フォーム印刷ボタン
        document.getElementById('printFormBtn')?.addEventListener('click', () => {
            openPrintPreview('form');
        });

        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) closeHistory();
        });

        // Clear errors on input
        form.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', () => {
                const group = el.closest('.form-group');
                if (group) group.classList.remove('has-error');
            });
            el.addEventListener('change', () => {
                const group = el.closest('.form-group');
                if (group) group.classList.remove('has-error');
            });
        });

        // Radio button error clear
        form.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const group = radio.closest('.form-group');
                if (group) group.classList.remove('has-error');
            });
        });
    }

    // --- Validation ---
    function validateForm() {
        let isValid = true;
        const checks = [
            { id: 'reporterName', type: 'input' },
            { id: 'reportDate', type: 'input' },
            { id: 'incidentDate', type: 'input' },
            { id: 'location', type: 'select' },
            { id: 'description', type: 'textarea' },
        ];

        checks.forEach(({ id }) => {
            const el = document.getElementById(id);
            const group = el.closest('.form-group');
            if (!el.value.trim()) {
                group.classList.add('has-error');
                isValid = false;
            } else {
                group.classList.remove('has-error');
            }
        });

        // Radio: category
        const categoryChecked = form.querySelector('input[name="category"]:checked');
        const categoryGroup = document.getElementById('categoryGroup').closest('.form-group');
        if (!categoryChecked) {
            categoryGroup.classList.add('has-error');
            isValid = false;
        } else {
            categoryGroup.classList.remove('has-error');
        }

        // Radio: riskLevel
        const riskChecked = form.querySelector('input[name="riskLevel"]:checked');
        const riskGroup = document.getElementById('riskLevelGroup').closest('.form-group');
        if (!riskChecked) {
            riskGroup.classList.add('has-error');
            isValid = false;
        } else {
            riskGroup.classList.remove('has-error');
        }

        if (!isValid) {
            const firstError = form.querySelector('.has-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return isValid;
    }

    // --- Submit ---
    function handleSubmit(e) {
        e.preventDefault();
        if (!validateForm()) return;

        const data = collectFormData();
        saveReport(data);
        showConfirmation(data);
    }

    function collectFormData() {
        const categoryEl = form.querySelector('input[name="category"]:checked');
        const riskEl = form.querySelector('input[name="riskLevel"]:checked');
        return {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
            reporterName: document.getElementById('reporterName').value.trim(),
            department: document.getElementById('department').value,
            reportDate: document.getElementById('reportDate').value,
            incidentDate: document.getElementById('incidentDate').value,
            location: document.getElementById('location').value,
            residentName: document.getElementById('residentName').value.trim(),
            careLevel: document.getElementById('careLevel').value,
            category: categoryEl ? categoryEl.value : '',
            riskLevel: riskEl ? riskEl.value : '',
            description: document.getElementById('description').value.trim(),
            cause: document.getElementById('cause').value.trim(),
            response: document.getElementById('response').value.trim(),
            prevention: document.getElementById('prevention').value.trim(),
        };
    }

    // --- Storage ---
    function getReports() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveReport(data) {
        const reports = getReports();
        reports.unshift(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        updateReportCount();
    }

    function deleteReport(id) {
        let reports = getReports();
        reports = reports.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        updateReportCount();
        renderHistory();
    }

    function updateReportCount() {
        reportCountEl.textContent = getReports().length;
    }

    // --- Confirmation Screen ---
    function showConfirmation(data) {
        const riskLabels = ['レベル0', 'レベル1', 'レベル2', 'レベル3'];
        const items = [
            ['報告者', data.reporterName],
            ['報告日', data.reportDate],
            ['発生日時', formatDateTime(data.incidentDate)],
            ['発生場所', data.location],
            ['利用者', data.residentName || '—'],
            ['分類', data.category],
            ['危険度', riskLabels[parseInt(data.riskLevel)] || data.riskLevel],
        ];

        confirmationSummary.innerHTML = items.map(([label, value]) =>
            `<div class="summary-item"><span class="summary-label">${label}</span><span class="summary-value">${escapeHtml(value)}</span></div>`
        ).join('');

        formContainer.style.display = 'none';
        confirmationScreen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showForm() {
        confirmationScreen.classList.remove('active');
        formContainer.style.display = 'block';
        form.reset();
        setDefaultDates();
        document.getElementById('descriptionCount').textContent = '0';
        form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- History Modal ---
    function openHistory() {
        renderHistory();
        historyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeHistory() {
        historyModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function renderHistory() {
        const reports = getReports();
        const statsArea = document.getElementById('statisticsArea');

        if (reports.length === 0) {
            historyList.innerHTML = '<p class="empty-state">まだ報告がありません</p>';
            statsArea.style.display = 'none';
            return;
        }

        statsArea.style.display = 'block';
        renderStatistics(reports);

        const riskLabels = ['レベル0', 'レベル1', 'レベル2', 'レベル3'];
        historyList.innerHTML = reports.map(r => {
            const riskClass = 'risk-' + r.riskLevel;
            const riskText = riskLabels[parseInt(r.riskLevel)] || '';
            const desc = r.description.length > 100 ? r.description.slice(0, 100) + '…' : r.description;
            return `
                <div class="history-card" data-id="${r.id}">
                    <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 8px;">
                        <button type="button" class="history-card-print" onclick="window.__printReport('${r.id}')" title="この報告を印刷" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:4px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                        </button>
                        <button type="button" class="history-card-delete" onclick="window.__deleteReport('${r.id}')" title="削除" style="position:static; opacity:1;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="history-card-header" style="padding-right: 60px;">
                        <span class="history-card-title">${escapeHtml(r.reporterName)} — ${escapeHtml(r.location)}</span>
                        <span class="history-card-date">${formatDateTime(r.incidentDate)}</span>
                    </div>
                    <div class="history-card-body">${escapeHtml(desc)}</div>
                    <div class="history-card-meta">
                        <span class="history-tag category">${escapeHtml(r.category)}</span>
                        <span class="history-tag ${riskClass}">${riskText}</span>
                        ${r.residentName ? `<span class="history-tag category">利用者: ${escapeHtml(r.residentName)}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    function renderStatistics(reports) {
        const categoryCounts = {};
        const riskCounts = {};
        const deptCounts = {};

        reports.forEach(r => {
            if (r.category) categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
            if (r.riskLevel !== '' && r.riskLevel !== undefined) {
                riskCounts[r.riskLevel] = (riskCounts[r.riskLevel] || 0) + 1;
            }
            const dept = r.department || '未設定';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });

        const riskLabels = { '0': 'レベル0', '1': 'レベル1', '2': 'レベル2', '3': 'レベル3' };

        // 危険度は レベル0→3 の順で表示（件数ではなく順序固定）
        const riskHtml = ['0', '1', '2', '3']
            .filter(k => riskCounts[k] > 0)
            .map(k => `<li><span>${riskLabels[k]}</span><span class="stat-count">${riskCounts[k]}件</span></li>`)
            .join('');

        const makeSortedList = (counts) =>
            Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) =>
                    `<li><span>${escapeHtml(key)}</span><span class="stat-count">${count}件</span></li>`
                ).join('');

        document.getElementById('categoryStatsList').innerHTML = makeSortedList(categoryCounts);
        document.getElementById('riskStatsList').innerHTML = riskHtml;
        document.getElementById('deptStatsList').innerHTML = makeSortedList(deptCounts);
    }

    // --- Print Preview Modal ---
    const printPreviewModal = document.getElementById('printPreviewModal');
    const printPreviewContent = document.getElementById('printPreviewContent');
    const printPreviewTitle = document.getElementById('printPreviewTitle');
    let currentPrintMode = null;
    let currentPrintReportId = null;

    function openPrintPreview(mode, reportId) {
        currentPrintMode = mode;
        currentPrintReportId = reportId || null;

        const now = new Date();
        const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        let html = '';

        if (mode === 'form') {
            printPreviewTitle.textContent = '印刷プレビュー — 報告書';
            html = renderFormPreview(dateStr);
        } else if (mode === 'single') {
            printPreviewTitle.textContent = '印刷プレビュー — 個別報告';
            html = renderSingleReportPreview(reportId, dateStr);
        } else if (mode === 'stats') {
            printPreviewTitle.textContent = '印刷プレビュー — 統計情報';
            html = renderStatsPreview(dateStr);
        }

        printPreviewContent.innerHTML = html;
        printPreviewModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closePrintPreview() {
        printPreviewModal.classList.remove('active');
        document.body.style.overflow = '';
        currentPrintMode = null;
        currentPrintReportId = null;
    }

    function executePrint() {
        document.body.classList.add('printing-preview');
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-preview');
        }, 500);
    }

    // --- Preview Renderers ---

    function renderFormPreview(dateStr) {
        const riskLabels = { '0': 'レベル0', '1': 'レベル1', '2': 'レベル2', '3': 'レベル3' };
        const data = {
            reporterName: document.getElementById('reporterName').value.trim() || '—',
            department: document.getElementById('department').value || '—',
            reportDate: document.getElementById('reportDate').value || '—',
            incidentDate: document.getElementById('incidentDate').value ? formatDateTime(document.getElementById('incidentDate').value) : '—',
            location: document.getElementById('location').value || '—',
            residentName: document.getElementById('residentName').value.trim() || '—',
            careLevel: document.getElementById('careLevel').value || '—',
            category: (form.querySelector('input[name="category"]:checked') || {}).value || '—',
            riskLevel: (form.querySelector('input[name="riskLevel"]:checked') || {}).value,
            description: document.getElementById('description').value.trim() || '—',
            cause: document.getElementById('cause').value.trim() || '—',
            response: document.getElementById('response').value.trim() || '—',
            prevention: document.getElementById('prevention').value.trim() || '—',
        };
        const riskText = data.riskLevel !== undefined ? (riskLabels[data.riskLevel] || '—') : '—';

        return buildReportTable('ヒヤリハット報告書', dateStr, data, riskText);
    }

    function renderSingleReportPreview(id, dateStr) {
        const reports = getReports();
        const r = reports.find(rep => rep.id === id);
        if (!r) return '<p>報告が見つかりません</p>';

        const riskLabels = { '0': 'レベル0', '1': 'レベル1', '2': 'レベル2', '3': 'レベル3' };
        const data = {
            reporterName: r.reporterName || '—',
            department: r.department || '—',
            reportDate: r.reportDate || '—',
            incidentDate: r.incidentDate ? formatDateTime(r.incidentDate) : '—',
            location: r.location || '—',
            residentName: r.residentName || '—',
            careLevel: r.careLevel || '—',
            category: r.category || '—',
            description: r.description || '—',
            cause: r.cause || '—',
            response: r.response || '—',
            prevention: r.prevention || '—',
        };
        const riskText = riskLabels[r.riskLevel] || '—';

        return buildReportTable('ヒヤリハット報告書', dateStr, data, riskText);
    }

    function buildReportTable(title, dateStr, data, riskText) {
        return `
            <div class="preview-header">
                <h2>${escapeHtml(title)}</h2>
                <div class="print-date">印刷日時: ${escapeHtml(dateStr)}</div>
            </div>
            <table class="preview-report-table">
                <tr class="preview-section-header"><td colspan="2">報告者情報</td></tr>
                <tr><th>報告者氏名</th><td>${escapeHtml(data.reporterName)}</td></tr>
                <tr><th>所属部署</th><td>${escapeHtml(data.department)}</td></tr>
                <tr><th>報告日</th><td>${escapeHtml(data.reportDate)}</td></tr>
                <tr class="preview-section-header"><td colspan="2">発生状況</td></tr>
                <tr><th>発生日時</th><td>${escapeHtml(data.incidentDate)}</td></tr>
                <tr><th>発生場所</th><td>${escapeHtml(data.location)}</td></tr>
                <tr><th>対象利用者名</th><td>${escapeHtml(data.residentName)}</td></tr>
                <tr><th>要介護度</th><td>${escapeHtml(data.careLevel)}</td></tr>
                <tr class="preview-section-header"><td colspan="2">ヒヤリハットの内容</td></tr>
                <tr><th>分類</th><td>${escapeHtml(data.category)}</td></tr>
                <tr><th>危険度レベル</th><td>${escapeHtml(riskText)}</td></tr>
                <tr><th>発生時の状況</th><td class="multiline-cell">${escapeHtml(data.description)}</td></tr>
                <tr class="preview-section-header"><td colspan="2">原因と対策</td></tr>
                <tr><th>原因</th><td class="multiline-cell">${escapeHtml(data.cause)}</td></tr>
                <tr><th>実施した対応</th><td class="multiline-cell">${escapeHtml(data.response)}</td></tr>
                <tr><th>再発防止策</th><td class="multiline-cell">${escapeHtml(data.prevention)}</td></tr>
            </table>`;
    }

    function renderStatsPreview(dateStr) {
        const reports = getReports();
        if (reports.length === 0) return '<p style="text-align:center;padding:40px;color:#666;">報告がありません</p>';

        const riskLabels = { '0': 'レベル0', '1': 'レベル1', '2': 'レベル2', '3': 'レベル3' };

        // 集計
        const categoryCounts = {};
        const riskCounts = {};
        const deptCounts = {};

        reports.forEach(r => {
            if (r.category) categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
            if (r.riskLevel !== '' && r.riskLevel !== undefined) {
                riskCounts[r.riskLevel] = (riskCounts[r.riskLevel] || 0) + 1;
            }
            const dept = r.department || '未設定';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });

        // 分類別（件数降順）
        const categoryRows = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `
                <tr>
                    <td>${escapeHtml(k)}</td>
                    <td class="stats-count-cell">${v}件</td>
                </tr>`).join('');

        // 危険度別（レベル順、0件は除外）
        const riskRows = ['0', '1', '2', '3']
            .filter(k => riskCounts[k] > 0)
            .map(k => `
                <tr>
                    <td>${riskLabels[k]}</td>
                    <td class="stats-count-cell">${riskCounts[k]}件</td>
                </tr>`).join('');

        // 部署別（件数降順）
        const deptRows = Object.entries(deptCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `
                <tr>
                    <td>${escapeHtml(k)}</td>
                    <td class="stats-count-cell">${v}件</td>
                </tr>`).join('');

        return `
            <div class="preview-header">
                <h2>ヒヤリハット統計情報</h2>
                <div class="print-date">印刷日時: ${escapeHtml(dateStr)} ／ 全${reports.length}件</div>
            </div>

            <table class="preview-stats-table">
                <thead>
                    <tr class="preview-stats-section-header">
                        <th colspan="2">分類別件数</th>
                    </tr>
                    <tr class="preview-stats-col-header">
                        <th>分類</th>
                        <th>件数</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoryRows || '<tr><td colspan="2" style="text-align:center;color:#999;">データなし</td></tr>'}
                </tbody>
            </table>

            <table class="preview-stats-table">
                <thead>
                    <tr class="preview-stats-section-header">
                        <th colspan="2">危険度レベル別件数</th>
                    </tr>
                    <tr class="preview-stats-col-header">
                        <th>レベル</th>
                        <th>件数</th>
                    </tr>
                </thead>
                <tbody>
                    ${riskRows || '<tr><td colspan="2" style="text-align:center;color:#999;">データなし</td></tr>'}
                </tbody>
            </table>

            <table class="preview-stats-table">
                <thead>
                    <tr class="preview-stats-section-header">
                        <th colspan="2">部署別件数</th>
                    </tr>
                    <tr class="preview-stats-col-header">
                        <th>部署</th>
                        <th>件数</th>
                    </tr>
                </thead>
                <tbody>
                    ${deptRows || '<tr><td colspan="2" style="text-align:center;color:#999;">データなし</td></tr>'}
                </tbody>
            </table>`;
    }

    // --- Event: Print Buttons ---

    // モーダル内「統計を印刷」ボタン → プレビュー経由
    document.getElementById('printStatsBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openPrintPreview('stats');
    });

    // プレビューモーダル操作
    document.getElementById('printPreviewExecuteBtn')?.addEventListener('click', executePrint);
    document.getElementById('printPreviewCloseBtn')?.addEventListener('click', closePrintPreview);

    // 個別報告の印刷 → プレビュー経由
    window.__printReport = function (id) {
        openPrintPreview('single', id);
    };

    // expose for inline onclick
    window.__deleteReport = function (id) {
        if (confirm('この報告を削除しますか？')) {
            deleteReport(id);
        }
    };

    // --- CSV Export ---
    function exportCSV() {
        const reports = getReports();
        if (reports.length === 0) {
            alert('エクスポートするデータがありません。');
            return;
        }

        const headers = [
            '報告者氏名', '所属部署', '報告日', '発生日時', '発生場所',
            '利用者名', '要介護度', '分類', '危険度レベル',
            '状況・内容', '原因', '対応・処置', '再発防止策'
        ];

        const rows = reports.map(r => [
            r.reporterName, r.department, r.reportDate,
            formatDateTime(r.incidentDate), r.location,
            r.residentName, r.careLevel, r.category, r.riskLevel,
            r.description, r.cause, r.response, r.prevention,
        ].map(v => `"${(v || '').replace(/"/g, '""')}"`));

        const bom = '\uFEFF';
        const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hiyarihatto_reports_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- Handle Clear ---
    function handleClear() {
        if (confirm('フォームの入力内容をすべてクリアしますか？')) {
            form.reset();
            setDefaultDates();
            document.getElementById('descriptionCount').textContent = '0';
            form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
        }
    }

    // --- Helpers ---
    function formatDateTime(isoString) {
        if (!isoString) return '—';
        try {
            const d = new Date(isoString);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${y}/${m}/${day} ${h}:${min}`;
        } catch {
            return isoString;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Start ---
    document.addEventListener('DOMContentLoaded', init);
})();
