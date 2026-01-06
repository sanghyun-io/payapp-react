/**
 * PayApp 결제 연동 라이브러리
 * @see https://www.payapp.kr/dev_center/dev_center01.html
 */

import type {
  PayAppConfig,
  PayAppCredentials,
  PayAppError,
  PaymentRequestParams,
  PaymentRequestResponse,
  PaymentCancelParams,
  PaymentCancelResponse,
  BillRegistParams,
  BillRegistResponse,
  BillDeleteParams,
  BillPayParams,
  BillPayResponse,
  RebillRegistParams,
  RebillRegistResponse,
  RebillCancelParams,
  RebillStopParams,
  RebillStartParams,
  CashReceiptIssueParams,
  CashReceiptCancelParams,
  PayAppBaseResponse,
  PaymentFeedback,
} from '../types';

// ============================================
// 상수
// ============================================

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';
const PAYAPP_SDK_URL = 'https://lite.payapp.kr/public/api/v2/payapp-lite.js';

// ============================================
// PayApp API 클라이언트
// ============================================

export class PayAppClient {
  private config: PayAppConfig;

  constructor(credentials: PayAppCredentials, isProduction = false) {
    this.config = {
      apiUrl: PAYAPP_API_URL,
      credentials,
      isProduction,
    };
  }

