# 🚀 FITSA 배포 가이드

## 목차
1. [배포 아키텍처](#배포-아키텍처)
2. [초기 설정 (1회만)](#초기-설정-1회만)
3. [배포 방법](#배포-방법)
4. [환경변수 설정](#환경변수-설정)
5. [트러블슈팅](#트러블슈팅)
6. [성능 최적화](#성능-최적화)

---

## 배포 아키텍처

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Replit    │──────▶│   GitHub    │──────▶│   Render    │
│  (개발환경)  │  push │ (저장소)     │ auto  │ (프로덕션)   │
└─────────────┘       └─────────────┘       └─────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │  사용자     │
                                            │ (웹/모바일) │
                                            └─────────────┘
```

### 기술 스택
- **백엔드**: Python 3.11 + Flask + Gunicorn
- **AI**: Gemini 2.5 Flash (Google), Replicate (IDM-VTON)
- **결제**: Stripe Checkout
- **저장소**: Google Cloud Storage (Replit Object Storage)
- **배포**: Render (Singapore, Free Tier)
- **Git**: GitHub (자동 배포 트리거)

---

## 초기 설정 (1회만)

### 1️⃣ GitHub 저장소 생성

1. https://github.com 로그인
2. New Repository 클릭
3. 저장소 이름: `fitsa-app` (또는 원하는 이름)
4. Public/Private 선택
5. **Create Repository** 클릭
6. 생성된 저장소 URL 복사 (예: `https://github.com/YOUR_USERNAME/fitsa-app.git`)

### 2️⃣ Replit에서 Git 초기화

```bash
# Git 사용자 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Git 초기화 및 원격 연결
git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fitsa-app.git

# 초기 커밋 및 푸시
git add .
git commit -m "chore: initial deployment setup"
git push -u origin main
```

### 3️⃣ Render 계정 생성 및 서비스 연결

1. **Render 회원가입**: https://render.com → Sign Up (GitHub 계정으로 가입 권장)

2. **새 웹 서비스 생성**:
   - Dashboard → **New +** → **Web Service**
   - **Build and deploy from a Git repository** 선택
   - GitHub 계정 연결 (최초 1회)
   - 저장소 선택: `fitsa-app`
   - **Connect** 클릭

3. **서비스 설정**:
   ```
   Name: fitsa-web
   Region: Singapore (한국과 가장 가까움)
   Branch: main
   Runtime: Python
   Build Command: pip install --upgrade pip && pip install -r requirements-prod.txt
   Start Command: gunicorn --workers 2 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT app:app
   Plan: Free
   ```

4. **Environment Variables 설정** (아래 [환경변수 설정](#환경변수-설정) 참조)

5. **Create Web Service** 클릭

6. **첫 배포 완료 대기** (3-5분 소요)

7. **배포 URL 확인**: 
   - 예: `https://fitsa-web.onrender.com`
   - 이 URL을 Stripe Webhook, OAuth Redirect 등에 등록

---

## 배포 방법

### 방법 1: 자동 배포 스크립트 (권장 ⭐)

```bash
./deploy.sh
```

스크립트가 자동으로:
- ✅ Git 사용자 확인
- ✅ 변경사항 감지
- ✅ 커밋 메시지 입력 받음
- ✅ GitHub에 푸시
- ✅ Render 자동 배포 트리거

### 방법 2: 수동 배포

```bash
# 1. 변경사항 확인
git status

# 2. 커밋
git add .
git commit -m "feat: add new feature"

# 3. GitHub에 푸시 (자동으로 Render 배포 트리거됨)
git push origin main
```

### 배포 확인

1. **Render 대시보드**: https://dashboard.render.com
2. **Services** → **fitsa-web**
3. **Builds** 탭에서 배포 진행 상황 확인
4. **Logs** 탭에서 실시간 로그 확인

배포 성공 시:
```
==> Build successful 🎉
==> Deploying...
==> Your service is live 🎉
    https://fitsa-web.onrender.com
```

---

## 환경변수 설정

Render 대시보드 → **Environment** 탭에서 설정:

### 필수 환경변수

| 키 | 설명 | 예시 값 | 가져오는 곳 |
|---|---|---|---|
| `GEMINI_API_KEY` | Gemini AI API 키 | `AIza...` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `REPLICATE_API_TOKEN` | Replicate API 토큰 | `r8_...` | [Replicate Account](https://replicate.com/account/api-tokens) |
| `STRIPE_SECRET_KEY` | Stripe Secret Key | `sk_live_...` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe Public Key | `pk_live_...` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `SESSION_SECRET` | Flask 세션 시크릿 | `랜덤 64자 문자열` | `python -c "import secrets; print(secrets.token_hex(32))"` |

### 선택 환경변수

| 키 | 설명 | 기본값 |
|---|---|---|
| `PORT` | 서버 포트 | `10000` (Render 자동 설정) |
| `FLASK_ENV` | Flask 환경 | `production` |
| `CORS_ORIGINS` | CORS 허용 도메인 | `*` (모든 도메인) |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | GCS 버킷 ID | (Replit 환경변수 참조) |
| `DATABASE_URL` | PostgreSQL URL | (선택, Render PostgreSQL 사용 시) |

### 환경변수 설정 방법

```bash
# Render Dashboard
Environment 탭 → Add Environment Variable

Key: GEMINI_API_KEY
Value: AIzaSyC...
[Add]

Key: STRIPE_SECRET_KEY
Value: sk_live_...
[Add]

# ... 반복
```

**⚠️ 중요**: 환경변수 변경 시 자동으로 재배포됩니다!

---

## 트러블슈팅

### 1. 배포 실패: "Build failed"

**증상**: Render Builds 탭에서 빨간색 "Failed"

**해결 방법**:
```bash
# 로그 확인
Render → Logs 탭 → 에러 메시지 확인

# 일반적인 원인:
# 1) requirements-prod.txt에 패키지 오타
# 2) Python 버전 불일치
# 3) 환경변수 누락
```

### 2. 500 Internal Server Error

**증상**: 앱 접속 시 500 에러

**해결 방법**:
```bash
# 1. 헬스체크 확인
curl https://fitsa-web.onrender.com/healthz

# 2. Render 로그 확인
Render → Logs → Runtime Logs

# 3. 환경변수 확인
Render → Environment → 필수 변수 모두 설정되었는지 확인
```

### 3. AI 피팅 실패

**증상**: "AI generation failed" 에러

**해결 방법**:
```bash
# 1. API 키 확인
GEMINI_API_KEY가 올바르게 설정되었는지 확인

# 2. API 할당량 확인
Google AI Studio → Quotas

# 3. 로그 확인
Render → Logs → "GEMINI" 검색
```

### 4. Stripe 결제 실패

**증상**: 결제 페이지 로드 안 됨

**해결 방법**:
```bash
# 1. Stripe 키 확인
STRIPE_SECRET_KEY (sk_live_...) 설정 확인
VITE_STRIPE_PUBLIC_KEY (pk_live_...) 설정 확인

# 2. Stripe Webhook 설정
Stripe Dashboard → Webhooks
Endpoint URL: https://fitsa-web.onrender.com/stripe/webhook
```

### 5. Cold Start 지연 (Free Tier)

**증상**: 첫 요청이 15초 이상 걸림

**원인**: Render Free Tier는 15분 비활성 시 인스턴스가 sleep 모드로 전환

**해결 방법**:
1. **유료 플랜 업그레이드** ($7/월, Starter 플랜)
2. **Ping 서비스 사용**: https://uptimerobot.com (5분마다 헬스체크)
3. **사용자에게 안내**: "첫 로딩이 조금 걸릴 수 있습니다"

---

## 성능 최적화

### 1. Gunicorn Workers 조정

```yaml
# render.yaml
startCommand: gunicorn --workers 4 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT app:app
```

**권장 설정**:
- Free Tier: `--workers 2 --threads 4` (현재 설정)
- Starter: `--workers 4 --threads 4`
- Standard: `--workers 8 --threads 4`

### 2. 이미지 최적화

```python
# services/gemini_virtual_fitting_service.py
# 이미지 압축 품질 조정 (현재 85%)
```

### 3. 캐싱 전략

```python
# 정적 파일 캐싱 (현재 no-cache)
# 프로덕션에서는 CDN 사용 권장 (Cloudflare)
```

### 4. Database 최적화

```bash
# SQLite → PostgreSQL 마이그레이션 권장
Render → New + → PostgreSQL
DATABASE_URL 환경변수 자동 설정됨
```

### 5. 모니터링

```bash
# 헬스체크 자동화
curl https://fitsa-web.onrender.com/healthz

# Response:
{
  "status": "ok",
  "service": "fitsa-web",
  "timestamp": "2025-01-22T12:34:56Z"
}
```

---

## 체크리스트

### 배포 전
- [ ] 모든 환경변수가 Render에 설정되었는가?
- [ ] Stripe Live 키로 변경했는가? (테스트 키 아님!)
- [ ] GitHub에 민감한 정보(.env)가 커밋되지 않았는가?
- [ ] 로컬에서 테스트 완료했는가?

### 배포 후
- [ ] 헬스체크 확인: `/healthz` 엔드포인트 200 응답
- [ ] AI 피팅 테스트: 실제 사진으로 피팅 시도
- [ ] 결제 테스트: Stripe 결제 플로우 확인
- [ ] 모바일 테스트: 실제 폰에서 접속 확인
- [ ] Render 로그 확인: 에러 없는지 확인

---

## 긴급 롤백

배포 후 문제 발생 시:

```bash
# 방법 1: Render에서 이전 버전으로 롤백
Render → Builds → 이전 성공한 빌드 → "Rollback to this version"

# 방법 2: Git에서 이전 커밋으로 되돌리기
git revert HEAD
git push origin main
```

---

## 지원

문제 발생 시:
1. **Render 로그** 확인
2. **GitHub Issues** 생성
3. **replit.md** 참조

**프로덕션 URL**: https://fitsa-web.onrender.com (배포 후 업데이트)

---

마지막 업데이트: 2025-01-22
