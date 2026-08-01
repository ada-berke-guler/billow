# Billow

Abonelik ve harcama takibi için sade bir web uygulaması.

**Demo:** [billow-nu.vercel.app](https://billow-nu.vercel.app)

## Features

- **Abonelikler** — ödeme günü, sıklık, renk; takvim ve yan liste
- **Harcamalar** — kategori, tarih, not; haftalık / yıllık özet
- **Yıllık özet** — aylık kırılım ve toplamlar
- **İptal** — abonelik iptalinde geçmiş aylar özette kalır
- **Değişken tutar** — elektrik vb. için ay ay tutar girme
- **Tema** — gündüz / gece
- **Yedek** — JSON dışa / içe aktarma
- **PWA** — ana ekrana ekleme, offline açılış
- Veriler **tarayıcıda** (`localStorage`); hesap yok

## Run locally

```bash
npx serve .
```

Open `http://localhost:3000` (do not open via `file://`).

## Stack

Vanilla HTML, CSS, JavaScript (ES modules). Hosted on Vercel.
