# Geliştirilmiş Altyazı Sistemi

## Yeni Özellikler

### 1. Model Seçimi (Hız Optimizasyonu)
Whisper model seçenekleri:
- `tiny` - En hızlı, düşük doğruluk
- `base` - Hızlı, orta doğruluk  
- `small` - **Varsayılan**, iyi denge
- `medium` - Yavaş, yüksek doğruluk

**Kullanım:**
```typescript
{
  model: 'tiny' // Hızlı işleme için
}
```

### 2. Otomatik Emoji Ekleme
Bağlama göre otomatik emoji ekler:
- harika → harika 🎉
- para → para 💰
- önemli → önemli ⚠️
- hızlı → hızlı 🚀

**Desteklenen Kelimeler:**
harika, güzel, mükemmel, iyi, kötü, üzgün, mutlu, sevgi, para, başarı, hedef, güç, fikir, önemli, dikkat, hızlı, yemek, kahve, ev, araba, telefon, bilgisayar, müzik, video

**Kullanım:**
```typescript
{
  addEmojis: true
}
```

### 3. Anahtar Kelime Vurgulama
Önemli kelimeleri BÜYÜK HARFE çevirir:
- önemli → ÖNEMLİ
- dikkat → DİKKAT
- mutlaka → MUTLAKA

**Vurgulanan Kelimeler:**
önemli, dikkat, mutlaka, kesinlikle, asla, her zaman, hiç

**Kullanım:**
```typescript
{
  highlightKeywords: true
}
```

### 4. Manuel Altyazı Düzenleme
Kendi altyazılarınızı oluşturun veya düzenleyin:

**Kullanım:**
```typescript
{
  customSubtitles: [
    { start: 0, end: 2.5, text: "Merhaba dünya!" },
    { start: 2.5, end: 5.0, text: "Bu harika bir video" }
  ]
}
```

### 5. Çoklu Dil Desteği
Desteklenen diller:
- `tr` - Türkçe (varsayılan)
- `en` - İngilizce
- `es` - İspanyolca
- `fr` - Fransızca
- `de` - Almanca
- `it` - İtalyanca
- `pt` - Portekizce
- `ru` - Rusça
- `ja` - Japonca
- `ko` - Korece
- `zh` - Çince
- `ar` - Arapça

**Kullanım:**
```typescript
{
  language: 'en'
}
```

## API Kullanımı

### POST /api/subtitle
Video'ya altyazı ekler.

**Request Body:**
```typescript
{
  videoPath: string,              // Gerekli
  language?: string,              // Varsayılan: 'tr'
  fontSize?: number,              // Varsayılan: 24
  fontColor?: string,             // Varsayılan: 'white'
  style?: 'classic' | 'neon' | 'box', // Varsayılan: 'classic'
  model?: 'tiny' | 'base' | 'small' | 'medium', // Varsayılan: 'small'
  addEmojis?: boolean,            // Varsayılan: false
  highlightKeywords?: boolean,    // Varsayılan: false
  customSubtitles?: Array<{       // Opsiyonel
    start: number,
    end: number,
    text: string
  }>
}
```

**Response:**
```typescript
{
  success: true,
  outputPath: string,
  message: string
}
```

### GET /api/subtitle
Sadece transkripsiyon alır (video'ya yakmadan).

**Query Parameters:**
- `videoPath` - Video yolu (gerekli)
- `language` - Dil kodu (opsiyonel, varsayılan: 'tr')
- `model` - Whisper model (opsiyonel, varsayılan: 'small')

**Response:**
```typescript
{
  success: true,
  transcription: string,
  segments: Array<{
    start: number,
    end: number,
    text: string
  }>
}
```

## Örnek Kullanımlar

### Hızlı İşleme + Emoji
```typescript
const response = await fetch('/api/subtitle', {
  method: 'POST',
  body: JSON.stringify({
    videoPath: '/videos/my-video.mp4',
    model: 'tiny',
    addEmojis: true
  })
})
```

### Vurgulama + Türkçe
```typescript
const response = await fetch('/api/subtitle', {
  method: 'POST',
  body: JSON.stringify({
    videoPath: '/videos/my-video.mp4',
    language: 'tr',
    highlightKeywords: true
  })
})
```

### Manuel Altyazı
```typescript
const response = await fetch('/api/subtitle', {
  method: 'POST',
  body: JSON.stringify({
    videoPath: '/videos/my-video.mp4',
    customSubtitles: [
      { start: 0, end: 3, text: "Harika bir başlangıç! 🎉" },
      { start: 3, end: 6, text: "ÖNEMLİ bilgiler geliyor" }
    ],
    addEmojis: true,
    highlightKeywords: true
  })
})
```

## Performans İpuçları

1. **Hız için:** `model: 'tiny'` kullanın
2. **Kalite için:** `model: 'medium'` kullanın
3. **Denge için:** `model: 'small'` (varsayılan)
4. **Kısa videolar için:** `tiny` veya `base` yeterli
5. **Uzun videolar için:** `small` veya `medium` önerilir
