import os
import hmac
import hashlib
import json
import base64
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import urllib.parse
import requests

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

MAX_SECRET_KEY = os.getenv('MAX_SECRET_KEY', '')
BOT_TOKEN = os.getenv('BOT_TOKEN', '')
API_BASE_URL = 'https://platform-api.max.ru'
WEBAPP_URL = os.getenv('WEBAPP_URL', 'http://46.173.29.103/')
YANDEX_MAPS_API_KEY = os.getenv('YANDEX_MAPS_API_KEY', '')

users_db = {}
recycling_points_db = [
    {
        'id': 1,
        'name': 'ЭкоПункт "Невский"',
        'address': 'Санкт-Петербург, Невский проспект, д. 28',
        'lat': 59.9343,
        'lng': 30.3351,
        'hours': '09:00-20:00',
        'types': ['пластик', 'бумага', 'стекло', 'металл'],
        'qr_code': 'TRASH_001'
    },
    {
        'id': 2,
        'name': 'ЭкоПункт "Васильевский"',
        'address': 'Санкт-Петербург, Васильевский остров, 6-я линия, д. 15',
        'lat': 59.9398,
        'lng': 30.2808,
        'hours': '10:00-19:00',
        'types': ['пластик', 'бумага', 'стекло'],
        'qr_code': 'TRASH_002'
    },
    {
        'id': 3,
        'name': 'ЭкоПункт "Петроградский"',
        'address': 'Санкт-Петербург, Каменноостровский проспект, д. 42',
        'lat': 59.9658,
        'lng': 30.3114,
        'hours': '08:00-21:00',
        'types': ['пластик', 'стекло', 'металл', 'электроника'],
        'qr_code': 'TRASH_003'
    },
    {
        'id': 4,
        'name': 'ЭкоПункт "Центральный"',
        'address': 'Санкт-Петербург, Лиговский проспект, д. 50',
        'lat': 59.9272,
        'lng': 30.3609,
        'hours': '09:00-20:00',
        'types': ['пластик', 'бумага', 'металл'],
        'qr_code': 'TRASH_004'
    },
    {
        'id': 5,
        'name': 'ЭкоПункт "Московский"',
        'address': 'Санкт-Петербург, Московский проспект, д. 212',
        'lat': 59.8708,
        'lng': 30.3194,
        'hours': '10:00-18:00',
        'types': ['пластик', 'бумага', 'стекло', 'металл', 'электроника'],
        'qr_code': 'TRASH_005'
    },
    {
        'id': 6,
        'name': 'ЭкоПункт "Приморский"',
        'address': 'Санкт-Петербург, Приморский проспект, д. 78',
        'lat': 59.9808,
        'lng': 30.2500,
        'hours': '09:00-19:00',
        'types': ['пластик', 'бумага', 'стекло'],
        'qr_code': 'TRASH_006'
    }
]

rewards_catalog = [
    {
        'id': 1,
        'name': 'Промокод на кофе -20%',
        'description': 'Скидка 20% в сети кофеен "КофеМакс"',
        'price': 50,
        'type': 'promo',
        'image': '/static/images/coffee.png'
    },
    {
        'id': 2,
        'name': 'Эко-сумка',
        'description': 'Многоразовая сумка-шопер из переработанного материала',
        'price': 100,
        'type': 'product',
        'image': '/static/images/bag.png'
    },
    {
        'id': 3,
        'name': 'Многоразовая кружка',
        'description': 'Термокружка из нержавеющей стали',
        'price': 150,
        'type': 'product',
        'image': '/static/images/cup.png'
    },
    {
        'id': 4,
        'name': 'Донат в фонд "Помощь детям"',
        'description': 'Перевести средства в благотворительный фонд',
        'price': 200,
        'type': 'donation',
        'image': '/static/images/donation.png',
        'charity_id': 'vk_dobro_001'
    }
]

recycling_rates = {
    'пластик': 10,
    'бумага': 8,
    'стекло': 12,
    'металл': 15,
    'электроника': 25
}


