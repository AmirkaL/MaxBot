const AppState = {
    userId: null,
    userData: null,
    balance: 0,
    currentTab: 'map',
    recyclingPoints: [],
    rewards: [],
    myRewards: [],
    transactions: [],
    currentPoint: null,
    stats: {
        totalRecycled: 0,
        totalTransactions: 0,
        totalRewards: 0,
        level: 1,
        points: 0
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.maxBridge || !window.maxBridge.isReady()) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await validateUser();
    await loadInitialData();
    await loadUserStats();
    setupEventHandlers();
    
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
});

async function validateUser() {
    const initData = window.maxBridge.getInitData();
    
    try {
        const response = await fetch('/api/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ initData })
        });
        
        const data = await response.json();
        
        if (data.valid && data.userId) {
            AppState.userId = data.userId;
            
            const userData = window.maxBridge.getUserData();
            if (userData) {
                AppState.userData = userData;
                updateProfileDisplay(userData);
            } else if (data.user) {
                AppState.userData = {
                    id: data.user.id,
                    first_name: data.user.first_name || '',
                    last_name: data.user.last_name || '',
                    username: data.user.username || '',
                    photo_url: data.user.photo_url || null
                };
                updateProfileDisplay(AppState.userData);
            }
            
            return true;
        } else {
            throw new Error('Не удалось авторизоваться');
        }
    } catch (error) {
        console.error('Ошибка валидации:', error);
        alert('Ошибка авторизации. Пожалуйста, перезагрузите приложение.');
        return false;
    }
}

async function loadInitialData() {
    await Promise.all([
        loadBalance(),
        loadRecyclingPoints(),
        loadRewards(),
        loadTransactions(),
        loadMyRewards()
    ]);
}

async function loadMyRewards() {
    try {
        const initData = window.maxBridge.getInitData();
        const response = await fetch(`/api/rewards/my?initData=${encodeURIComponent(initData)}`);
        const data = await response.json();
        
        AppState.myRewards = data.rewards || [];
    } catch (error) {
        console.error('Ошибка загрузки наград:', error);
    }
}

async function loadBalance() {
    try {
        const initData = window.maxBridge.getInitData();
        const response = await fetch(`/api/user/balance?initData=${encodeURIComponent(initData)}`);
        const data = await response.json();
        
        if (data.balance !== undefined) {
            AppState.balance = data.balance;
            updateBalanceDisplay();
        }
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
    }
}

function updateBalanceDisplay() {
    const elements = document.querySelectorAll('#balance-value');
    elements.forEach(el => {
        if (el) {
            const formatted = AppState.balance.toLocaleString('ru-RU');
            el.textContent = formatted;
        }
    });
    
    const profileBalance = document.getElementById('profile-balance-value');
    if (profileBalance) {
        profileBalance.textContent = AppState.balance.toLocaleString('ru-RU');
    }
}

function updateProfileDisplay(userData) {
    if (!userData) return;
    
    const profileName = document.getElementById('profile-name');
    if (profileName) {
        const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        profileName.textContent = fullName || 'Пользователь';
    }
    
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) {
        if (userData.photo_url) {
            profileAvatar.innerHTML = `<img src="${userData.photo_url}" alt="Аватар" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const initial = (userData.first_name || 'П')[0].toUpperCase();
            profileAvatar.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; color: white;">${initial}</div>`;
        }
    }
    
    const profileUsername = document.getElementById('profile-username');
    if (profileUsername && userData.username) {
        profileUsername.textContent = `@${userData.username}`;
        profileUsername.style.display = 'block';
    }
}

