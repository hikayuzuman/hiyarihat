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

        // Text / Select / Textarea checks
        checks.forEach(({ id, type }) => {
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
        if (reports.length === 0) {
            historyList.innerHTML = '<p class="empty-state">まだ報告がありません</p>';
            return;
        }

        const riskLabels = ['レベル0', 'レベル1', 'レベル2', 'レベル3'];
        historyList.innerHTML = reports.map(r => {
            const riskClass = 'risk-' + r.riskLevel;
            const riskText = riskLabels[parseInt(r.riskLevel)] || '';
            const desc = r.description.length > 100 ? r.description.slice(0, 100) + '…' : r.description;
            return `
                <div class="history-card" data-id="${r.id}">
                    <button type="button" class="history-card-delete" onclick="window.__deleteReport('${r.id}')" title="削除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <div class="history-card-header">
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
