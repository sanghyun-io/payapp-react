# payapp-react

[![npm version](https://badge.fury.io/js/payapp-react.svg)](https://www.npmjs.com/package/payapp-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PayApp 결제 시스템을 React 애플리케이션에 쉽게 통합할 수 있는 라이브러리입니다.

## 특징

- ✅ TypeScript 완벽 지원
- ✅ React Hooks 기반
- ✅ 일회성/정기/등록결제 지원
- ✅ Webhook 처리 유틸리티
- ✅ 보안 검증 내장
- ✅ Supabase Edge Function 지원

## 설치

```bash
npm install payapp-react
# or
yarn add payapp-react
# or
pnpm add payapp-react
```

## 빠른 시작

### 기본 설정

```typescript
import { PayAppClient } from 'payapp-react';

const client = new PayAppClient({
  userid: 'your-userid',
  linkkey: 'your-linkkey',
  linkval: 'your-linkval',
});
```

### React Hook 사용

```tsx
import { usePayApp } from 'payapp-react';

function PaymentButton() {
  const { requestPaymentAPI, isLoading } = usePayApp({
    credentials: {
      userid: process.env.PAYAPP_USER_ID!,
      linkkey: process.env.PAYAPP_LINK_KEY!,
      linkval: process.env.PAYAPP_LINK_VAL!,
    },
    shopname: 'My Shop',
  });

  const handlePayment = async () => {
    try {
      const response = await requestPaymentAPI({
        shopname: 'My Shop',
        goodname: '프리미엄 플랜',
        price: 9900,
        recvphone: '01012341234',
        feedbackurl: 'https://your-domain.com/api/webhook',
        returnurl: `${window.location.origin}/payment/complete`,
      });

      if (response.payurl) {
        window.location.href = response.payurl;
      }
    } catch (error) {
      console.error('결제 요청 실패:', error);
    }
  };

  return (
    <button onClick={handlePayment} disabled={isLoading}>
      {isLoading ? '처리 중...' : '결제하기'}
    </button>
  );
}
```

## 주요 기능

### 1. 일회성 결제

```tsx
const { requestPaymentAPI } = usePayApp({
  credentials: { userid, linkkey, linkval },
  shopname: 'My Shop',
});

const response = await requestPaymentAPI({
  shopname: 'My Shop',
  goodname: '상품명',
  price: 10000,
  recvphone: '01012341234',
});
```

### 2. 등록결제 (BILL)

```tsx
const { registerBill, payWithBill } = usePayAppBilling({
  credentials: { userid, linkkey, linkval },
  onSuccess: (encBill) => {
    console.log('카드 등록 성공:', encBill);
  },
});

// 카드 등록
const encBill = await registerBill({
  cardNo: '1234567890123456',
  expMonth: '12',
  expYear: '25',
  buyerAuthNo: '900101',
  cardPw: '12',
  buyerPhone: '01012341234',
  buyerName: '홍길동',
});

// 등록된 카드로 결제
await payWithBill({
  encBill,
  goodname: '월 구독',
  price: 9900,
  recvphone: '01012341234',
});
```

### 3. 정기결제

```tsx
const { requestRecurringPaymentAPI } = usePayApp({
  credentials: { userid, linkkey, linkval },
  shopname: 'My Shop',
});

const response = await requestRecurringPaymentAPI({
  goodname: '월간 구독',
  goodprice: 9900,
  recvphone: '01012341234',
  rebillCycleType: 'Month',
  rebillCycleMonth: 1,
  rebillExpire: '2026-12-31',
});
```

### 4. 결제 취소

```tsx
const { cancelPayment } = usePayAppCancel({
  credentials: { userid, linkkey, linkval },
  onSuccess: () => {
    alert('결제가 취소되었습니다.');
  },
});

await cancelPayment({
  mul_no: '결제요청번호',
  memo: '고객 요청',
});
```

## Webhook 처리

```typescript
import { createWebhookHandler } from 'payapp-react/webhook';

const handler = createWebhookHandler(
  {
    userid: 'your-userid',
    linkkey: 'your-linkkey',
    linkval: 'your-linkval',
  },
  {
    onPaymentCompleted: async (feedback) => {
      console.log('결제 완료:', feedback.mul_no);
      // 결제 완료 처리 로직
    },
    onPaymentCancelled: async (feedback) => {
      console.log('결제 취소:', feedback.mul_no);
      // 취소 처리 로직
    },
    onError: async (error) => {
      console.error('에러 발생:', error);
    },
  }
);

// Webhook 요청 처리
await handler.processWebhook(requestBody);
```

## API 문서

### Hooks

#### `usePayApp(options)`

기본 결제 및 정기결제를 처리하는 Hook입니다.

**Options:**
- `credentials`: PayApp 인증 정보 (required)
  - `userid`: 판매자 ID
  - `linkkey`: 연동 키
  - `linkval`: 연동 값
- `shopname`: 상점명 (optional, default: 'FlashLingo')
- `onSuccess`: 성공 콜백 (optional)
- `onError`: 에러 콜백 (optional)
- `autoLoadSDK`: SDK 자동 로드 여부 (optional, default: true)

**Returns:**
- `requestPaymentAPI`: REST API 결제 요청 함수
- `requestRecurringPaymentAPI`: REST API 정기결제 요청 함수
- `isLoading`: 로딩 상태
- `error`: 에러 정보

#### `usePayAppBilling(options)`

등록결제(BILL)를 처리하는 Hook입니다.

**Options:**
- `credentials`: PayApp 인증 정보 (required)
- `onSuccess`: 성공 콜백 (optional)
- `onError`: 에러 콜백 (optional)

**Returns:**
- `registerBill`: 카드 등록 함수
- `payWithBill`: 등록된 카드로 결제 함수
- `deleteBill`: 등록된 카드 삭제 함수
- `isLoading`: 로딩 상태
- `error`: 에러 정보

#### `usePayAppCancel(options)`

결제 취소를 처리하는 Hook입니다.

**Options:**
- `credentials`: PayApp 인증 정보 (required)
- `onSuccess`: 성공 콜백 (optional)
- `onError`: 에러 콜백 (optional)

**Returns:**
- `cancelPayment`: 결제 취소 함수
- `isLoading`: 로딩 상태
- `error`: 에러 정보

### Client

#### `PayAppClient`

PayApp API를 직접 호출할 수 있는 클라이언트입니다.

```typescript
const client = new PayAppClient(credentials, isProduction);

// 결제 요청
const response = await client.requestPayment(params);

// 결제 취소
await client.cancelPayment(params);

// 카드 등록
const bill = await client.registerBill(params);

// 등록된 카드로 결제
await client.payWithBill(params);

// 카드 삭제
await client.deleteBill(params);
```

## 타입 정의

모든 타입은 TypeScript로 완벽하게 정의되어 있습니다:

```typescript
import type {
  PayAppCredentials,
  PaymentRequestParams,
  PaymentRequestResponse,
  PaymentFeedback,
  PayAppError,
} from 'payapp-react';
```

## 보안 고려사항

⚠️ **중요**: 프로덕션 환경에서는 반드시 다음 보안 사항을 준수하세요.

1. **환경 변수 관리**: 인증 정보는 환경 변수로 관리하고 클라이언트에 노출하지 마세요.
2. **서버 사이드 처리**: 결제 요청은 가능한 서버에서 처리하세요.
3. **Webhook 검증**: Webhook 요청은 반드시 `validateFeedback` 함수로 검증하세요.
4. **HTTPS 사용**: 모든 통신은 HTTPS로 암호화하세요.
5. **encBill 암호화**: 등록결제의 `encBill`은 암호화하여 저장하세요.

## 라이센스

MIT

## 기여

이슈와 PR은 언제나 환영합니다!

## 링크

- [PayApp 개발 문서](https://www.payapp.kr/dev_center/dev_center01.html)
- [GitHub Repository](https://github.com/sanghyun-org/payapp-react)
- [NPM Package](https://www.npmjs.com/package/payapp-react)