async function loadUserStats() {
    try {
        const initData = window.maxBridge.getInitData();
        const response = await fetch(`/api/user/stats?initData=${encodeURIComponent(initData)}`);
        const data = await response.json();
        
        if (data.stats) {
            AppState.stats = data.stats;
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        calculateStatsFromTransactions();
    }
}

function calculateStatsFromTransactions() {
    const transactions = AppState.transactions || [];
    
    let totalRewards = 0;
    if (AppState.myRewards && AppState.myRewards.length > 0) {
        totalRewards = AppState.myRewards.length;
    } else {
        totalRewards = transactions.filter(t => t.type === 'purchase').length;
    }
    
    let totalRecycled = 0;
    let totalTransactions = transactions.length;
    
    transactions.forEach(t => {
        if (t.type === 'recycling' && t.weight) {
            totalRecycled += t.weight;
        }
    });
    
    const level = Math.floor(totalRecycled / 100) + 1;
    const points = totalRecycled % 100;
    
    AppState.stats = {
        totalRecycled: Math.round(totalRecycled * 10) / 10,
        totalTransactions,
        totalRewards,
        level,
        points: Math.round(points)
    };
    
    updateStatsDisplay();
}

function updateStatsDisplay() {
    const stats = AppState.stats;
    
    const statsContainer = document.getElementById('profile-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.totalRecycled.toFixed(1)}</div>
                <div class="stat-label">кг сдано</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.totalTransactions}</div>
                <div class="stat-label">сдач</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.totalRewards}</div>
                <div class="stat-label">наград</div>
            </div>
        `;
    }
    
    const levelElement = document.getElementById('profile-level');
    if (levelElement) {
        levelElement.textContent = `Уровень ${stats.level}`;
    }
    
    const levelProgress = document.getElementById('level-progress');
    if (levelProgress) {
        const progress = stats.points;
        levelProgress.style.width = `${progress}%`;
        levelProgress.setAttribute('aria-valuenow', progress);
    }
}

async function loadRecyclingPoints() {
    try {
        let lat = null, lng = null;
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                        maximumAge: 60000
                    });
                });
                lat = position.coords.latitude;
                lng = position.coords.longitude;
            } catch (err) {
                console.log('Геолокация недоступна:', err);
            }
        }
        
        let url = '/api/recycling-points';
        if (lat && lng) {
            url += `?lat=${lat}&lng=${lng}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        AppState.recyclingPoints = data.points || [];
        renderRecyclingPoints();
        initMap();
    } catch (error) {
        console.error('Ошибка загрузки пунктов:', error);
    }
}

function renderRecyclingPoints() {
    const container = document.getElementById('points-list');
    if (!container) return;
    
    if (AppState.recyclingPoints.length === 0) {
        container.innerHTML = '<p class="empty-state">Пункты приема не найдены</p>';
        return;
    }
    
    container.innerHTML = AppState.recyclingPoints.map(point => `
        <div class="point-card" data-point-id="${point.id}">
            <div class="point-header">
                <h3 class="point-name">${point.name}</h3>
                ${point.distance ? `<span class="point-distance">${point.distance} км</span>` : ''}
            </div>
            <p class="point-address">📍 ${point.address}</p>
            <p class="point-hours">🕐 ${point.hours}</p>
            <div class="point-types">
                ${point.types.map(type => `<span class="type-badge">${type}</span>`).join('')}
            </div>
            <button class="btn btn-sm btn-primary point-action" data-point-id="${point.id}">
                Сдать мусор
            </button>
        </div>
    `).join('');
    
    container.querySelectorAll('.point-card, .point-action').forEach(el => {
        el.addEventListener('click', (e) => {
            const pointId = parseInt(el.dataset.pointId || el.closest('.point-card')?.dataset.pointId);
            if (pointId) {
                showPointDetails(pointId);
            }
        });
    });
}

