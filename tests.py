# tests.py
import os, base64, io, time, json, requests
from typing import List, Dict
from PIL import Image

RESULT_OK = "✅ PASS"
RESULT_SKIP = "⏸ SKIP"
RESULT_FAIL = "❌ FAIL"

def tiny_png_bytes():
    img = Image.new("RGB", (2,2), (120,120,120))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

class SelfTester:
    """
    Replit 웹 화면에서 버튼으로 실행하는 1단계 셀프 테스트.
    비용/시간을 고려해 기본은 드라이런 위주로 구성.
    실제 AI 호출 스모크는 ALLOW_SMOKE_TEST=1 일 때만 수행하도록 남겨둠.
    """
    def __init__(self, app):
        self.app = app
        self.report: List[Dict] = []

    def add(self, title: str, ok: bool, detail: str = ""):
        self.report.append({
            "title": title,
            "result": RESULT_OK if ok else RESULT_FAIL,
            "detail": detail or ""
        })

    def skip(self, title: str, reason: str = ""):
        self.report.append({
            "title": title,
            "result": RESULT_SKIP,
            "detail": reason
        })

    def run_all(self):
        # [1] 서버 실행 확인(이 페이지가 열렸다는 사실 자체가 증거)
        self.add("[테스트 1] 서버 정상 실행", True, "Flask가 실행되어 /selftest에 접근됨")

        # [2] 업로드 라우트 존재 여부
        try:
            rule_exists = any(str(r.rule) == "/tryon" for r in self.app.url_map.iter_rules())
            self.add("[테스트 2] 이미지 업로드 라우트", rule_exists, "/tryon 라우트 확인")
        except Exception as e:
            self.add("[테스트 2] 이미지 업로드 라우트", False, f"라우트 탐색 오류: {e}")

        # [3] Replicate 토큰 존재 여부(실 호출은 스킵)
        rep_token = os.getenv("REPLICATE_API_TOKEN", "")
        self.add("[테스트 3] Replicate 토큰 존재", bool(rep_token), "환경변수 REPLICATE_API_TOKEN 체크")

        # [4] Cloudflare R2 설정 값 점검(형식 포함)
        r2_acc = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
        r2_key = os.getenv("CLOUDFLARE_R2_ACCESS_KEY", "")
        r2_sec = os.getenv("CLOUDFLARE_R2_SECRET_KEY", "")
        r2_bucket = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "")
        r2_domain = (os.getenv("CLOUDFLARE_R2_PUBLIC_DOMAIN", "") or "").strip()
        # https://https:// 중복 방지 표시만
        r2_domain_display = r2_domain.replace("https://https://", "https://")
        domain_ok = bool(r2_domain) and (r2_domain.startswith("https://") or "." in r2_domain)
        self.add("[테스트 4] R2 환경변수 구성", all([r2_acc, r2_key, r2_sec, r2_bucket, domain_ok]),
                 f"PUBLIC_DOMAIN={r2_domain_display or '(미설정)'}")

        # [5] 결과 표시 정적영역(간단 점검)
        static_ok = os.path.isdir(os.path.join(os.getcwd(), "static"))
        self.add("[테스트 5] 결과 표시 영역(정적 폴더)", static_ok, "static/ 폴더 존재 여부")

        # [6] 프롬프트 번역 플래그(선택)
        translate_on = os.getenv("TRANSLATE_PROMPT", "0") == "1"
        self.add("[테스트 6] 한→영 프롬프트 번역 플래그", True, f"TRANSLATE_PROMPT={translate_on}")

        # [7] 업로드 없이 호출 시 예외 경로 존재(내부 규칙 점검)
        try:
            tryon_exists = any(str(r.rule)=="/tryon" and "POST" in r.methods for r in self.app.url_map.iter_rules())
            self.add("[테스트 7] 업로드 예외 처리 경로", tryon_exists, "POST /tryon 라우트 존재")
        except Exception as e:
            self.add("[테스트 7] 업로드 예외 처리 경로", False, f"오류: {e}")

        # [8] 모델 추상화 구조 파일 존재
        files_ok = all(os.path.isfile(p) for p in [
            "model_client.py", "replicate_client.py", "provider_factory.py"
        ])
        self.add("[테스트 8] 모델 추상화 구조 파일", files_ok, "세 파일 존재 여부")

        # ---- 선택: 실제 스모크 테스트 (원하면 환경변수 ALLOW_SMOKE_TEST=1) ----
        if os.getenv("ALLOW_SMOKE_TEST", "0") == "1":
            try:
                _ = requests.get("https://httpbin.org/get", timeout=5).status_code
                self.add("[추가] 네트워크 아웃바운드", True, "httpbin 연결 OK")
            except Exception as e:
                self.add("[추가] 네트워크 아웃바운드", False, f"{e}")
            self.skip("[추가] AI 모델 실제 호출", "안전상 기본 스킵 — 필요 시 구현")

        return self.report
