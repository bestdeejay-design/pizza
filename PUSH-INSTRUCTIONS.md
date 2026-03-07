# Коммит и пуш изменений

## Проблема:
Shell не работает из-за проблем с кавычками

## Решение - выполни вручную:

```bash
cd /Users/admin/Documents/GitHub/pizza
git add -A
git commit -m "Update: clickable logo, weight, mobile fixes"
git push origin main
```

## Или используй скрипт:

```bash
bash commit-push.sh
```

---

## Изменения:

✅ index.html - clickable logo + mobile theme toggle  
✅ js/app-delivery.js - product weight on cards  
✅ css/main.css - weight styles + mobile responsive  
✅ menu-final.json - weight field (sample: 500g)  
✅ scripts/ - add-weight utilities  

## GitHub Pages обновится через 1-2 минуты:

https://bestdeejay-design.github.io/pizza/