async function showPointDetails(pointId) {
    try {
        const response = await fetch(`/api/recycling-points/${pointId}`);
        const data = await response.json();
        
        AppState.currentPoint = data;
        
        const modal = document.getElementById('modal-point');
        const nameEl = document.getElementById('modal-point-name');
        const detailsEl = document.getElementById('modal-point-details');
        
        if (nameEl) nameEl.textContent = data.name;
        if (detailsEl) {
            detailsEl.innerHTML = `
                <p><strong>Адрес:</strong> ${data.address}</p>
                <p><strong>Часы работы:</strong> ${data.hours}</p>
                <p><strong>Принимает:</strong></p>
                <div class="point-types">
                    ${data.types.map(type => `<span class="type-badge">${type}</span>`).join('')}
                </div>
            `;
        }
        
        const scanBtn = document.getElementById('btn-scan-point-qr');
        if (scanBtn) {
            scanBtn.onclick = () => {
                closeModal('modal-point');
                openQRScanner();
            };
        }
        
        openModal('modal-point');
    } catch (error) {
        console.error('Ошибка загрузки пункта:', error);
        alert('Не удалось загрузить информацию о пункте');
    }
}

let yandexMap = null;
let mapMarkers = [];

function initMap() {
    const mapContainer = document.getElementById('map');
    const placeholder = document.getElementById('map-placeholder');
    
    if (!mapContainer || !placeholder) return;
    
    if (typeof ymaps === 'undefined') {
        console.warn('Яндекс.Карты не загружены. Используется режим без карты.');
        placeholder.innerHTML = `
            <p>🗺️ Найдено ${AppState.recyclingPoints.length} пунктов приема</p>
            <p class="map-hint">Выберите пункт из списка ниже</p>
            <p class="map-hint" style="font-size: 11px; color: #999;">Для отображения карты добавьте API ключ Яндекс.Карт</p>
        `;
        return;
    }
    
    placeholder.style.display = 'none';
    mapContainer.style.display = 'block';
    
    ymaps.ready(() => {
        const center = [59.9343, 30.3351];
        
        yandexMap = new ymaps.Map('map', {
            center: center,
            zoom: 11,
            controls: ['zoomControl', 'fullscreenControl']
        });
        
        const markerIcon = createMarkerIcon();
        
        AppState.recyclingPoints.forEach(point => {
            const marker = new ymaps.Placemark(
                [point.lat, point.lng],
                {
                    balloonContentHeader: `<strong>${point.name}</strong>`,
                    balloonContentBody: `
                        <p>📍 ${point.address}</p>
                        <p>🕐 ${point.hours}</p>
                        <p><strong>Принимает:</strong></p>
                        <p>${point.types.map(t => `<span style="display: inline-block; background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px; margin: 2px; font-size: 11px;">${t}</span>`).join('')}</p>
                        <button onclick="window.showPointDetailsFromMap(${point.id})" style="margin-top: 8px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                            Сдать мусор
                        </button>
                    `,
                    balloonContentFooter: `<small>ID: ${point.qr_code}</small>`
                },
                {
                    iconLayout: 'default#imageWithContent',
                    iconImageHref: markerIcon,
                    iconImageSize: [48, 48],
                    iconImageOffset: [-24, -48],
                    iconContentOffset: [24, 24]
                }
            );
            
            marker.events.add('click', () => {
                showPointDetails(point.id);
            });
            
            yandexMap.geoObjects.add(marker);
            mapMarkers.push({ marker, pointId: point.id });
        });
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    
                    const userMarker = new ymaps.Placemark(
                        [userLat, userLng],
                        {
                            balloonContent: 'Ваше местоположение'
                        },
                        {
                            preset: 'islands#blueCircleDotIcon',
                            iconColor: '#2196F3'
                        }
                    );
                    
                    yandexMap.geoObjects.add(userMarker);
                    yandexMap.setCenter([userLat, userLng], 13);
                },
                () => {
                    console.log('Геолокация недоступна');
                }
            );
        }
        
        console.log('Карта инициализирована с', AppState.recyclingPoints.length, 'пунктами приема');
    });
}

function createMarkerIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 18, 16, 18);
    ctx.fillRect(14, 16, 20, 4);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 22);
    ctx.lineTo(20, 32);
    ctx.moveTo(24, 22);
    ctx.lineTo(24, 32);
    ctx.moveTo(28, 22);
    ctx.lineTo(28, 32);
    ctx.stroke();
    
    return canvas.toDataURL();
}

