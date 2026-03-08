/**
 * Data Merger
 * Объединяет данные из разных источников и обновляет menu-final.json
 */

const fs = require('fs');
const path = require('path');

const PATHS = {
    menuFinal: path.join(__dirname, '..', 'menu-final.json'),
    yandexData: path.join(__dirname, 'yandex-data.json'),
    modalData: path.join(__dirname, 'modal-data.json'),
    output: path.join(__dirname, '..', 'menu-final-updated.json')
};

function normalizeTitle(title) {
    // Нормализация названия для сравнения
    return title
        .toLowerCase()
        .replace(/[^\w\sа-яё]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function mergeData() {
    console.log('🚀 Data Merger запущен...\n');
    
    // Читаем все файлы
    console.log('📖 Чтение файлов...');
    const menuData = JSON.parse(fs.readFileSync(PATHS.menuFinal, 'utf8'));
    
    let yandexData = [];
    if (fs.existsSync(PATHS.yandexData)) {
        yandexData = JSON.parse(fs.readFileSync(PATHS.yandexData, 'utf8'));
        console.log(`   ✅ Yandex Eda: ${yandexData.length} товаров`);
    } else {
        console.log('   ⚠️ yandex-data.json не найден');
    }
    
    let modalData = [];
    if (fs.existsSync(PATHS.modalData)) {
        modalData = JSON.parse(fs.readFileSync(PATHS.modalData, 'utf8'));
        console.log(`   ✅ Modal data: ${modalData.length} товаров`);
    } else {
        console.log('   ⚠️ modal-data.json не найден');
    }
    
    // Создаем мапы для быстрого поиска
    const yandexMap = new Map();
    yandexData.forEach(item => {
        const key = normalizeTitle(item.title);
        yandexMap.set(key, item);
    });
    
    const modalMap = new Map();
    modalData.forEach(item => {
        const key = normalizeTitle(item.title);
        modalMap.set(key, item);
    });
    
    console.log(`\n🔍 Объединение данных...\n`);
    
    let updatedCount = 0;
    let weightAdded = 0;
    let descriptionUpdated = 0;
    
    // Проходим по всем категориям
    Object.keys(menuData.menu).forEach(categoryKey => {
        const items = menuData.menu[categoryKey];
        
        items.forEach(item => {
            const normalizedTitle = normalizeTitle(item.title);
            
            // Ищем данные из Яндекса
            const yandexItem = yandexMap.get(normalizedTitle);
            
            // Ищем данные из модалок
            const modalItem = modalMap.get(normalizedTitle);
            
            let updated = false;
            
            // Добавляем/обновляем вес из Яндекса
            if (yandexItem?.weight && (!item.weight || item.weight !== yandexItem.weight)) {
                item.weight = yandexItem.weight;
                weightAdded++;
                updated = true;
            }
            
            // Обновляем описание из модалки (приоритет) или Яндекса
            if (modalItem?.fullDescription) {
                item.description = modalItem.fullDescription;
                descriptionUpdated++;
                updated = true;
            } else if (yandexItem?.description && (!item.description || item.description !== yandexItem.description)) {
                item.description = yandexItem.description;
                descriptionUpdated++;
                updated = true;
            }
            
            if (updated) {
                updatedCount++;
            }
        });
    });
    
    console.log('\n📊 Статистика обновлений:');
    console.log(`   Обновлено товаров: ${updatedCount}`);
    console.log(`   Добавлено весов: ${weightAdded}`);
    console.log(`   Обновлено описаний: ${descriptionUpdated}\n`);
    
    // Сохраняем результат
    console.log(`💾 Сохранение в ${PATHS.output}...`);
    fs.writeFileSync(PATHS.output, JSON.stringify(menuData, null, 2));
    console.log('✅ Готово!\n');
    
    console.log('📋 Следующие шаги:');
    console.log('   1. Проверьте menu-final-updated.json');
    console.log('   2. Если всё верно, замените menu-final.json');
    console.log('   3. Закоммитьте изменения\n');
}

// Запуск
try {
    mergeData();
    process.exit(0);
} catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
}
