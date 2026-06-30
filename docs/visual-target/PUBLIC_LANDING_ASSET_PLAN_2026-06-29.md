# 공개(비회원) 랜딩 — 레퍼런스 & 배경/영상 에셋 수집 계획 (2026-06-29)

목적: Bubli 공개 랜딩(`/`)에 쓸 "청량한 Sky Opal" 감성의 레퍼런스 + 배경 이미지 + 루프 영상을 브라우저로 수집·생성한다. 회원 웹앱이 아니라 **랜딩 전용**이라, 큰 글래스/버블/홀로그래픽 배경을 (회원앱과 달리) 적극적으로 써도 된다. 단 청록/민트/aqua/teal 금지, Sky Opal 팔레트 유지.

수집물은 모두 `docs/visual-target/` 하위에 폴더로 정리한다. (`docs/`는 gitignore라 로컬 보관 → 채택분만 레포로 이동.)

## 0. 산출 폴더 구조

```
docs/visual-target/
  public-landing/
    refs/            # 레퍼런스 사이트 스크린샷 (.png)
    bg-candidates/   # 생성한 배경 이미지 (.png/.webp)
    motion/          # 생성/캡처한 루프 영상 (.mp4/.webm)
    SOURCES.md       # 출처·라이선스·프롬프트 기록
```

## 1. 레퍼런스 사이트 (스크린샷 캡처)

| 사이트 | 보는 것 | 우리가 뽑을 컷 |
|---|---|---|
| voiceflow.com | AI 에이전트 빌더 랜딩, 깔끔 SaaS + 절제된 모션 | 히어로, 기능 섹션 레이아웃, CTA, 푸터 |
| getanchor.co | 구성/정보구조 | 히어로 카피 구조, 섹션 리듬 |
| kastle.ai | AI 톤, 글래스/그라데이션 | 히어로 배경, 카드 질감 |
| todesktop.com | 웹앱→데스크탑(=Bubli Tauri와 직접 관련) | 데스크탑 위젯/앱 시연 표현, 다운로드 CTA |
| drift(기존) | 정보구조 참고 | 이미 보유 |
| Spline blobs (app.spline.design/community/search?query=blobs) | 3D blob 모션 무드 | 인기 blob 씬 썸네일 5~8개, 느낌만 |

캡처 방식: Claude in Chrome로 각 URL 접속 → 풀페이지 스크린샷 + 히어로 영역 컷 → `refs/`에 `voiceflow-hero.png`처럼 저장. 로그인 불필요(공개 페이지), 읽기·캡처만.

## 2. 배경 이미지 후보 ("청량한 배경" — visual target에서 추출)

visual target/에셋 보드에서 보이는 배경 후보:

1. **Liquid Glass / Holographic prism** — 옅은 sky/lilac/pink 굴절이 흐르는 거의 흰 표면 (랜딩 히어로 배경).
2. **Sky Opal soft gradient wash** — 좌상단 sky-light → 우하단 opal-lilac → 하단 soft-pink, 거의 흰 베이스 (섹션 배경).
3. **Bubble field (옅은)** — 투명 비눗방울이 드문드문 떠 있는 아주 옅은 오버레이.
4. **Night Bubble 다크 배경** — 딥 네이비 + 낮은 채도 sky/lilac glow (다크 히어로).
5. **Frosted glass panel 텍스처** — 카드 뒤 흐림 배경.

생성 엔진: ChatGPT(DALL·E/이미지) 또는 Gemini(이미지). 각 후보당 2~3 변형.

공통 프롬프트 베이스(영문, 색 고정):
> Soft airy abstract background, glassmorphism, holographic prism light refraction, pale sky blue (#9ED8FF), bubble blue (#6FB8F2), opal lilac (#DCD8F8), soft pink (#F6DDEB), near-white base, very soft, clean, minimal, high resolution, no text, no logos, NO teal NO mint NO aqua. 16:9.

다크 변형: "deep navy #161E2E base, subtle low-saturation sky/lilac glow, night glass, no neon".

## 3. 루프 영상 후보 (Gemini/Veo 등)

랜딩 히어로 ambient용 5~8초 무한 루프:
1. 천천히 흐르는 holographic liquid glass.
2. 투명 비눗방울이 부드럽게 떠오르는 장면(소수).
3. Sky Opal 그라데이션이 미세하게 일렁이는 배경.

프롬프트 베이스:
> Seamless looping ambient background, slow soft motion, glassmorphism liquid light, pale sky blue + opal lilac + soft pink on near-white, calm, premium, minimal, no text, NO teal/mint/aqua. 5–8s loop, 1920x1080.

출력은 mp4/webm. 웹 사용 시 용량 최적화(별도 단계).

## 4. 자동 진행 순서 (브라우저)

1. **레퍼런스 캡처** (로그인 불필요, 저위험) — 6개 소스 스크린샷 → `refs/`.
2. **이미지 생성** — 로그인된 ChatGPT 또는 Gemini 탭에서 프롬프트 순차 입력 → 생성물 다운로드 → `bg-candidates/`. (다운로드는 건별 동의)
3. **영상 생성** — Gemini(Veo) 등에서 프롬프트 입력 → 생성 → 다운로드 → `motion/`. (시간 걸림, 건별 동의)
4. 각 단계 후 `SOURCES.md`에 출처·프롬프트·라이선스 기록.

## 5. 안전/경계 규칙

- 공개 페이지 캡처는 읽기만. 로그인·결제·약관 동의·계정 생성은 하지 않는다(필요하면 사용자에게 넘김).
- **다운로드는 매 건 사용자 승인** 후 진행(파일명·출처·용량 고지).
- 생성 서비스는 **사용자가 이미 로그인된 세션**에서만 사용. 내가 로그인하지 않는다.
- 캡처/생성물의 라이선스·상업적 사용 가능 여부를 `SOURCES.md`에 남긴다(레퍼런스 사이트 스크린샷은 무드 참고용, 제품에 그대로 쓰지 않음).
- 청록/민트/aqua/teal 금지. Sky Opal 팔레트 유지.

## 6. 시작 제안

1단계(레퍼런스 캡처)부터 시작한다. Claude in Chrome로 voiceflow → getanchor → kastle → todesktop → spline blobs 순서로 접속해 스크린샷을 `refs/`에 저장. 그다음 사용자가 로그인된 이미지/영상 생성 탭을 알려주면 2·3단계로 넘어간다.