def validate_init_data(init_data: str) -> dict:
    if not MAX_SECRET_KEY:
        return {'user': {'id': 123456, 'first_name': 'Test', 'last_name': 'User'}}
    
    try:
        parsed = urllib.parse.parse_qs(init_data)
        data_str = parsed.get('data', [''])[0]
        hash_str = parsed.get('hash', [''])[0]
        
        if not data_str or not hash_str:
            return None
        
        secret_key = hashlib.sha256(MAX_SECRET_KEY.encode()).digest()
        calculated_hash = hmac.new(
            secret_key,
            data_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if calculated_hash != hash_str:
            return None
        
        data = json.loads(data_str)
        return data
    except Exception as e:
        print(f"Ошибка валидации initData: {e}")
        return None


def get_user_id_from_request():
    init_data = request.headers.get('X-Init-Data') or request.args.get('initData')
    if not init_data:
        return None
    
    validated = validate_init_data(init_data)
    if validated and 'user' in validated:
        return validated['user'].get('id')
    return None


@app.route('/')
def index():
    return render_template('index.html', yandex_maps_api_key=YANDEX_MAPS_API_KEY)


@app.route('/api/validate', methods=['POST'])
def validate():
    data = request.json
    init_data = data.get('initData', '')
    
    validated = validate_init_data(init_data)
    if validated:
        user_id = validated.get('user', {}).get('id')
        if user_id:
            if user_id not in users_db:
                users_db[user_id] = {
                    'balance': 0,
                    'transactions': [],
                    'rewards': []
                }
            return jsonify({
                'valid': True,
                'userId': user_id,
                'user': validated.get('user', {})
            })
    
    return jsonify({'valid': False}), 401


@app.route('/api/user/balance', methods=['GET'])
def get_balance():
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'transactions': [], 'rewards': []}
    
    return jsonify({
        'balance': users_db[user_id]['balance'],
        'userId': user_id
    })


@app.route('/api/recycling-points', methods=['GET'])
def get_recycling_points():
    user_lat = request.args.get('lat', type=float)
    user_lng = request.args.get('lng', type=float)
    
    points = recycling_points_db.copy()
    
    if user_lat and user_lng:
        for point in points:
            distance = ((point['lat'] - user_lat)**2 + (point['lng'] - user_lng)**2)**0.5
            point['distance'] = round(distance * 111, 2)
        points.sort(key=lambda x: x.get('distance', float('inf')))
    
    return jsonify({'points': points})


@app.route('/api/recycling-points/<int:point_id>', methods=['GET'])
def get_recycling_point(point_id):
    point = next((p for p in recycling_points_db if p['id'] == point_id), None)
    if not point:
        return jsonify({'error': 'Point not found'}), 404
    return jsonify(point)


@app.route('/api/recycling/submit', methods=['POST'])
def submit_recycling():
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    method = data.get('method')
    point_id = data.get('pointId')
    qr_code = data.get('qrCode')
    receipt_photo = data.get('receiptPhoto')
    material_type = data.get('materialType')
    weight = data.get('weight', 1.0)
    
    if method == 'qr':
        point = next((p for p in recycling_points_db if p['qr_code'] == qr_code), None)
        if not point:
            return jsonify({'error': 'Invalid QR code'}), 400
        point_id = point['id']
    elif method == 'receipt':
        point = next((p for p in recycling_points_db if p['id'] == point_id), None)
        if not point:
            return jsonify({'error': 'Point not found'}), 404
    else:
        return jsonify({'error': 'Invalid method'}), 400
    
    if material_type not in point['types']:
        return jsonify({
            'error': f'Этот пункт не принимает {material_type}'
        }), 400
    
    rate = recycling_rates.get(material_type, 10)
    coins = int(weight * rate)
    
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'transactions': [], 'rewards': []}
    
    users_db[user_id]['balance'] += coins
    
    transaction = {
        'id': len(users_db[user_id]['transactions']) + 1,
        'date': datetime.now().isoformat(),
        'type': 'recycling',
        'point_id': point_id,
        'point_name': point['name'],
        'material_type': material_type,
        'weight': weight,
        'coins': coins,
        'method': method
    }
    users_db[user_id]['transactions'].insert(0, transaction)
    
    return jsonify({
        'success': True,
        'coins': coins,
        'balance': users_db[user_id]['balance'],
        'transaction': transaction
    })


@app.route('/api/rewards', methods=['GET'])
def get_rewards():
    return jsonify({'rewards': rewards_catalog})


@app.route('/api/rewards/<int:reward_id>/purchase', methods=['POST'])
def purchase_reward(reward_id):
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    reward = next((r for r in rewards_catalog if r['id'] == reward_id), None)
    if not reward:
        return jsonify({'error': 'Reward not found'}), 404
    
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'transactions': [], 'rewards': []}
    
    if users_db[user_id]['balance'] < reward['price']:
        return jsonify({'error': 'Недостаточно средств'}), 400
    
    users_db[user_id]['balance'] -= reward['price']
    
    purchase = {
        'id': len(users_db[user_id]['rewards']) + 1,
        'reward_id': reward_id,
        'reward_name': reward['name'],
        'date': datetime.now().isoformat(),
        'price': reward['price'],
        'type': reward['type']
    }
    users_db[user_id]['rewards'].append(purchase)
    
    transaction = {
        'id': len(users_db[user_id]['transactions']) + 1,
        'date': datetime.now().isoformat(),
        'type': 'purchase',
        'reward_id': reward_id,
        'reward_name': reward['name'],
        'coins': -reward['price']
    }
    users_db[user_id]['transactions'].insert(0, transaction)
    
    if reward['type'] == 'donation':
        charity_id = reward.get('charity_id')
    
    return jsonify({
        'success': True,
        'balance': users_db[user_id]['balance'],
        'purchase': purchase
    })


