# Eduhistory — serverga deploy va CI/CD

Domen: **eduhistory.uz**  
Server: **157.245.231.33**

---

## 1. Serverda birinchi marta sozlash

### 1.1 Serverga kirish

```bash
ssh root@157.245.231.33
```

### 1.2 Docker va Docker Compose o‘rnatish

```bash
apt update && apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 1.3 Git va Nginx o‘rnatish

```bash
apt install -y git nginx certbot python3-certbot-nginx
```

### 1.4 Loyiha papkasini yaratish va reponi clone qilish

**Agar repo tarkibida `eduhistory-app` papkasi bo‘lsa** (masalan: `Eduhistory` repo):

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git eduhistory
cd eduhistory/eduhistory-app
```

**Agar repo o‘zi loyiha bo‘lsa** (faqat `eduhistory-app`):

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git eduhistory
cd eduhistory
```

### 1.5 Production `.env` yaratish

```bash
nano .env
```

Quyidagilarni to‘ldiring (parollarni o‘zgartiring):

```env
NODE_ENV=production
APP_URL=https://eduhistory.uz
NEXTAUTH_URL=https://eduhistory.uz
NEXTAUTH_SECRET=your_very_long_random_secret_here

POSTGRES_DB=eduhistory
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong_postgres_password_here

# Ixtiyoriy: Google login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Upload (local yoki S3)
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=./public/uploads

MAX_UPLOAD_MB=50
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
```

Saqlang: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 1.6 Domen va SSL (Nginx)

Domen **eduhistory.uz** ni server IP **157.245.231.33** ga yo‘naltiring (A yozuv). Keyin:

**Birinchi marta** faqat HTTP (80-port) config ishlatiladi — SSL fayllari hali yo‘q. Certbot keyin SSL qo‘shadi.

```bash
# Nginx configni nusxalang (loyiha /var/www/Eduhistory da bo‘lsa)
cp /var/www/Eduhistory/nginx/eduhistory.uz.conf /etc/nginx/sites-available/eduhistory.uz
ln -sf /etc/nginx/sites-available/eduhistory.uz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

So‘ng **certbot** orqali SSL oling (domen serverga yo‘naltirilgan bo‘lishi kerak):

```bash
certbot --nginx -d eduhistory.uz -d www.eduhistory.uz
```

Certbot configni o‘zi o‘zgartirib, HTTPS qo‘shadi. Qayta reload kerak bo‘lmasa ham certbot nginx ni reload qiladi.


### 1.7 Birinchi marta Docker orqali ishga tushirish

```bash
cd /var/www/Eduhistory/eduhistory-app   # yoki /var/www/Eduhistory agar repo o‘zi loyiha bo‘lsa
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

Tekshirish:

```bash
docker compose -f docker-compose.prod.yml ps
curl -I http://127.0.0.1:3000
```

Brauzerda **https://eduhistory.uz** ochilishi kerak.

---

## 2. GitHub CI/CD sozlash

Har safar `main` (yoki `master`) branch ga push qilganda avtomatik deploy bo‘lishi uchun GitHub Actions ishlatiladi.

### 2.1 GitHub Actions uchun SSH kalit (majburiy)

GitHub Actions **serverga** SSH orqali ulanadi. Buning uchun bitta kalit juftligi kerak:

- **Private key** → GitHub repo **Secrets** da saqlanadi (`SSH_PRIVATE_KEY`).
- **Public key** → serverda `~/.ssh/authorized_keys` ichida bo‘lishi kerak (ulangan foydalanuvchi uchun).

**Qadam 1 — Kalit yaratish (lokal mashinangizda yoki serverda):**

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/eduhistory_deploy -N ""
```

`-N ""` — passphrase bo‘sh (avtomat deploy uchun qulay). Chiqqan fayllar: `eduhistory_deploy` (private), `eduhistory_deploy.pub` (public).

**Qadam 2 — Public kalitni serverga qo‘shish:**

```bash
# Lokal mashinangizda (public kalitni ko‘rsatish)
cat ~/.ssh/eduhistory_deploy.pub
```

Chiqgan qatorni nusxalang. Keyin serverga kirib:

