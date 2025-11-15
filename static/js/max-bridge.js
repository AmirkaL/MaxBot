class MaxBridge {
    constructor() {
        this.webApp = null;
        this.initData = null;
        this.userId = null;
        this.userData = null;
        this.ready = false;
        
        this.init();
    }

    init() {
        if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
            this.webApp = window.Telegram.WebApp;
            this.webApp.ready();
            this.webApp.expand();
            this.ready = true;
            
            this.initData = this.webApp.initData;
            
            if (this.webApp.initDataUnsafe && this.webApp.initDataUnsafe.user) {
                const user = this.webApp.initDataUnsafe.user;
                this.userId = user.id;
                this.userData = {
                    id: user.id,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    username: user.username || '',
                    photo_url: user.photo_url || null,
                    language_code: user.language_code || 'ru'
                };
            }
            
            this.setupTheme();
            
            this.webApp.onEvent('themeChanged', () => {
                this.setupTheme();
            });
            
            console.log('MAX Bridge initialized', {
                userId: this.userId,
                initData: this.initData ? 'present' : 'missing'
            });
        } else {
            console.warn('MAX WebApp API not found, using dev mode');
            this.ready = true;
            this.userId = 123456;
            this.initData = 'dev_mode';
            this.userData = {
                id: 123456,
                first_name: 'Тестовый',
                last_name: 'Пользователь',
                username: 'test_user',
                photo_url: null,
                language_code: 'ru'
            };
        }
    }

    setupTheme() {
        if (!this.webApp) return;
        
        const themeParams = this.webApp.themeParams;
        const colorScheme = this.webApp.colorScheme;
        
        // Применяем цвета темы
        if (themeParams.bg_color) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
        }
        if (themeParams.text_color) {
            document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color);
        }
        if (themeParams.hint_color) {
            document.documentElement.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
        }
        if (themeParams.link_color) {
            document.documentElement.style.setProperty('--tg-theme-link-color', themeParams.link_color);
        }
        if (themeParams.button_color) {
            document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color);
        }
        if (themeParams.button_text_color) {
            document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
        }
        
        document.body.classList.toggle('dark-theme', colorScheme === 'dark');
    }

    showMainButton(text, callback) {
        if (!this.webApp) return;
        this.webApp.MainButton.setText(text);
        this.webApp.MainButton.onClick(callback);
        this.webApp.MainButton.show();
    }

    hideMainButton() {
        if (!this.webApp) return;
        this.webApp.MainButton.hide();
    }

    showBackButton(callback) {
        if (!this.webApp) return;
        this.webApp.BackButton.onClick(callback);
        this.webApp.BackButton.show();
    }

    hideBackButton() {
        if (!this.webApp) return;
        this.webApp.BackButton.hide();
    }

    openCamera(callback) {
        if (!this.webApp) {
            this.openCameraFallback(callback);
            return;
        }
        
        this.openCameraFallback(callback);
    }

    openCameraFallback(callback) {
        const video = document.getElementById('qr-video');
        if (!video) return;
        
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        })
        .then(stream => {
            video.srcObject = stream;
            this.scanQRCode(video, callback);
        })
        .catch(err => {
            console.error('Ошибка доступа к камере:', err);
            alert('Не удалось получить доступ к камере. Проверьте разрешения.');
        });
    }

    scanQRCode(video, callback) {
        const canvas = document.getElementById('qr-canvas');
        const context = canvas.getContext('2d');
        
        const scanInterval = setInterval(() => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            }
        }, 100);
        
        setTimeout(() => {
            clearInterval(scanInterval);
        }, 30000);
    }

    showAlert(message, callback) {
        if (this.webApp && this.webApp.showAlert) {
            this.webApp.showAlert(message, callback);
        } else {
            alert(message);
            if (callback) callback();
        }
    }

    showConfirm(message, callback) {
        if (this.webApp && this.webApp.showConfirm) {
            this.webApp.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            if (callback) callback(result);
        }
    }

    hapticFeedback(type = 'impact') {
        if (this.webApp && this.webApp.HapticFeedback) {
            this.webApp.HapticFeedback.impactOccurred(type);
        }
    }

    getInitData() {
        return this.initData;
    }

    getUserId() {
        return this.userId;
    }

    getUserData() {
        return this.userData;
    }

    isReady() {
        return this.ready;
    }
}

window.maxBridge = new MaxBridge();
