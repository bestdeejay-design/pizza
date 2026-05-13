addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const TOKEN = 'REDACTED_MAX_TOKEN';
const CHAT_ID = '-REDACTED_CHAT_ID';

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  try {
    const body = await request.json()
    
    const response = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        'Authorization': TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: parseInt(CHAT_ID),
        text: formatMessage(body),
        format: 'html'
      })
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function formatMessage(data) {
  const items = data.items || []
  const total = items.reduce((s, i) => s + (i.price * i.quantity), 0)
  
  let text = `<b>🍕 ЗАКАЗ Pizza Napoli!</b>\n\n`
  text += `📍 Источник: ${data.source || '-'}\n`
  text += `🪑 Место: ${data.tableNumber}\n`
  text += `📱 Телефон: ${data.comment || ''}\n\n`
  
  text += `<b>🛒 Состав:</b>\n`
  items.forEach(item => {
    const price = item.price === 0 ? '🎁' : item.price + ' ₽'
    text += `• ${item.title} × ${item.quantity} — ${price}\n`
  })
  
  text += `\n<b>💰 Итого: ${total} ₽</b>`
  if (data.deliveryFee > 0) text += ` + доставка ${data.deliveryFee} ₽`
  if (data.gift) text += `\n🎁 Подарок: ${data.gift}`
  
  return text
}