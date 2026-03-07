#!/usr/bin/env python3
"""
🚀 Image Optimization Script for Pizza Napoli
Конвертирует все изображения в WebP с оптимизацией качества

Требования:
    pip install Pillow

Использование:
    python optimize-images.py
"""

import os
import sys
from pathlib import Path
from PIL import Image
import time

# Конфигурация
IMG_DIR = Path('img')
OUTPUT_DIR = Path('img-optimized')
OLD_DIR = Path('img-old')
QUALITY = 85  # Качество WebP (0-100)
MAX_SIZE = 1200  # Максимальный размер по длинной стороне

def create_directories():
    """Создает директории для оптимизированных и старых изображений"""
    OUTPUT_DIR.mkdir(exist_ok=True)
    OLD_DIR.mkdir(exist_ok=True)
    print(f"✅ Созданы директории: {OUTPUT_DIR}, {OLD_DIR}")

def get_image_files():
    """Получает список всех изображений"""
    extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    files = [f for f in IMG_DIR.iterdir() if f.suffix.lower() in extensions]
    return sorted(files)

def optimize_image(input_path, output_path):
    """
    Оптимизирует изображение
    
    Args:
        input_path: Путь к исходному файлу
        output_path: Путь для сохранения
    
    Returns:
        tuple: (original_size, optimized_size, success)
    """
    try:
        original_size = input_path.stat().st_size
        
        with Image.open(input_path) as img:
            # Конвертируем в RGB если нужно (для PNG с прозрачностью)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Создаем белый фон для прозрачных областей
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resizing если слишком большое
            max_dimension = MAX_SIZE
            if max(img.size) > max_dimension:
                ratio = max_dimension / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Сохраняем в WebP
            img.save(
                output_path,
                'WEBP',
                quality=QUALITY,
                method=6  # Максимальное сжатие
            )
        
        optimized_size = output_path.stat().st_size
        return (original_size, optimized_size, True)
    
    except Exception as e:
        print(f"❌ Ошибка обработки {input_path.name}: {e}")
        return (0, 0, False)

def move_original_to_old(input_path):
    """Перемещает оригинал в папку img-old"""
    try:
        dest = OLD_DIR / input_path.name
        # Копируем вместо перемещения (безопаснее)
        import shutil
        shutil.copy2(input_path, dest)
        return True
    except Exception as e:
        print(f"⚠️ Не удалось скопировать {input_path.name}: {e}")
        return False

def format_size(size_bytes):
    """Форматирует размер в человекочитаемый вид"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"

def main():
    """Основная функция"""
    print("=" * 70)
    print("🚀 Оптимизация изображений Pizza Napoli")
    print("=" * 70)
    print(f"\n📂 Исходная директория: {IMG_DIR.absolute()}")
    print(f"📦 Выходная директория: {OUTPUT_DIR.absolute()}")
    print(f"📁 Старые файлы будут в: {OLD_DIR.absolute()}")
    print(f"⚙️  Качество WebP: {QUALITY}")
    print(f"⚙️  Максимальный размер: {MAX_SIZE}px")
    print()
    
    # Создаем директории
    create_directories()
    
    # Получаем список файлов
    image_files = get_image_files()
    total_files = len(image_files)
    
    print(f"📊 Найдено изображений: {total_files}")
    print()
    
    if total_files == 0:
        print("❌ Изображения не найдены!")
        return
    
    # Статистика
    total_original = 0
    total_optimized = 0
    success_count = 0
    error_count = 0
    
    start_time = time.time()
    
    # Обрабатываем каждое изображение
    for i, img_path in enumerate(image_files, 1):
        print(f"[{i:3d}/{total_files}] Обработка {img_path.name}...", end=" ")
        
        # Оптимизием
        output_path = OUTPUT_DIR / f"{img_path.stem}.webp"
        orig_size, opt_size, success = optimize_image(img_path, output_path)
        
        if success:
            total_original += orig_size
            total_optimized += opt_size
            success_count += 1
            
            # Считаем процент экономии
            savings = ((orig_size - opt_size) / orig_size * 100) if orig_size > 0 else 0
            
            print(f"✅ {format_size(orig_size)} → {format_size(opt_size)} ({savings:.1f}% экономии)")
            
            # Копируем оригинал в img-old
            move_original_to_old(img_path)
        else:
            error_count += 1
            print("❌ ОШИБКА")
        
        # Прогресс бар каждые 10%
        if i % max(1, total_files // 10) == 0:
            progress = i / total_files * 100
            elapsed = time.time() - start_time
            eta = (elapsed / i * (total_files - i)) if i > 0 else 0
            print(f"   ⏳ Прогресс: {progress:.1f}% | Прошло: {elapsed:.1f}с | ETA: {eta:.1f}с")
    
    # Финальная статистика
    end_time = time.time()
    total_time = end_time - start_time
    
    print()
    print("=" * 70)
    print("📊 РЕЗУЛЬТАТЫ")
    print("=" * 70)
    print(f"⏱️  Время выполнения: {total_time:.1f} секунд ({total_time/60:.1f} минут)")
    print(f"✅ Успешно обработано: {success_count} из {total_files}")
    print(f"❌ Ошибок: {error_count}")
    print()
    print(f"📦 Исходный размер: {format_size(total_original)}")
    print(f"📦 Оптимизированный размер: {format_size(total_optimized)}")
    
    if total_original > 0:
        total_savings = total_original - total_optimized
        savings_percent = (total_savings / total_original * 100)
        print(f"💾 Экономия: {format_size(total_savings)} ({savings_percent:.1f}%)")
        print(f"📈 Коэффициент сжатия: {total_original/total_optimized:.2f}x" if total_optimized > 0 else "")
    
    print()
    print("📁 Расположение файлов:")
    print(f"   ✅ Оптимизированные: {OUTPUT_DIR.absolute()}/")
    print(f"   📦 Оригиналы: {OLD_DIR.absolute()}/")
    print()
    
    # Рекомендации
    print("=" * 70)
    print("💡 РЕКОМЕНДАЦИИ")
    print("=" * 70)
    print("1. Проверьте качество изображений в папке img-optimized/")
    print("2. Если качество устраивает, замените img на img-optimized")
    print("3. Оригиналы сохранены в img-old/ (можно удалить после проверки)")
    print()
    print("Команды для замены:")
    print(f"   rm -rf img/")
    print(f"   mv img-optimized/ img/")
    print(f"   # Оригиналы останутся в img-old/")
    print()
    print("✅ Готово!")

if __name__ == '__main__':
    main()
