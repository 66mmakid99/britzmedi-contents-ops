# 파일 덮어쓰기 지시서

아래 4개 파일을 정확히 지정된 경로에 덮어써.
내용을 수정하지 마. 그대로 복사해.

## 명령어 (순서대로 실행)

```bash
# 1. 수정된 파일 복사 (덮어쓰기)
cp REPLACE-FILES/channelGenerate.js src/lib/channelGenerate.js
cp REPLACE-FILES/ChannelPreview.jsx src/components/repurpose/ChannelPreview.jsx
cp REPLACE-FILES/RepurposeHub.jsx src/components/repurpose/RepurposeHub.jsx

# 2. 빌드 확인
npm run build

# 3. 빌드 에러 있으면 에러 메시지 알려줘. 없으면 배포:
npx wrangler pages deploy dist --project-name=britzmedi-contents-ops --branch=main

# 4. git
git add .
git commit -m "fix: channel repurpose - stripMarkdown, no double hashtags, tab UI"
git push
```

## 변경 내용 요약

### channelGenerate.js
- stripMarkdown 강화 (__, 코드블록, 링크 등 추가 패턴)
- removeSectionLabels 함수 추가 ([제목], [본문] 등 라벨 제거)
- parseLinkedin: 본문에서 해시태그 줄 분리 → 이중 출력 방지
- parseKakao: [제목]/[본문]/[CTA] 섹션 파싱 추가
- parseNaverBlog: 태그/SEO키워드 별도 추출, 본문 정리
- parseNewsletter: 섹션 파싱 추가
- extractSections 범용 유틸 함수 추가

### ChannelPreview.jsx
- stripMarkdown import하여 표시 전 적용 (이중 방어)
- 복사 시에도 stripMarkdown 적용
- 해시태그: 파싱된 배열만 표시 (본문 내 중복 제거됨)
- 채널별 맞춤 미리보기 (인스타 이미지가이드, 네이버 태그, 뉴스레터 프리헤더 등)
- "✓ 복사됨" 피드백

### RepurposeHub.jsx
- 카드 그리드 → 탭 UI 변경
- ChannelCard 컴포넌트 의존성 제거
- "전체 생성" 버튼 추가
- 생성 로딩 스피너
- 재생성 버튼
