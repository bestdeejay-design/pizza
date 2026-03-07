#!/usr/bin/env python3
"""
🤖 Автоматический сборщик описаний товаров с pizzanapolirsc.ru

Использует Puppeteer-like подход через requests + BeautifulSoup
НЕ требует ручной вставки в консоль!

Установка зависимостей:
    pip install requests beautifulsoup4 lxml

Запуск:
    python auto-scrape-descriptions.py

Результат:
    descriptions-temp.json
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re

# Конфигурация
BASE_URL = 'https://pizzanapolirsc.ru'
OUTPUT_FILE = 'descriptions-temp.json'

# Заголовки для притвориться браузером
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
}

def normalize_text(text):
    """Очищает текст от лишних пробелов и спецсимволов"""
    if not text:
        return ''
    # Удаляем лишние пробелы, переносы строк
    text = re.sub(r'\s+', ' ', text.strip())
    return text

def scrape_products():
    """Собирает все товары с сайта"""
    print("🔍 Начинаем сбор описаний с pizzanapolirsc.ru...")
    print(f"📡 Запрос к {BASE_URL}")
    
    try:
        response = requests.get(BASE_URL, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Ошибка доступа к сайту: {e}")
        return []
    
    soup = BeautifulSoup(response.text, 'lxml')
    products = []
    
    # Ищем карточки товаров (Tilda использует стандартные классы)
    # Пробуем разные селекторы
    product_selectors = [
        '.js-product-card',
        '.t-store__card',
        '.product-item',
        '[data-product-id]',
        '.prodcard',
        '.catalog-item'
    ]
    
    product_cards = []
    for selector in product_selectors:
        cards = soup.select(selector)
        if cards:
            print(f"✅ Найдено по селектору '{selector}': {len(cards)} товаров")
            product_cards = cards
            break
    
    if not product_cards:
        # Если не нашли по стандартным классам, ищем по структуре
        print("⚠️  Стандартные селекторы не сработали, пробуем альтернативные...")
        
        # Ищем элементы с ценами (обычно рядом с товарами)
        price_elements = soup.select('.t-store__card__price, .price, .js-product-price')
        if price_elements:
            print(f"✅ Найдено элементов с ценами: {len(price_elements)}")
            # Поднимаемся к родительским карточкам
            for price_el in price_elements[:20]:  # Первые 20 для теста
                parent = price_el.find_parent(['div', 'article', 'section'])
                if parent:
                    product_cards.append(parent)
    
    print(f"\n📦 Всего найдено товаров: {len(product_cards)}")
    
    # Обрабатываем каждую карточку
    for i, card in enumerate(product_cards[:350], 1):  # Максимум 350 товаров
        try:
            # Извлекаем название
            title_selectors = [
                '.js-product-title',
                '.t-store__card__title',
                '.product-title',
                'h3',
                '.name',
                '.prodcard-title'
            ]
            
            title = ''
            for selector in title_selectors:
                el = card.select_one(selector)
                if el:
                    title = normalize_text(el.get_text())
                    break
            
            # Если не нашли, пробуем просто текст из карточки
            if not title:
                title_elem = card.find(['h3', 'h4', 'div'], class_=re.compile(r'title|name', re.I))
                if title_elem:
                    title = normalize_text(title_elem.get_text())
            
            # Извлекаем описание
            desc_selectors = [
                '.js-product-desc',
                '.t-store__card__desc',
                '.product-description',
                '.description',
                '.prodcard-desc'
            ]
            
            description = ''
            for selector in desc_selectors:
                el = card.select_one(selector)
                if el:
                    description = normalize_text(el.get_text())
                    break
            
            # Если не нашли, пробуем найти текст после заголовка
            if not description:
                # Берем весь текст карточки и обрезаем до разумной длины
                all_text = normalize_text(card.get_text())
                if len(all_text) > 50 and len(all_text) < 500:
                    description = all_text[:300]  # Первые 300 символов
            
            # Извлекаем цену (для сверки)
            price_selectors = [
                '.js-product-price',
                '.t-store__card__price',
                '.product-price',
                '.price'
            ]
            
            price = ''
            for selector in price_selectors:
                el = card.select_one(selector)
                if el:
                    price = normalize_text(el.get_text())
                    break
            
            if title:  # Добавляем только если есть название
                products.append({
                    'title': title,
                    'description': description or '',
                    'price': price or '',
                    'category': 'unknown'  # Определим позже при объединении
                })
                
                # Показываем прогресс (каждый 10-й или первые 5)
                if i <= 5 or i % 10 == 0:
                    print(f"  [{i:3d}] {title[:50]}{'...' if len(title) > 50 else ''}")
                    if description:
                        print(f"       📝 {description[:80]}{'...' if len(description) > 80 else ''}")
        
        except Exception as e:
            print(f"⚠️  Ошибка обработки карточки {i}: {e}")
            continue
    
    return products

def save_results(products):
    """Сохраняет результат в JSON"""
    print(f"\n💾 Сохранение {len(products)} товаров в {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    
    file_size = len(json.dumps(products, ensure_ascii=False)) / 1024
    print(f"✅ Размер файла: {file_size:.2f} KB")
    
    # Статистика
    with_desc = sum(1 for p in products if p['description'])
    print(f"\n📊 Статистика:")
    print(f"   Всего товаров: {len(products)}")
    print(f"   С описаниями: {with_desc} ({with_desc/len(products)*100:.1f}%)")
    print(f"   Без описаний: {len(products) - with_desc}")

def main():
    """Основная функция"""
    print("=" * 70)
    print("🤖 Авто-сборщик описаний товаров")
    print("🌐 Сайт: https://pizzanapolirsc.ru")
    print("=" * 70)
    print()
    
    start_time = time.time()
    
    # Сбор данных
    products = scrape_products()
    
    if not products:
        print("\n❌ Не удалось собрать товары!")
        print("\nВозможные причины:")
        print("   1. Сайт недоступен")
        print("   2. Tilda заблокировала запрос")
        print("   3. Изменилась структура HTML")
        print("\n💡 Попробуйте вручную открыть сайт и запустить еще раз")
        return
    
    # Сохранение
    save_results(products)
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  Время выполнения: {elapsed:.1f} секунд")
    
    print("\n" + "=" * 70)
    print("✅ ГОТОВО!")
    print("=" * 70)
    print(f"\n📁 Файл сохранен: {OUTPUT_FILE}")
    print("\n📝 Следующий шаг:")
    print("   Запустите: node merge-descriptions.js")
    print("   Это объединит описания с menu-final.json")
    print()

if __name__ == '__main__':
    main()