```bash
ssh root@157.245.231.33
mkdir -p ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Qadam 3 — Private kalitni GitHub Secrets ga qo‘shish:**

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** → nomi: `SSH_PRIVATE_KEY`
3. Qiymat: **to‘liq private key** matni (barcha qatorlar, shu jumladan `-----BEGIN OPENSSH PRIVATE KEY-----` va `-----END OPENSSH PRIVATE KEY-----`).

Nusxalashda bitta qatordan boshqa qatorga o‘tishlar saqlanishi kerak. Mac/Linux da:

```bash
cat ~/.ssh/eduhistory_deploy
```

Chiqganini butunlay nusxalab GitHub’dagi Secret qiymatiga yopishtiring.

**Ixtiyoriy secrets:**

| Secret nomi     | Qiymat |
|-----------------|--------|
| `SERVER_USER`   | SSH foydalanuvchi (agar `root` bo‘lsa, qo‘shish shart emas; default: `root`) |
| `SSH_PORT`      | SSH port (default: `22`) |

### 2.2 Serverda GitHub dan pull qilish uchun SSH kalit

Serverda GitHub’ga kirish uchun alohida SSH kalit yaratib, **public** qismini GitHub’ga Deploy key qilib qo‘shing:

**Serverda:**

```bash
ssh-keygen -t ed25519 -C "deploy@eduhistory" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

Chiqgan matnni nusxalang.

**GitHub’da:** Repo → **Settings** → **Deploy keys** → **Add deploy key** → pastga public key yopishtiring, "Allow write access" kerak emas.

**Repo’ni SSH orqali clone qilish** (birinchi sozlashda):

```bash
cd /var/www
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git eduhistory
```

Yoki HTTPS bo‘lsa, serverda `git pull` ishlashi uchun Personal Access Token (PAT) ishlatishingiz mumkin:

```bash
git remote set-url origin https://TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git
```

### 2.3 Workflow faylida papka nomi

- Repo tarkibida **`eduhistory-app`** papkasi bo‘lsa: `.github/workflows/deploy.yml` ichida `APP_SUBDIR: eduhistory-app` qoldiring.
- Repo o‘zi to‘g‘ridan-to‘g‘ri loyiha bo‘lsa: `APP_SUBDIR` ni `.` qiling yoki workflow’da `cd` ni faqat `$DEPLOY_PATH` ga qiling.

`DEPLOY_PATH` serverda loyiha joylashgan papka: odatda `/var/www/Eduhistory`. Agar loyiha boshqa joyda bo‘lsa, workflow’da `DEPLOY_PATH` ni o‘shanga moslashtiring.

---

## 3. Push qilganda nima bo‘ladi

1. `main` (yoki `master`) ga push qilasiz.
2. GitHub Actions ishga tushadi.
3. Serverga SSH orqali ulanish: `cd /var/www/Eduhistory`, `git pull`, keyin `eduhistory-app` (yoki loyiha root) da:
   - `docker compose -f docker-compose.prod.yml build --no-cache`
   - `docker compose -f docker-compose.prod.yml up -d`
4. Prisma migratsiyalar: konteyner ichida `prisma migrate deploy` (yoki entrypoint allaqachon ishlatadi).

Natijada yangi kod serverda ishga tushadi va **https://eduhistory.uz** da yangilanishlar ko‘rinadi.

---

## 4. Deploydan keyin tekshirish

### 4.1 Serverda (SSH orqali)

```bash
ssh root@157.245.231.33
cd /var/www/Eduhistory
docker compose -f docker-compose.prod.yml ps    # konteynerlar ishlayaptimi
curl -sI http://127.0.0.1:3000                  # app javob beryaptimi (200 OK)
```

### 4.2 DNS tarqalmaguncha (domen hali server IP ga yo‘nalmagan bo‘lsa)

- **IP orqali:** brauzerda `http://157.245.231.33` oching. Sayt ochilishi mumkin, lekin NextAuth/login domen uchun sozlangan bo‘lgani uchun to‘liq ishlamasligi mumkin.
- **Domenni tez tekshirish — hosts fayli:**  
  Lokal kompyuteringizda domenni qo‘lda server IP ga yo‘naltirib, brauzerda **https://eduhistory.uz** ni ochishingiz mumkin:

  **Mac/Linux:**  
  `sudo nano /etc/hosts` — qator qo‘shing:  
  `157.245.231.33 eduhistory.uz www.eduhistory.uz`  
  Saqlang. Brauzerda https://eduhistory.uz oching (SSL sertifikat domen uchun bo‘lgani uchun ishlashi kerak). Tekshirib bo‘lgach, bu qatorni o‘chirib qo‘yishingiz mumkin.

  **Windows:**  
  `C:\Windows\System32\drivers\etc\hosts` ni Administrator sifatida oching, xuddi shu qatorni qo‘shing.