  /**
   * REST API 호출
   */
  private async callAPI<T extends PayAppBaseResponse>(
    params: Record<string, string | number>
  ): Promise<T> {
    try {
      const formData = new URLSearchParams();

      // 파라메터를 form data로 변환
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw this.createError(
          `HTTP error! status: ${response.status}`,
          response.status.toString()
        );
      }

      const text = await response.text();
      const result = this.parseResponse<T>(text);

      // 에러 체크
      if (result.state === '0') {
        throw this.createError(
          result.errorMessage || 'PayApp API error',
          '0'
        );
      }

      return result;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN'
      );
    }
  }

  /**
   * URL encoded 응답을 파싱
   */
  private parseResponse<T extends PayAppBaseResponse>(text: string): T {
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};

    params.forEach((value, key) => {
      result[key] = value;
    });

    return result as unknown as T;
  }

  /**
   * PayApp 에러 생성
   */
  private createError(message: string, code: string): PayAppError {
    const error = new Error(message) as PayAppError;
    error.code = code;
    error.state = '0';
    error.errorMessage = message;
    return error;
  }

  // ============================================
  // 결제 요청 API
  // ============================================

  /**
   * 결제 요청 (REST API)
   */
  async requestPayment(
    params: Omit<PaymentRequestParams, 'userid'>
  ): Promise<PaymentRequestResponse> {
    return this.callAPI<PaymentRequestResponse>({
      cmd: 'payrequest',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  /**
   * 결제 취소 (전액/부분)
   */
  async cancelPayment(
    params: Omit<PaymentCancelParams, 'cmd' | 'userid' | 'linkkey'>
  ): Promise<PaymentCancelResponse> {
    return this.callAPI<PaymentCancelResponse>({
      cmd: 'paycancel',
      userid: this.config.credentials.userid,
      linkkey: this.config.credentials.linkkey,
      ...params,
    });
  }

  // ============================================
  // 등록결제 (BILL) API
  // ============================================

  /**
   * 등록결제 등록
   */
  async registerBill(
    params: Omit<BillRegistParams, 'cmd' | 'userid'>
  ): Promise<BillRegistResponse> {
    return this.callAPI<BillRegistResponse>({
      cmd: 'billRegist',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  /**
   * 등록결제 삭제
   */
  async deleteBill(
    params: Omit<BillDeleteParams, 'cmd' | 'userid'>
  ): Promise<PayAppBaseResponse> {
    return this.callAPI<PayAppBaseResponse>({
      cmd: 'billDelete',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  /**
   * 등록결제 결제
   */
  async payWithBill(
    params: Omit<BillPayParams, 'cmd' | 'userid'>
  ): Promise<BillPayResponse> {
    return this.callAPI<BillPayResponse>({
      cmd: 'billPay',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  // ============================================
  // 정기결제 API
  // ============================================

  /**
   * 정기결제 요청 (REST API)
   */
  async registerRecurringPayment(
    params: Omit<RebillRegistParams, 'cmd' | 'userid'>
  ): Promise<RebillRegistResponse> {
    return this.callAPI<RebillRegistResponse>({
      cmd: 'rebillRegist',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  /**
   * 정기결제 해지
   */
  async cancelRecurringPayment(
    params: Omit<RebillCancelParams, 'cmd' | 'userid'>
  ): Promise<PayAppBaseResponse> {
    return this.callAPI<PayAppBaseResponse>({
      cmd: 'rebillCancel',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  /**
   * 정기결제 일시정지
   */
  async stopRecurringPayment(
    params: Omit<RebillStopParams, 'cmd' | 'userid'>
  ): Promise<PayAppBaseResponse> {
    return this.callAPI<PayAppBaseResponse>({
      cmd: 'rebillStop',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  /**
   * 정기결제 승인 (재개)
   */
  async startRecurringPayment(
    params: Omit<RebillStartParams, 'cmd' | 'userid'>
  ): Promise<PayAppBaseResponse> {
    return this.callAPI<PayAppBaseResponse>({
      cmd: 'rebillStart',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  // ============================================
  // 현금영수증 API
  // ============================================

  /**
   * 현금영수증 발행
   */
  async issueCashReceipt(
    params: Omit<CashReceiptIssueParams, 'cmd' | 'userid'>
  ): Promise<PayAppBaseResponse> {
    return this.callAPI<PayAppBaseResponse>({
      cmd: 'cashReceiptIssue',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  /**
   * 현금영수증 취소
   */
  async cancelCashReceipt(
    params: Omit<CashReceiptCancelParams, 'cmd' | 'userid'>
  ): Promise<PayAppBaseResponse> {
    return this.callAPI<PayAppBaseResponse>({
      cmd: 'cashReceiptCancel',
      userid: this.config.credentials.userid,
      ...params,
    });
  }

  // ============================================
  // 유틸리티 메서드
  // ============================================

  /**
   * 결제 상태 코드를 문자열로 변환
   */
  static getPayStateString(state: number): string {
    const states: Record<number, string> = {
      1: '요청',
      4: '결제완료',
      8: '요청취소',
      9: '승인취소',
      10: '결제대기',
      32: '요청취소',
      64: '승인취소',
      70: '부분취소',
      71: '부분취소',
    };
    return states[state] || '알 수 없음';
  }

  /**
   * 결제 수단 코드를 문자열로 변환
   */
  static getPayTypeString(type: number): string {
    const types: Record<number, string> = {
      1: '신용카드',
      2: '휴대전화',
      4: '대면결제',
      6: '계좌이체',
      7: '가상계좌',
      15: '카카오페이',
      16: '네이버페이',
      17: '등록결제',
      21: '스마일페이',
      22: '위챗페이',
      23: '애플페이',
      24: '내통장결제',
      25: '토스페이',
    };
    return types[type] || '알 수 없음';
  }
}

// ============================================
// JavaScript SDK 헬퍼
// ============================================

/**
 * PayApp SDK 로드
 */
export function loadPayAppSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 로드되어 있으면 바로 반환
    if (window.PayApp) {
      resolve();
      return;
    }

    // 스크립트가 이미 추가되어 있는지 확인
    const existingScript = document.querySelector(
      `script[src="${PAYAPP_SDK_URL}"]`
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load PayApp SDK'))
      );
      return;
    }

    // 스크립트 태그 생성 및 추가
    const script = document.createElement('script');
    script.src = PAYAPP_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayApp SDK'));
    document.head.appendChild(script);
  });
}

/**
 * PayApp SDK 초기화
 */
export function initPayAppSDK(userid: string, shopname: string): void {
  if (!window.PayApp) {
    throw new Error('PayApp SDK not loaded');
  }

  window.PayApp.setDefault('userid', userid);
  window.PayApp.setDefault('shopname', shopname);
}

/**
 * 결제 요청 (JS SDK)
 */
export function requestPaymentWithSDK(
  params: Record<string, string | number>
): void {
  if (!window.PayApp) {
    throw new Error('PayApp SDK not loaded');
  }

  Object.entries(params).forEach(([key, value]) => {
    window.PayApp!.setParam(key, value);
  });

  window.PayApp.payrequest();
}

/**
 * 정기결제 요청 (JS SDK)
 */
export function requestRecurringPaymentWithSDK(
  params: Record<string, string | number>
): void {
  if (!window.PayApp) {
    throw new Error('PayApp SDK not loaded');
  }

  Object.entries(params).forEach(([key, value]) => {
    window.PayApp!.setParam(key, value);
  });

  window.PayApp.rebill();
}

// ============================================
// Webhook 헬퍼
// ============================================

/**
 * Feedback URL 파라메터 검증
 */
export function validateFeedback(
  feedback: PaymentFeedback,
  credentials: PayAppCredentials
): boolean {
  return (
    feedback.userid === credentials.userid &&
    feedback.linkkey === credentials.linkkey &&
    feedback.linkval === credentials.linkval
  );
}

/**
 * Feedback 중복 처리 방지를 위한 고유 키 생성
 */
export function generateFeedbackKey(feedback: PaymentFeedback): string {
  return `${feedback.mul_no}_${feedback.pay_state}_${feedback.var1 || ''}_${
    feedback.var2 || ''
  }`;
}

/**
 * 결제 완료 상태 확인
 */
export function isPaymentCompleted(feedback: PaymentFeedback): boolean {
  return feedback.pay_state === 4;
}

/**
 * 결제 취소 상태 확인
 */
export function isPaymentCancelled(feedback: PaymentFeedback): boolean {
  return [8, 9, 32, 64, 70, 71].includes(feedback.pay_state);
}

// ============================================
// 클라이언트 생성 헬퍼
// ============================================

/**
 * PayApp 클라이언트 생성 헬퍼 함수
 */
export function createPayAppClient(
  credentials: PayAppCredentials,
  isProduction = false
): PayAppClient {
  return new PayAppClient(credentials, isProduction);
}

// ============================================
// 에러 핸들링 유틸리티
// ============================================

/**
 * PayApp 에러 코드 메시지 맵
 */
export const PAYAPP_ERROR_MESSAGES: Record<string, string> = {
  '70001': 'HTTPS 프로토콜을 사용해야 합니다.',
  '70010': '판매자 아이디 또는 연동키가 올바르지 않습니다.',
  '70020': '파라메터 값이 올바르지 않습니다.',
  '70040': '명령(cmd) 값이 올바르지 않습니다.',
  '70060': '권한이 없습니다.',
  '70080': '고객사 응답이 실패했습니다. feedbackurl에서 SUCCESS를 응답해주세요.',
  '80010': '취소할 수 없는 상태입니다.',
  '80020': '취소할 수 없는 상태입니다.',
  '80030': '취소 금액이 올바르지 않습니다.',
};

/**
 * PayApp 에러 메시지 조회
 */
export function getPayAppErrorMessage(code: string): string {
  return PAYAPP_ERROR_MESSAGES[code] || '알 수 없는 오류가 발생했습니다.';
}

/**
 * PayApp 에러인지 확인
 */
export function isPayAppError(error: unknown): error is PayAppError {
  return (
    error instanceof Error &&
    'code' in error &&
    'state' in error &&
    (error as PayAppError).state === '0'
  );
}
