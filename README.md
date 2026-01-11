# 🎬 YouTube Shorts Generator

YouTube videolarını TikTok & YouTube Shorts formatına (9:16) dönüştüren web uygulaması.

## ✨ Özellikler

- 📥 YouTube URL'den video indirme
- ✂️ Manuel klip seçimi
- 📱 9:16 dikey format dönüşümü (1080x1920)
- 💬 Otomatik altyazı ekleme (Whisper AI)
- 🎨 Modern, karanlık tema arayüz

## 🚀 Kurulum

### Gereksinimler

1. **Node.js 18+** - [nodejs.org](https://nodejs.org/)
2. **FFmpeg** - [ffmpeg.org](https://ffmpeg.org/download.html)
3. **Python 3.8+** - [python.org](https://www.python.org/)
4. **yt-dlp** - YouTube indirme için
5. **Whisper** - Altyazı için

### Adım Adım Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. yt-dlp kur
pip install yt-dlp

# 3. Whisper kur (altyazı için)
pip install openai-whisper

# 4. Uygulamayı başlat
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılacak.

## 📖 Kullanım

1. YouTube URL'sini yapıştır
2. "Video İndir" butonuna tıkla
3. Video oynatıcıda klipler seç
4. "Shorts Oluştur" butonuna tıkla
5. Oluşturulan videoları indir

## 🛠️ Teknolojiler

- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **yt-dlp** - YouTube indirme
- **FFmpeg** - Video işleme
- **OpenAI Whisper** - Konuşma tanıma

## 📝 Lisans

MIT
