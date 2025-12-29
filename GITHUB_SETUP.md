# GitHub 레포지토리 설정 가이드

## 1. GitHub 레포지토리 생성

1. GitHub에 로그인: https://github.com
2. 우측 상단의 "+" 버튼 클릭 → "New repository" 선택
3. 레포지토리 설정:
   - **Repository name**: `Eraser-Avoidance` (또는 `EraserAvoidance`)
   - **Description**: "A Flappy Bird-style game built with Phaser 3"
   - **Visibility**: Public (GitHub Pages를 위해 필요)
   - **Initialize this repository with**: 체크하지 않음 (이미 로컬에 파일이 있음)
4. "Create repository" 클릭

## 2. 로컬 저장소를 GitHub에 푸시

터미널에서 다음 명령어를 실행하세요:

```bash
cd "H:\Game\Phaser3 Games\Flappy birds"
git remote add origin https://github.com/YOUR_USERNAME/Eraser-Avoidance.git
git push -u origin main
```

**주의**: `YOUR_USERNAME`을 본인의 GitHub 사용자명으로 변경하세요.

## 3. GitHub Pages 설정

1. GitHub 레포지토리 페이지로 이동
2. 상단 메뉴에서 **Settings** 클릭
3. 왼쪽 사이드바에서 **Pages** 클릭
4. **Source** 섹션에서:
   - **Branch**: `main` 선택
   - **Folder**: `/ (root)` 선택
5. **Save** 클릭
6. 몇 분 후 `https://YOUR_USERNAME.github.io/Eraser-Avoidance/` 주소로 게임에 접근할 수 있습니다

## 4. 확인

- 레포지토리: `https://github.com/YOUR_USERNAME/Eraser-Avoidance`
- 게임 플레이: `https://YOUR_USERNAME.github.io/Eraser-Avoidance/`

