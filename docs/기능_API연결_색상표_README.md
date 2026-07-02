# 기능/API 연결 색상표

- `기능_API연결_색상표_2026-07-01.xlsx`: 색상표 원본입니다.
- `기능_API연결_명세_2026-07-01.csv`: xlsx를 diff/review용으로 평탄화한 로컬 생성물입니다.

## 추적 정책

CSV는 충돌이 잦아서 Git에 올리지 않습니다. 필요할 때 로컬에서 재추출해 확인하고, PR에는 xlsx나 근거 문서만 올립니다.

- `.gitignore`의 `*.csv` 규칙으로 새 CSV 파일 추적을 막습니다.
- `npm run check:product-rules`는 `docs/기능_API연결_명세_2026-07-01.csv`가 다시 Git에 tracked 되면 실패합니다.
- 이미 생성된 로컬 CSV가 있어도 commit 대상에 넣지 않습니다.

## 갱신 기준

색상 의미는 다음 기준을 유지합니다.

- 됨: pale sky
- 부분: pearl
- 안됨: dust rose
- 리다이렉트/정적: rain grey
