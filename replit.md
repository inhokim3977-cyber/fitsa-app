# 입사 (입어보고 사자)

## Overview

"입사"는 AI 기술을 활용한 가상 피팅 앱으로, 사용자가 자신의 사진과 옷 사진을 업로드하면 AI가 자연스럽게 합성된 이미지를 생성합니다. "거울처럼 자연스럽게"라는 비전 아래, 기술보다는 사용자 경험과 결과의 자연스러움에 집중합니다. 핵심 기능은 AI 기반 가상 피팅, 모바일 반응형 디자인, 그리고 신용카드 결제 시스템을 통한 수익화 모델입니다.

## User Preferences

Preferred communication style: Simple, everyday language.

## AI Model Testing Results & Learnings

**이 섹션은 테스트 결과를 누적하여 실수를 반복하지 않고 효율성을 높이기 위한 노하우 저장소입니다.**

### Test History (October 19, 2025)

#### **Current Optimal Configuration** ✅
```
Priority 1: Gemini 2.5 Flash (모든 카테고리)
Priority 2: IDM-VTON (fallback)
```

#### **Test Results Summary (2 Days Testing)**

**1. Gemini 2.5 Flash**
- ✅ **최고 품질**: 손/얼굴/책/물체 완벽 보존
- ✅ **상의 (upper_body)**: 책을 든 손, 물건 완벽 보존
- ✅ **하의 (lower_body)**: 전신 보존, 손은 약간 영향 받을 수 있음
- ✅ **드레스 (dress)**: 청바지 제거 성공! (프롬프트 강화 후)
- ✅ **이미지 비율**: 원본 비율 완벽 유지
- ✅ **자연스러움**: 가장 자연스러운 결과
- **결론**: 2일간 테스트 결과 **전체적으로 가장 완성도 높음**

**2. IDM-VTON (Replicate)**
- ✅ **드레스 (dress)**: 청바지 완전 제거 일관성 높음
- ✅ **일관성**: 안정적인 결과
- ❌ **손/팔 왜곡**: 약간의 artifact 발생 가능
- ⚠️ **하의 (lower_body)**: 이미지 비율 문제 (짧게 crop될 수 있음)
- **결론**: Fallback으로 적합

**3. CatVTON-Flux** (시도했으나 실패)
- ❌ **404 Error**: 모델 사용 불가
- ❌ **카테고리 매핑 불일치**: 'dress' 카테고리 지원 안 함
- **결론**: 사용 불가능

#### **Prompt Engineering Learnings**

**드레스 카테고리 프롬프트 강화 히스토리:**

**시도 1:** "REMOVE all original clothing"
- 결과: ❌ 불일치 (때로 청바지 유지)

**시도 2:** "DELETE", "CRITICAL", "ABSOLUTELY NO" 강조
- 결과: ⚠️ 개선되었으나 여전히 불일치

**시도 3:** ✅ **성공!** (2025-10-19)
- **프롬프트 핵심 요소:**
  - "STEP 1 - COMPLETE CLOTHING REMOVAL (MANDATORY)"
  - "DELETE all original bottom clothing (pants, jeans, skirt, shorts - REMOVE EVERYTHING)"
  - "Person should be NAKED before putting on dress"
  - "CRITICAL: If person wears jeans/pants → COMPLETELY REMOVE THEM"
  - "ABSOLUTELY NO jeans/pants/leggings visible under dress"
  - "FINAL CHECK" 섹션으로 자가 검증
- **테스트 결과:** 
  - ✅ 청바지 완전 제거 성공! 골드 패턴 드레스 자연스럽게 피팅됨
  - ✅ 복잡한 배경(카페) + 책 들고 있는 상의 피팅: 손/책/배경 완벽 보존
  - ✅ 흰 셔츠+청바지 → 검은 드레스: 책/담요/커피컵 모든 소품 완벽 보존
- **결론:** 극강 프롬프트 효과 입증! 현재 버전 계속 사용

**효과적인 프롬프트 패턴 (검증됨):**
- ✅ "CRITICAL:", "DELETE", "ABSOLUTELY NO" 같은 강한 키워드
- ✅ 단계별 지시 (STEP 1, STEP 2, STEP 3, STEP 4)
- ✅ 구체적 의류 명시 (jeans, pants, shirt 등 - 일반 용어 아닌 구체적 단어)
- ✅ FINAL CHECK 섹션으로 AI 자가 검증 유도
- ✅ "MANDATORY", "Person should be NAKED" 같은 극단적 표현

#### **Known Issues & Solutions**

