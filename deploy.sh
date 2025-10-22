#!/bin/bash
set -e

# ========================================
# FITSA GitHub → Render 배포 스크립트
# ========================================

echo "🚀 FITSA 배포 스크립트 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Git 사용자 설정 확인
if [ -z "$(git config user.name)" ]; then
    echo -e "${YELLOW}⚠️  Git 사용자 이름이 설정되지 않았습니다.${NC}"
    read -p "Git 사용자 이름을 입력하세요: " git_name
    git config --global user.name "$git_name"
fi

if [ -z "$(git config user.email)" ]; then
    echo -e "${YELLOW}⚠️  Git 이메일이 설정되지 않았습니다.${NC}"
    read -p "Git 이메일을 입력하세요: " git_email
    git config --global user.email "$git_email"
fi

echo -e "${GREEN}✓${NC} Git 사용자: $(git config user.name) <$(git config user.email)>"

# 2. 변경사항 확인
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  커밋할 변경사항이 없습니다.${NC}"
    read -p "계속하시겠습니까? (y/N): " continue
    if [ "$continue" != "y" ] && [ "$continue" != "Y" ]; then
        echo "배포 취소됨."
        exit 0
    fi
else
    echo -e "${GREEN}✓${NC} 변경사항 감지됨:"
    git status --short
fi

# 3. 커밋 메시지 입력
read -p "커밋 메시지를 입력하세요 (기본: 'deploy: production update'): " commit_msg
commit_msg=${commit_msg:-"deploy: production update"}

# 4. Git add & commit
echo ""
echo "📦 변경사항 커밋 중..."
git add .
git commit -m "$commit_msg" || echo "이미 커밋됨 또는 변경사항 없음"

# 5. 브랜치 확인
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo -e "${YELLOW}⚠️  현재 브랜치: $current_branch${NC}"
    read -p "main 브랜치로 전환하시겠습니까? (y/N): " switch
    if [ "$switch" = "y" ] || [ "$switch" = "Y" ]; then
        git checkout main
        git merge $current_branch
    fi
fi

# 6. GitHub에 푸시
echo ""
echo "☁️  GitHub에 푸시 중..."
git push origin main

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 배포 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📊 Render에서 자동 배포가 시작됩니다."
echo "   확인: https://dashboard.render.com"
echo ""
echo "🔍 배포 상태 확인 방법:"
echo "   1. Render 대시보드 → Services → fitsa-web"
echo "   2. 'Builds' 탭에서 진행 상황 확인"
echo "   3. 'Logs' 탭에서 실시간 로그 확인"
echo ""
echo "⏱️  예상 배포 시간: 3-5분"
echo ""