DNS 24–48 soat ichida tarqaladi. Tarqalgach, hosts o‘zgartirishini olib tashlasangiz, domen o‘zi serverga yo‘naladi.

### 4.3 Domen tarqalgach

Brauzerda **https://eduhistory.uz** ochib, kirish, kurslar, dashboard sahifalarini tekshiring.

---

## 5. Foydali buyruqlar (serverda)

**Barcha `docker compose` buyruqlarini loyiha papkasida bajarish kerak:** `cd /var/www/Eduhistory`

```bash
cd /var/www/Eduhistory

# Loglarni ko‘rish
docker compose -f docker-compose.prod.yml logs -f app

# Konteynerlarni to‘xtatish
docker compose -f docker-compose.prod.yml down

# Qayta ishga tushirish
docker compose -f docker-compose.prod.yml up -d
```

---

## 6. GitHub Actions: «unable to authenticate» (SSH)

**Xato:** `ssh: handshake failed: ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain`

**Sabab:** GitHub Actions serverga SSH orqali ulana olmayapti — kalit noto‘g‘ri yoki serverda public key yo‘q.

**Nima qilish:**

1. **`SSH_PRIVATE_KEY` secret mavjudmi?**  
   Repo → Settings → Secrets and variables → Actions. `SSH_PRIVATE_KEY` bo‘lishi kerak.

2. **Private key to‘liqmi?**  
   Qiymat `-----BEGIN ... PRIVATE KEY-----` dan `-----END ... PRIVATE KEY-----` gacha bo‘lgan **barcha qatorlar**ni o‘z ichiga olishi kerak. Nusxalashda qatorlar yangilanmasa, kalit ishlamaydi.

3. **Serverda public key bor-yo‘qligini tekshirish:**

   ```bash
   ssh root@157.245.231.33
   cat ~/.ssh/authorized_keys
   ```

   GitHub’da ishlatayotgan **private** kalitga mos **public** kalit shu ro‘yxatda bo‘lishi kerak. Yo‘q bo‘lsa, 2.1 bo‘limidagi kabi yangi kalit yaratib, public qismini `authorized_keys` ga qo‘shing va private qismini `SSH_PRIVATE_KEY` ga qo‘ying.

4. **Lokal tekshirish:**  
   O‘sha private key fayli bilan serverga kirish ishlayotganini tekshiring:

   ```bash
   ssh -i ~/.ssh/eduhistory_deploy root@157.245.231.33
   ```

   Agar bu ishlasa, lekin Actions ishlamasa — GitHub’dagi secret matni fayldan nusxalangan bilan bir xil ekanligini (bo‘sh joylar, qatorlar) tekshiring.

---

## 7. Nginx / SSL xatolik bo‘lsa

**Xato:** `open() "/etc/letsencrypt/options-ssl-nginx.conf" failed`

Sabab: configda SSL (443) bloki bor, lekin certbot hali ishlamagan — bu fayllar yo‘q.

**Yechim:** Avval faqat HTTP (80) ishlaydigan config ishlating. Repodagi `nginx/eduhistory.uz.conf` endi shunday. Serverda yangilang:

```bash
cp /var/www/Eduhistory/nginx/eduhistory.uz.conf /etc/nginx/sites-available/eduhistory.uz
nginx -t && systemctl reload nginx
certbot --nginx -d eduhistory.uz -d www.eduhistory.uz
```

Agar repoda eski config qolgan bo‘lsa, `git pull` qilib keyin yuqoridagi `cp` ni qayta ishlating.

---

## 8. Xavfsizlik

- `.env` ni hech qachon git’ga commit qilmang.
- `NEXTAUTH_SECRET` va `POSTGRES_PASSWORD` ni kuchli va tashlab ketilmasdan saqlang.
- Serverda firewall: faqat 22 (SSH), 80 (HTTP), 443 (HTTPS) ochiq bo‘lsin; 3000 port faqat localhost’da (Nginx orqali).