**Issue 1: Gemini 드레스 카테고리 청바지 제거 불일치** → ✅ **해결됨!**
- **증상**: 청바지를 입은 사람에게 드레스를 입힐 때 청바지가 남아있는 경우 발생
- **원인**: Gemini 2.5 Flash가 "완전한 의류 교체" 개념을 일관되게 이해하지 못함
- **시도한 해결책**: 
  - ❌ IDM-VTON 우선 사용 (포기함 - Gemini가 전체적으로 더 좋음)
  - ✅ 프롬프트 극강 버전 (성공!)
- **최종 해결책**: "Person should be NAKED before putting on dress" + FINAL CHECK 추가
- **상태**: ✅ 해결됨 (2025-10-19)

**Issue 2: IDM-VTON 하의 카테고리 비율 문제**
- **증상**: 이미지가 짧게 crop됨
- **해결책**: Gemini를 1순위로 사용하여 회피
- **상태**: 우회 완료

#### **API Migration History**

**2025-10-19: Gemini API 마이그레이션 성공** ✅
- **이전**: `genai.GenerativeModel().generate_content()` 사용 시 AttributeError 발생
- **문제**: `part.as_image()` 메서드 존재하지 않음
- **해결**: 
  ```python
  # 구: part.as_image()
  # 신: part.inline_data.data  (base64 bytes 직접 추출)
  ```
- **새 API**: `google.genai.Client` 기반 아키텍처
- **설정**: `response_modalities=["IMAGE"]` 필수
- **결과**: 안정적으로 작동

#### **Next Steps & Ideas**

**우선순위 1: 품질 개선**
- [ ] 다양한 의류 타입 테스트 (스커트, 반바지, 긴바지 등)
- [ ] 배경 복잡도별 테스트
- [ ] 포즈 다양성 테스트

**우선순위 2: 대안 모델 탐색**
- [ ] Kolors Virtual Try-On (웹 검색 필요)
- [ ] 최신 Replicate 모델 조사
- [ ] Gemini 2.0 Flash Experimental 모델 고려

### Testing Guidelines

**새로운 AI 모델 테스트 시:**
1. **3개 카테고리 모두 테스트** (upper_body, lower_body, dress)
2. **특수 케이스 테스트**:
   - 손/책 들고 있는 상의 피팅
   - 청바지 입은 사람에게 드레스 피팅
   - 복잡한 배경
3. **결과를 이 섹션에 기록**:
   - 모델명, 날짜
   - 카테고리별 성능
   - 장단점
   - 비용/속도
   - 최종 결론

**프롬프트 변경 시:**
1. **변경 전 결과 기록**
2. **변경 내용 명시**
3. **변경 후 결과 비교**
4. **효과 여부 판단 및 기록**

## System Architecture

### Frontend Architecture

The frontend uses static HTML/CSS/JavaScript with Tailwind CSS via CDN for styling. It features a mobile-responsive design optimized for portrait mode, displaying all input elements vertically. The UI emphasizes a "mirror-like" natural experience with a circular layout (or vertical stacking on mobile), minimal whitespace, and a focus on visual results rather than technical details. Key UI elements include drag & drop image upload, a before/after slider, and download functionality. The design uses a light gray background (#F7F7F7) and rose pink (#F45B69) for main actions, with Noto Sans KR typography.

### Backend Architecture

The backend is built with Flask (Python) and features a CORS-enabled API for virtual try-on. It handles multipart form data with a maximum file size of 16MB. The core is an optimized AI pipeline:

**Stage 0: Background Removal**
- Optional local `rembg` processing for clothing images.

**Stage 1: Virtual Try-On**
- **Primary Model**: Gemini 2.5 Flash for all categories (upper\_body, lower\_body, dress), chosen for its quality, natural results, and ability to preserve image dimensions and details like hands/objects.
- **Fallback Model**: IDM-VTON, primarily used as a fallback, especially for dress categories where it shows consistency.

**Monetization System**

A monetization MVP is implemented with a free tier of 3 virtual try-ons per day per user, and a paid tier of 10 credits for $2 USD via Stripe Checkout. User identification is based on an IP + User-Agent hash. Credits are managed in an SQLite database (`credits.db`), with free tries resetting daily at midnight UTC. A "Refitting Feature" allows up to 5 free retries per hour for the same photo set, improving user satisfaction without consuming credits.

**Data Storage Solutions**

Object storage is handled via Google Cloud Storage, authenticated through a Replit sidecar service, using UUID-based file naming. An in-memory storage class (`MemStorage`) is used for fitting records, with a prepared Drizzle ORM schema for future migration to PostgreSQL (e.g., Neon serverless).

## External Dependencies

*   **Cloud Services**: Google Cloud Storage, Replit Object Storage sidecar endpoint.
*   **AI & Machine Learning**: Gemini 2.5 Flash API, IDM-VTON (via Replicate), `rembg` for local background removal.
*   **Payment Processing**: Stripe Checkout.
*   **Development & Libraries**: Flask, Werkzeug, Tailwind CSS, Drizzle ORM, SQLite.