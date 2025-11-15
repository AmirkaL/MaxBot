/**
 * Загрузчик Яндекс.Карт
 * Можно использовать без API ключа для разработки (с ограничениями)
 * Для продакшена получите ключ на https://developer.tech.yandex.ru/
 * 
 * Использование с ключом:
 * <script>window.YANDEX_MAPS_API_KEY = 'ваш_ключ';</script>
 * <script src="/static/js/yandex-maps-loader.js"></script>
 */

(function() {
    // Проверяем, не загружены ли уже карты
    if (window.ymaps) {
        return;
    }
    
    // Получаем API ключ если указан
    const apiKey = window.YANDEX_MAPS_API_KEY || '';
    
    // Формируем URL для загрузки Яндекс.Карт
    let url = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    if (apiKey) {
        url += `&apikey=${apiKey}`;
    }
    
    // Пытаемся загрузить Яндекс.Карты
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.async = true;
    
    script.onerror = function() {
        console.warn('Не удалось загрузить Яндекс.Карты. Проверьте подключение к интернету.');
    };
    
    script.onload = function() {
        console.log('Яндекс.Карты успешно загружены' + (apiKey ? ' (с API ключом)' : ' (без API ключа)'));
    };
    
    document.head.appendChild(script);
})();

