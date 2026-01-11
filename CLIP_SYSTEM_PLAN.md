# Klip Önizleme ve Düzenleme Sistemi - Uygulama Planı

## Hedefler
1. ✅ Klip oluşturma sürecini göster
2. ✅ Oluşturulan klipleri önizle
3. ✅ Klipleri düzenle (altyazı, trim, vb.)
4. ✅ Seçilen klipleri işle

## Yeni State'ler
```typescript
const [processedClips, setProcessedClips] = useState<ProcessedClip[]>([])
const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null)
const [isGeneratingClips, setIsGeneratingClips] = useState(false)

interface ProcessedClip {
  id: string
  videoPath: string
  subtitledPath?: string
  thumbnail?: string
  start: number
  end: number
  duration: number
  hasSubtitles: boolean
}
```

## UI Yapısı

### Step 2 - Klip İşleme
```
┌─────────────────────────────────────────┐
│  İşlem Durumu (Processing Status)       │
│  ┌─────────────────────────────────┐   │
│  │ 1/3 Klip oluşturuluyor...       │   │
│  │ ████████░░░░░░░░░░░░ 40%        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌──────────────────┬──────────────────────┐
│  Klip Önizleme   │   Klip Listesi       │
│  ┌────────────┐  │  ┌──────────────┐    │
│  │   Video    │  │  │ Klip 1  ✓    │    │
│  │  Player    │  │  │ Klip 2  ⏳   │    │
│  └────────────┘  │  │ Klip 3  ⏳   │    │
│                  │  └──────────────┘    │
│  [Altyazı Ekle]  │                      │
│  [Trim]          │  [Tümünü İşle]       │
└──────────────────┴──────────────────────┘
```

## Akış
1. User "Upload & Process" tıklar
2. Step 2'ye geçer
3. Klip oluşturma başlar (progress gösterilir)
4. Her klip oluştukça listeye eklenir
5. User klipleri önizleyebilir
6. User altyazı ekle/düzenle yapabilir
7. "Export All" ile tüm klipleri indirir