@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'transactions': [], 'rewards': []}
    
    limit = request.args.get('limit', 50, type=int)
    transactions = users_db[user_id]['transactions'][:limit]
    
    return jsonify({'transactions': transactions})


@app.route('/api/rewards/my', methods=['GET'])
def get_my_rewards():
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'transactions': [], 'rewards': []}
    
    return jsonify({'rewards': users_db[user_id]['rewards']})


@app.route('/api/user/stats', methods=['GET'])
def get_user_stats():
    user_id = get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if user_id not in users_db:
        users_db[user_id] = {'balance': 0, 'transactions': [], 'rewards': []}
    
    user = users_db[user_id]
    
    total_recycled = 0
    total_transactions = len(user['transactions'])
    total_rewards = len(user['rewards'])
    
    for transaction in user['transactions']:
        if transaction.get('type') == 'recycling' and transaction.get('weight'):
            total_recycled += transaction['weight']
    
    level = int(total_recycled / 100) + 1
    points = int(total_recycled % 100)
    
    stats = {
        'totalRecycled': round(total_recycled, 1),
        'totalTransactions': total_transactions,
        'totalRewards': total_rewards,
        'level': level,
        'points': points
    }
    
    return jsonify({'stats': stats})


@app.route('/legal/agreement')
def agreement():
    return render_template('legal/agreement.html')


@app.route('/legal/privacy')
def privacy():
    return render_template('legal/privacy.html')


def send_message(chat_id, text, reply_markup=None, use_simple_link=False):
    if not BOT_TOKEN:
        return None
    
    if use_simple_link and WEBAPP_URL:
        text += f"\n\n🔗 Открыть приложение: {WEBAPP_URL}"
        reply_markup = None
    
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    
    if reply_markup and not use_simple_link:
        if isinstance(reply_markup, dict) and "webapp" in reply_markup and "url" in reply_markup:
            payload["reply_markup"] = reply_markup["webapp"]
        elif isinstance(reply_markup, dict) and "webapp" in reply_markup:
            payload["reply_markup"] = reply_markup["webapp"]
        elif isinstance(reply_markup, dict) and "url" in reply_markup:
            payload["reply_markup"] = reply_markup["url"]
        else:
            payload["reply_markup"] = reply_markup
    
    url1 = f"{API_BASE_URL}/bot{BOT_TOKEN}/sendMessage"
    headers1 = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url1, json=payload, headers=headers1, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            raise requests.exceptions.HTTPError(f"Status code: {response.status_code}")
    except requests.exceptions.RequestException:
        url2 = f"{API_BASE_URL}/bot/sendMessage"
        headers2 = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {BOT_TOKEN}"
        }
        
        try:
            response = requests.post(url2, json=payload, headers=headers2, timeout=10)
            if response.status_code == 200:
                return response.json()
        except requests.exceptions.RequestException:
            if reply_markup and isinstance(reply_markup, dict) and "url" in reply_markup:
                payload["reply_markup"] = reply_markup["url"]
                try:
                    response = requests.post(url1, json=payload, headers=headers1, timeout=10)
                    if response.status_code == 200:
                        return response.json()
                except:
                    pass
        return None


def create_webapp_keyboard(button_text="Открыть мини-приложение", url=None):
    webapp_url = url or WEBAPP_URL
    
    keyboard_webapp = {
        "inline_keyboard": [
            [
                {
                    "text": button_text,
                    "web_app": {
                        "url": webapp_url
                    }
                }
            ]
        ]
    }
    
    keyboard_url = {
        "inline_keyboard": [
            [
                {
                    "text": button_text,
                    "url": webapp_url
                }
            ]
        ]
    }
    
    return {"webapp": keyboard_webapp, "url": keyboard_url}


