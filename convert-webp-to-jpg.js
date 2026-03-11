// Конвертация WebP в JPG для совместимости со старыми браузерами
// Запуск: Node.js с установленным sharp
// npm install sharp

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imgDir = './img';
const outputDir = './img-jpg';

// Создаем выходную папку
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Получаем все webp файлы
const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.webp'));

console.log(`Найдено ${files.length} файлов для конвертации...`);

let count = 0;
files.forEach(async (file) => {
    try {
        const inputPath = path.join(imgDir, file);
        const outputPath = path.join(outputDir, file.replace('.webp', '.jpg'));
        
        await sharp(inputPath)
            .jpeg({ quality: 85 })
            .toFile(outputPath);
        
        count++;
        console.log(`[${count}/${files.length}] Конвертирован: ${file}`);
    } catch (error) {
        console.error(`Ошибка конвертации ${file}:`, error.message);
    }
});

console.log(`\n✅ Готово! Конвертировано ${count} файлов.`);
console.log(`Результат в папке: ${outputDir}/`);
