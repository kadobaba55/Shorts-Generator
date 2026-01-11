FROM node:18-bullseye

# 1. Sistem Bağımlılıklarını Yükle (FFmpeg & Python)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2. Python Kütüphanelerini Yükle (Whisper & YT-DLP)
# CPU optimize PyTorch (Sunucu maliyetini düşük tutmak için)
RUN pip3 install --no-cache-dir torch --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip3 install --no-cache-dir openai-whisper yt-dlp Pillow

# 3. Çalışma Dizinini Ayarla
WORKDIR /app

# 4. Node.js Bağımlılıklarını Yükle
COPY package*.json ./
RUN npm ci

# 5. Kaynak Kodları Kopyala
COPY . .

# 6. Prisma Client Generate (MUST run before build)
RUN npx prisma generate

# 7. Next.js Uygulamasını Derle
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# 7. Portu Aç ve Başlat
EXPOSE 3000
CMD ["npm", "start"]