@app.route('/webhook', methods=['POST', 'GET'])
def webhook():
    if request.method == 'GET':
        return jsonify({"ok": True, "status": "webhook is working"}), 200
    
    if not BOT_TOKEN:
        return jsonify({"ok": False, "error": "BOT_TOKEN не настроен"}), 500
    
    try:
        if request.is_json:
            update = request.json
        else:
            update = request.get_json(force=True) or {}
        
        if 'message' in update:
            message = update['message']
            chat_id = message.get('chat', {}).get('id')
            text = message.get('text', '')
            user = message.get('from', {})
            user_id = user.get('id')
            user_name = user.get('first_name', 'Пользователь')
            
            if text and text.startswith('/start'):
                welcome_text = f"""👋 Привет, {user_name}!

Добро пожаловать в <b>ТрешКеш</b> - мини-приложение для сдачи мусора с системой наград!

🗺️ <b>Что можно делать:</b>
• Найти ближайшие пункты приема вторсырья на карте
• Сканировать QR-коды для быстрой фиксации сдачи
• Загружать фото чеков для подтверждения сдачи
• Получать трешкоины за сданный мусор
• Обменивать баллы на награды и промокоды

🔗 <b>Открыть приложение:</b> {WEBAPP_URL}

Нажмите кнопку ниже или перейдите по ссылке выше."""
                
                keyboard = create_webapp_keyboard("🚀 Открыть ТрешКеш", WEBAPP_URL)
                result = send_message(chat_id, welcome_text, keyboard)
                
                if not result:
                    send_message(chat_id, welcome_text, use_simple_link=True)
                
            elif text and text.startswith('/help'):
                help_text = f"""<b>Доступные команды:</b>
/start - Начать работу с ботом
/help - Показать справку
/app - Открыть мини-приложение

<b>Мини-приложение ТрешКеш:</b>
• Карта пунктов приема
• Сканирование QR-кодов
• Загрузка чеков
• Система начислений
• Каталог наград

🔗 <b>Открыть приложение:</b> {WEBAPP_URL}"""
                
                keyboard = create_webapp_keyboard("🚀 Открыть приложение", WEBAPP_URL)
                result = send_message(chat_id, help_text, keyboard)
                if not result:
                    send_message(chat_id, help_text, use_simple_link=True)
                
            elif text and text.startswith('/app'):
                app_text = f"🔗 Откройте мини-приложение по ссылке:\n\n{WEBAPP_URL}\n\nИли нажмите кнопку ниже:"
                
                keyboard = create_webapp_keyboard("🚀 Открыть мини-приложение", WEBAPP_URL)
                result = send_message(chat_id, app_text, keyboard)
                if not result:
                    send_message(chat_id, app_text, use_simple_link=True)
            else:
                default_text = f"""Используйте команду /start для начала работы.

🔗 <b>Открыть мини-приложение:</b> {WEBAPP_URL}"""
                
                keyboard = create_webapp_keyboard("🚀 Открыть приложение", WEBAPP_URL)
                result = send_message(chat_id, default_text, keyboard)
                if not result:
                    send_message(chat_id, default_text, use_simple_link=True)
        
        return jsonify({"ok": True})
        
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/set-webhook', methods=['GET', 'POST'])
def set_webhook():
    if not BOT_TOKEN:
        return jsonify({"ok": False, "error": "BOT_TOKEN не настроен"}), 500
    
    webhook_url = request.args.get('url') or os.getenv('WEBHOOK_URL')
    
    if not webhook_url:
        return jsonify({"ok": False, "error": "WEBHOOK_URL не указан"}), 400
    
    url = f"{API_BASE_URL}/bot{BOT_TOKEN}/setWebhook"
    payload = {
        "url": webhook_url
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException:
        url = f"{API_BASE_URL}/bot/setWebhook"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {BOT_TOKEN}"
        }
        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return jsonify(response.json())
        except requests.exceptions.RequestException as e2:
            return jsonify({"ok": False, "error": str(e2)}), 500


@app.route('/test-send', methods=['GET'])
def test_send():
    chat_id = request.args.get('chat_id')
    if not chat_id:
        return jsonify({"ok": False, "error": "Укажите chat_id в параметрах"}), 400
    
    test_text = f"""👋 Тестовое сообщение!

🔗 <b>Открыть приложение:</b> {WEBAPP_URL}

Это тестовое сообщение для проверки работы бота."""
    
    keyboard = create_webapp_keyboard("🚀 Открыть ТрешКеш", WEBAPP_URL)
    result = send_message(chat_id, test_text, keyboard)
    
    if result:
        return jsonify({"ok": True, "message": "Сообщение отправлено", "result": result}), 200
    else:
        result2 = send_message(chat_id, test_text, use_simple_link=True)
        if result2:
            return jsonify({"ok": True, "message": "Сообщение отправлено (без кнопки)", "result": result2}), 200
        else:
            return jsonify({"ok": False, "error": "Не удалось отправить сообщение. Проверьте логи."}), 500


if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('PORT', '5000'))
    app.run(debug=debug_mode, host='0.0.0.0', port=port)

