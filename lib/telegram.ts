const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function sendTelegramNotification(message: string) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('Telegram credentials not set')
        return
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
        const body = {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            console.error('Failed to send Telegram notification:', await res.text())
        }
    } catch (error) {
        console.error('Telegram notification error:', error)
    }
}

export function formatError(source: string, error: any, context?: any) {
    const time = new Date().toLocaleString('tr-TR')
    const errorMessage = error instanceof Error ? error.message : String(error)

    let msg = `🚨 <b>HATA BİLDİRİMİ</b>\n`
    msg += `<b>Kaynak:</b> ${source}\n`
    msg += `<b>Zaman:</b> ${time}\n`
    msg += `<b>Hata:</b> <pre>${errorMessage}</pre>\n`

    if (context) {
        msg += `<b>Detay:</b> <pre>${JSON.stringify(context, null, 2)}</pre>`
    }

    return msg
}
