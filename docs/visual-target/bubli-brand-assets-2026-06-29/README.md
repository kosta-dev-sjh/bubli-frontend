# Bubli Brand Assets (2026-06-29)

이 폴더는 `버블리 로고1.png`에서 추출한 브랜드용 PNG/WebP 에셋을 둔다.

## 원칙

- 오팔 질감이 있는 로고 마크는 억지로 SVG 패스화하지 않는다.
- UI 위에 얹는 파일은 배경을 투명하게 뺀다.
- 작은 크기에서 깨지지 않도록 필요한 해상도를 미리 뽑아둔다.
- 단색 아이콘이나 단색 워드마크가 따로 필요할 때만 벡터를 새로 만든다.

## 먼저 볼 파일

| 용도 | 파일 |
|---|---|
| 전체 미리보기 | `preview/brand-assets-preview.png` |
| 원본 시트 보관 | `source/logo-sheet.png` |
| 라이트 로고 락업 | `png/logo-lockup-light-lg.png` |
| 라이트 앱 아이콘 | `png/app-icon-light-1024.png` |
| 다크 앱 아이콘 | `png/app-icon-dark-1024.png` |
| 파비콘 PNG | `favicon/favicon-32.png`, `favicon/favicon-64.png` |

## 폴더

| 폴더 | 내용 |
|---|---|
| `source/` | 원본 로고 시트 |
| `png/` | 투명 배경 PNG |
| `webp/` | 투명 배경 WebP |
| `favicon/` | 파비콘 후보 PNG |
| `preview/` | 체크보드 배경 검수용 미리보기 |

## 주의

- 라이트 로고 마크는 흰 유리 면이 안쪽에 있으므로 단순 흰색 제거를 쓰면 안 된다.
- 현재 파일은 외곽 실루엣 마스크로 배경을 뺐다. 안쪽 흰 하이라이트와 유리 면은 로고의 일부다.
- `logo-lockup-light-*`는 발표/문서/브랜드 보드용이다. 좁은 UI에서는 `app-icon-*`를 쓴다.
- 실제 Tauri 아이콘으로 넣기 전에는 macOS 아이콘 세트 생성 규격에 맞춰 별도 변환한다.