window.showPointDetailsFromMap = function(pointId) {
    showPointDetails(pointId);
    if (yandexMap) {
        yandexMap.balloon.close();
    }
};

async function loadRewards() {
    try {
        const response = await fetch('/api/rewards');
        const data = await response.json();
        
        AppState.rewards = data.rewards || [];
        renderRewards();
    } catch (error) {
        console.error('Ошибка загрузки наград:', error);
    }
}

function renderRewards() {
    const container = document.getElementById('rewards-grid');
    if (!container) return;
    
    if (AppState.rewards.length === 0) {
        container.innerHTML = '<p class="empty-state">Награды временно недоступны</p>';
        return;
    }
    
    const rewardIcons = {
        'promo': '🎫',
        'product': '🎁',
        'donation': '❤️'
    };
    
    container.innerHTML = AppState.rewards.map(reward => {
        const icon = rewardIcons[reward.type] || '🎁';
        const hasImage = reward.image && reward.image !== '/static/images/coffee.png' && 
                        reward.image !== '/static/images/bag.png' && 
                        reward.image !== '/static/images/cup.png' && 
                        reward.image !== '/static/images/donation.png';
        
        return `
        <div class="reward-card" data-reward-id="${reward.id}">
            <div class="reward-image" style="background: ${getRewardGradient(reward.type)}">
                ${hasImage ? `<img src="${reward.image}" alt="${reward.name}" onerror="this.parentElement.innerHTML='${icon}'">` : icon}
            </div>
            <div class="reward-info">
                <h3 class="reward-name">${reward.name}</h3>
                <p class="reward-description">${reward.description}</p>
                <div class="reward-footer">
                    <span class="reward-price">${reward.price}</span>
                    <button class="btn btn-sm btn-primary reward-buy" 
                            data-reward-id="${reward.id}"
                            ${AppState.balance < reward.price ? 'disabled' : ''}>
                        ${AppState.balance < reward.price ? 'Недостаточно' : 'Купить'}
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    container.querySelectorAll('.reward-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rewardId = parseInt(btn.dataset.rewardId);
            if (rewardId) {
                await purchaseReward(rewardId);
            }
        });
    });
}

function getRewardGradient(type) {
    const gradients = {
        'promo': 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
        'product': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'donation': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    };
    return gradients[type] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

async function purchaseReward(rewardId) {
    if (!window.maxBridge.showConfirm) {
        if (!confirm('Вы уверены, что хотите купить эту награду?')) {
            return;
        }
    } else {
        const confirmed = await new Promise(resolve => {
            window.maxBridge.showConfirm('Вы уверены, что хотите купить эту награду?', resolve);
        });
        if (!confirmed) return;
    }
    
    try {
        const initData = window.maxBridge.getInitData();
        const response = await fetch(`/api/rewards/${rewardId}/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ initData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            AppState.balance = data.balance;
            updateBalanceDisplay();
            window.maxBridge.hapticFeedback('success');
            window.maxBridge.showAlert('Награда успешно приобретена!');
            await loadRewards();
            await loadMyRewards();
            calculateStatsFromTransactions();
        } else {
            throw new Error(data.error || 'Ошибка покупки');
        }
    } catch (error) {
        console.error('Ошибка покупки:', error);
        alert(error.message || 'Не удалось купить награду');
    }
}

async function loadTransactions() {
    try {
        const initData = window.maxBridge.getInitData();
        const response = await fetch(`/api/transactions?initData=${encodeURIComponent(initData)}`);
        const data = await response.json();
        
        AppState.transactions = data.transactions || [];
        renderTransactions();
        calculateStatsFromTransactions();
    } catch (error) {
        console.error('Ошибка загрузки транзакций:', error);
    }
}

function renderTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    if (AppState.transactions.length === 0) {
        container.innerHTML = '<p class="empty-state">История операций пуста</p>';
        return;
    }
    
    container.innerHTML = AppState.transactions.map(transaction => {
        const date = new Date(transaction.date);
        const dateStr = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let icon = '💰';
        let description = '';
        
        if (transaction.type === 'recycling') {
            icon = '♻️';
            description = `Сдано: ${transaction.material_type} (${transaction.weight} кг) в ${transaction.point_name}`;
        } else if (transaction.type === 'purchase') {
            icon = '🎁';
            description = `Покупка: ${transaction.reward_name}`;
        }
        
        const coinsClass = transaction.coins > 0 ? 'positive' : 'negative';
        const coinsSign = transaction.coins > 0 ? '+' : '';
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-info">
                    <p class="transaction-description">${description}</p>
                    <p class="transaction-date">${dateStr}</p>
                </div>
                <div class="transaction-amount ${coinsClass}">
                    ${coinsSign}${transaction.coins} <span style="font-size: 14px; opacity: 0.8;">₮</span>
                </div>
            </div>
        `;
    }).join('');
}

function setupEventHandlers() {
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.addEventListener('click', () => {
            const tabName = navItem.dataset.tab;
            switchTab(tabName);
        });
    });
    
    const btnScanQR = document.getElementById('btn-scan-qr');
    if (btnScanQR) {
        btnScanQR.addEventListener('click', openQRScanner);
    }
    
    const btnUploadReceipt = document.getElementById('btn-upload-receipt');
    if (btnUploadReceipt) {
        btnUploadReceipt.addEventListener('click', () => openModal('modal-receipt'));
    }
    
    const btnShareApp = document.getElementById('btn-share-app');
    if (btnShareApp) {
        btnShareApp.addEventListener('click', shareApp);
    }
    
    const btnAchievements = document.getElementById('btn-achievements');
    if (btnAchievements) {
        btnAchievements.addEventListener('click', () => {
            loadAchievements();
            openModal('modal-achievements');
        });
    }
    
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = btn.dataset.modal;
            closeModal(modalId);
        });
    });
    
    const receiptInput = document.getElementById('receipt-input');
    const btnSelectReceipt = document.getElementById('btn-select-receipt');
    const btnSubmitReceipt = document.getElementById('btn-submit-receipt');
    
    if (btnSelectReceipt && receiptInput) {
        btnSelectReceipt.addEventListener('click', () => receiptInput.click());
    }
    
    if (receiptInput) {
        receiptInput.addEventListener('change', handleReceiptSelect);
    }
    
    if (btnSubmitReceipt) {
        btnSubmitReceipt.addEventListener('click', submitReceipt);
    }
    
    loadPointsForReceipt();
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            toggleCatalogView(view);
        });
    });
}

function toggleCatalogView(view) {
    const container = document.getElementById('rewards-grid');
    const viewButtons = document.querySelectorAll('.view-btn');
    
    if (!container) return;
    
    viewButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    if (view === 'list') {
        container.classList.add('list-view');
    } else {
        container.classList.remove('list-view');
    }
    
    if (window.maxBridge && window.maxBridge.hapticFeedback) {
        window.maxBridge.hapticFeedback('light');
    }
}

function switchTab(tabName) {
    AppState.currentTab = tabName;
    
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.classList.toggle('active', navItem.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    if (window.maxBridge && window.maxBridge.hapticFeedback) {
        window.maxBridge.hapticFeedback('light');
    }
    
    if (tabName === 'history' && AppState.transactions.length === 0) {
        loadTransactions();
    }
}

function openQRScanner() {
    openModal('modal-qr');
    
    const video = document.getElementById('qr-video');
    if (video) {
        window.maxBridge.openCamera((qrCode) => {
            if (qrCode) {
                handleQRScanned(qrCode);
            }
        });
    }
}

async function handleQRScanned(qrCode) {
    closeModal('modal-qr');
    
    const video = document.getElementById('qr-video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    
    const point = AppState.recyclingPoints.find(p => p.qr_code === qrCode);
    if (!point) {
        alert('QR-код не распознан. Убедитесь, что вы сканируете код из пункта приема ТрешКеш.');
        return;
    }
    
    const materialType = await promptMaterialType(point.types);
    if (!materialType) return;
    
    const weight = parseFloat(prompt('Введите вес сданного мусора (кг):') || '1.0');
    if (isNaN(weight) || weight <= 0) {
        alert('Некорректный вес');
        return;
    }
    
    await submitRecycling('qr', point.id, qrCode, null, materialType, weight);
}

function promptMaterialType(availableTypes) {
    return new Promise((resolve) => {
        const types = availableTypes.map((type, index) => 
            `${index + 1}. ${type}`
        ).join('\n');
        
        const choice = prompt(`Выберите тип мусора:\n${types}\n\nВведите номер:`);
        const index = parseInt(choice) - 1;
        
        if (index >= 0 && index < availableTypes.length) {
            resolve(availableTypes[index]);
        } else {
            resolve(null);
        }
    });
}

function handleReceiptSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById('receipt-preview');
        if (preview) {
            preview.innerHTML = `<img src="${event.target.result}" alt="Чек">`;
            preview.classList.remove('hidden');
        }
        
        const btnSubmit = document.getElementById('btn-submit-receipt');
        if (btnSubmit) {
            btnSubmit.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}

async function loadPointsForReceipt() {
    const select = document.getElementById('receipt-point-select');
    if (!select) return;
    
    try {
        const response = await fetch('/api/recycling-points');
        const data = await response.json();
        
        select.innerHTML = '<option value="">Выберите пункт</option>' +
            data.points.map(p => `<option value="${p.id}">${p.name} - ${p.address}</option>`).join('');
    } catch (error) {
        console.error('Ошибка загрузки пунктов:', error);
    }
}

async function submitReceipt() {
    const pointSelect = document.getElementById('receipt-point-select');
    const materialSelect = document.getElementById('receipt-material-select');
    const weightInput = document.getElementById('receipt-weight');
    const preview = document.getElementById('receipt-preview');
    
    if (!pointSelect || !materialSelect || !weightInput) return;
    
    const pointId = parseInt(pointSelect.value);
    const materialType = materialSelect.value;
    const weight = parseFloat(weightInput.value);
    
    if (!pointId || !materialType || !weight || weight <= 0) {
        alert('Заполните все поля корректно');
        return;
    }
    
    const receiptPhoto = preview?.querySelector('img')?.src || '';
    
    await submitRecycling('receipt', pointId, null, receiptPhoto, materialType, weight);
}

async function submitRecycling(method, pointId, qrCode, receiptPhoto, materialType, weight) {
    try {
        const initData = window.maxBridge.getInitData();
        const response = await fetch('/api/recycling/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                initData,
                method,
                pointId,
                qrCode,
                receiptPhoto,
                materialType,
                weight
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            AppState.balance = data.balance;
            updateBalanceDisplay();
            window.maxBridge.hapticFeedback('success');
            
            const modal = document.getElementById('modal-success');
            const message = document.getElementById('success-message');
            if (message) {
                message.textContent = `Начислено ${data.coins} трешкоинов! Ваш баланс: ${data.balance} трешкоинов.`;
            }
            openModal('modal-success');
            
            await loadTransactions();
            await loadMyRewards();
            calculateStatsFromTransactions();
            
            closeModal('modal-receipt');
        } else {
            throw new Error(data.error || 'Ошибка обработки сдачи');
        }
    } catch (error) {
        console.error('Ошибка отправки:', error);
        alert(error.message || 'Не удалось обработать сдачу мусора');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        if (modalId === 'modal-qr') {
            const video = document.getElementById('qr-video');
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }
        }
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

function shareApp() {
    const webappUrl = window.location.origin;
    const shareText = `♻️ Присоединяйся к ТрешКеш - сдавай мусор и получай награды! 🌱\n\n${webappUrl}`;
    
    if (window.maxBridge && window.maxBridge.webApp && window.maxBridge.webApp.shareUrl) {
        window.maxBridge.webApp.shareUrl(webappUrl, shareText);
    } else if (navigator.share) {
        navigator.share({
            title: 'ТрешКеш - Сдавай мусор, получай награды',
            text: shareText,
            url: webappUrl
        }).catch(err => {
            console.log('Ошибка шаринга:', err);
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
    
    window.maxBridge.hapticFeedback('success');
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            window.maxBridge.showAlert('Ссылка скопирована в буфер обмена!');
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        window.maxBridge.showAlert('Ссылка скопирована в буфер обмена!');
    }
}

function loadAchievements() {
    const stats = AppState.stats;
    const achievements = [];
    
    if (stats.totalRecycled >= 10) {
        achievements.push({
            id: 'first_10kg',
            title: 'Первые 10 кг',
            description: 'Сдал 10 кг мусора',
            icon: '🌱',
            unlocked: true
        });
    }
    
    if (stats.totalRecycled >= 50) {
        achievements.push({
            id: 'eco_warrior',
            title: 'Эко-воин',
            description: 'Сдал 50 кг мусора',
            icon: '🛡️',
            unlocked: true
        });
    }
    
    if (stats.totalRecycled >= 100) {
        achievements.push({
            id: 'eco_hero',
            title: 'Эко-герой',
            description: 'Сдал 100 кг мусора',
            icon: '🦸',
            unlocked: true
        });
    }
    
    if (stats.totalRecycled >= 500) {
        achievements.push({
            id: 'eco_legend',
            title: 'Эко-легенда',
            description: 'Сдал 500 кг мусора',
            icon: '👑',
            unlocked: true
        });
    }
    
    if (stats.totalTransactions >= 10) {
        achievements.push({
            id: 'regular',
            title: 'Постоянный клиент',
            description: 'Сделал 10 сдач',
            icon: '⭐',
            unlocked: true
        });
    }
    
    if (stats.totalRewards >= 5) {
        achievements.push({
            id: 'reward_collector',
            title: 'Коллекционер наград',
            description: 'Получил 5 наград',
            icon: '🎁',
            unlocked: true
        });
    }
    
    if (stats.level >= 5) {
        achievements.push({
            id: 'level_master',
            title: 'Мастер уровней',
            description: 'Достиг 5 уровня',
            icon: '🏅',
            unlocked: true
        });
    }
    
    if (stats.totalRecycled < 10) {
        achievements.push({
            id: 'first_10kg',
            title: 'Первые 10 кг',
            description: 'Сдай 10 кг мусора',
            icon: '🌱',
            unlocked: false,
            progress: Math.min(100, (stats.totalRecycled / 10) * 100)
        });
    }
    
    if (stats.totalRecycled < 50 && stats.totalRecycled >= 10) {
        achievements.push({
            id: 'eco_warrior',
            title: 'Эко-воин',
            description: 'Сдай 50 кг мусора',
            icon: '🛡️',
            unlocked: false,
            progress: Math.min(100, (stats.totalRecycled / 50) * 100)
        });
    }
    
    renderAchievements(achievements);
}

function renderAchievements(achievements) {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    
    if (achievements.length === 0) {
        container.innerHTML = '<p class="empty-state">Достижения появятся по мере вашего прогресса</p>';
        return;
    }
    
    container.innerHTML = achievements.map(achievement => {
        const unlockedClass = achievement.unlocked ? 'unlocked' : 'locked';
        const progressBar = achievement.progress ? 
            `<div class="achievement-progress">
                <div class="achievement-progress-bar" style="width: ${achievement.progress}%"></div>
            </div>` : '';
        
        return `
            <div class="achievement-card ${unlockedClass}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <h4 class="achievement-title">${achievement.title}</h4>
                    <p class="achievement-description">${achievement.description}</p>
                    ${progressBar}
                </div>
                ${achievement.unlocked ? '<div class="achievement-badge">✓</div>' : ''}
            </div>
        `;
    }).join('');
}

