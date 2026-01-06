/**
 * PayApp 결제 연동 타입 정의
 * @see https://www.payapp.kr/dev_center/dev_center01.html
 */

// ============================================
// 공통 타입
// ============================================

export type PayAppCommandType =
  | 'payrequest'
  | 'paycancel'
  | 'billRegist'
  | 'billDelete'
  | 'billPay'
  | 'rebillRegist'
  | 'rebillCancel'
  | 'rebillStop'
  | 'rebillStart'
  | 'cashReceiptIssue'
  | 'cashReceiptCancel';

export interface PayAppCredentials {
  userid: string;
  linkkey: string;
  linkval: string;
}

export interface PayAppBaseResponse {
  state: '0' | '1';
  errorMessage?: string;
}

// ============================================
// 결제 요청 관련
// ============================================

export type PaymentType =
  | 'card' // 신용카드
  | 'phone' // 휴대전화
  | 'kakaopay' // 카카오페이
  | 'naverpay' // 네이버페이
  | 'smilepay' // 스마일페이
  | 'rbank' // 계좌이체
  | 'vbank' // 가상계좌
  | 'applepay' // 애플페이
  | 'payco' // 페이코
  | 'wechat' // 위챗페이
  | 'myaccount' // 내통장결제
  | 'tosspay'; // 토스페이

export interface PaymentRequestParams {
  userid: string;
  shopname: string;
  goodname: string;
  price: number;
  recvphone?: string;
  memo?: string;
  reqaddr?: 0 | 1;
  vccode?: string;
  redirecturl?: string;
  redirect?: 'opener' | 'self';
  feedbackurl?: string;
  checkretry?: 'y' | 'n';
  returnurl?: string;
  var1?: string;
  var2?: string;
  smsuse?: 'y' | 'n';
  openpaytype?: PaymentType | string; // 콤마로 복수 선택 가능
  redirectpay?: 1;
  amount_taxable?: number;
  amount_taxfree?: number;
  amount_vat?: number;
  subuserid?: string;
  buyerid?: string;
  skip_cstpage?: 'y';
}

export interface PaymentRequestResponse extends PayAppBaseResponse {
  mul_no?: string;
  payurl?: string;
  qrurl?: string;
}

// ============================================
// 결제 통보 (Webhook)
// ============================================

export type PayTypeCode =
  | 1 // 신용카드
  | 2 // 휴대전화
  | 4 // 대면결제
  | 6 // 계좌이체
  | 7 // 가상계좌
  | 15 // 카카오페이
  | 16 // 네이버페이
  | 17 // 등록결제
  | 21 // 스마일페이
  | 22 // 위챗페이
  | 23 // 애플페이
  | 24 // 내통장결제
  | 25; // 토스페이

export type PayState =
  | 1 // 요청
  | 4 // 결제완료
  | 8 // 요청취소
  | 9 // 승인취소
  | 10 // 결제대기
  | 32 // 요청취소
  | 64 // 승인취소
  | 70 // 부분취소
  | 71; // 부분취소

export interface PaymentFeedback {
  userid: string;
  linkkey: string;
  linkval: string;
  goodname: string;
  price: string;
  recvphone: string;
  pay_date?: string;
  pay_type?: PayTypeCode;
  pay_state: PayState;
  mul_no: string;
  var1?: string;
  var2?: string;
  feedbacktype: '0' | '1';
  memo?: string;
  // 신용카드 추가 정보
  card_name?: string;
  payauthcode?: string;
  card_quota?: string;
  card_num?: string;
  // 가상계좌 추가 정보
  vbank?: string;
  vbankno?: string;
  depositor?: string;
}

// ============================================
// 등록결제 (BILL) 관련
// ============================================

export interface BillRegistParams {
  cmd: 'billRegist';
  userid: string;
  cardNo: string;
  expMonth: string; // MM
  expYear: string; // YY
  buyerAuthNo: string; // 생년월일 6자리 또는 사업자번호
  cardPw: string; // 카드 비밀번호 앞 2자리
  buyerPhone: string;
  buyerName: string;
  buyerId?: string;
}

export interface BillRegistResponse extends PayAppBaseResponse {
  encBill?: string;
  billAuthNo?: string;
  cardno?: string;
  cardname?: string;
}

export interface BillDeleteParams {
  cmd: 'billDelete';
  userid: string;
  encBill: string;
}

export interface BillPayParams {
  cmd: 'billPay';
  userid: string;
  encBill: string;
  goodname: string;
  price: number;
  recvphone: string;
  amount_taxable?: number;
  amount_taxfree?: number;
  amount_vat?: number;
  feedbackurl?: string;
  var1?: string;
  var2?: string;
  checkretry?: 'y' | 'n';
  cardinst?: string; // '00', '01', '02'... (50,000원 이상)
}

export interface BillPayResponse extends PayAppBaseResponse {
  CSTURL?: string;
  price?: string;
  mul_no?: string;
}

// ============================================
// 정기결제 관련
// ============================================

export type RebillCycleType = 'Month' | 'Week' | 'Day';

export interface RebillRegistParams {
  cmd: 'rebillRegist';
  userid: string;
  goodname: string;
  goodprice: number;
  recvphone: string;
  rebillCycleType: RebillCycleType;
  rebillExpire: string; // yyyy-mm-dd
  rebillCycleMonth?: number; // 1~31, 90:말일 (Month 타입시)
  rebillCycleWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1:월~7:일 (Week 타입시)
  recvemail?: string;
  memo?: string;
  feedbackurl?: string;
  var1?: string;
  var2?: string;
  smsuse?: 'y' | 'n';
  returnurl?: string;
  openpaytype?: 'card' | 'phone';
  failurl?: string;
}

export interface RebillRegistResponse extends PayAppBaseResponse {
  rebill_no?: string;
  payurl?: string;
}

export interface RebillCancelParams {
  cmd: 'rebillCancel';
  userid: string;
  rebill_no: string;
}

export interface RebillStopParams {
  cmd: 'rebillStop';
  userid: string;
  rebill_no: string;
}

export interface RebillStartParams {
  cmd: 'rebillStart';
  userid: string;
  rebill_no: string;
}

// ============================================
// 결제 취소 관련
// ============================================

export interface PaymentCancelParams {
  cmd: 'paycancel';
  userid: string;
  linkkey: string;
  mul_no: string;
  price?: number; // 부분취소 금액 (미입력시 전액)
  memo?: string;
}

export interface PaymentCancelResponse extends PayAppBaseResponse {
  // 추가 응답 필드가 있을 수 있음
}

// ============================================
// 현금영수증 관련
// ============================================

export interface CashReceiptIssueParams {
  cmd: 'cashReceiptIssue';
  userid: string;
  mul_no: string;
  identityNum: string; // 휴대폰번호 또는 사업자번호
  type: 0 | 1; // 0:소득공제, 1:지출증빙
}

export interface CashReceiptCancelParams {
  cmd: 'cashReceiptCancel';
  userid: string;
  mul_no: string;
}

// ============================================
// JavaScript SDK 관련
// ============================================

export interface PayAppSDK {
  setDefault(key: string, value: string | number): void;
  setForm(formName: string): void;
  setParam(key: string, value: string | number): void;
  payrequest(): void;
  rebill(): void;
}

declare global {
  interface Window {
    PayApp?: PayAppSDK;
  }
}

// ============================================
// 유틸리티 타입
// ============================================

export interface PayAppConfig {
  apiUrl: string;
  credentials: PayAppCredentials;
  isProduction: boolean;
}

export interface PayAppError extends Error {
  code?: string;
  state?: '0';
  errorMessage?: string;
}
