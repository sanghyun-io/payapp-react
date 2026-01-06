/**
 * PayApp Webhook (feedbackurl) 핸들러
 * @see https://www.payapp.kr/dev_center/dev_center01.html#section-feedbackurl
 */

import type { PaymentFeedback, PayAppCredentials } from '../types';
import {
  validateFeedback,
  generateFeedbackKey,
  isPaymentCompleted,
  isPaymentCancelled,
} from './client';

// ============================================
// Webhook 이벤트 타입
// ============================================

export type WebhookEventType =
  | 'payment.requested' // 결제 요청
  | 'payment.completed' // 결제 완료
  | 'payment.cancelled' // 결제 취소
  | 'payment.waiting' // 결제 대기
  | 'payment.unknown'; // 알 수 없는 상태

export interface WebhookEvent {
  type: WebhookEventType;
  feedback: PaymentFeedback;
  timestamp: Date;
}

// ============================================
// Webhook 핸들러 인터페이스
// ============================================

export interface WebhookHandler {
  onPaymentRequested?: (feedback: PaymentFeedback) => Promise<void>;
  onPaymentCompleted?: (feedback: PaymentFeedback) => Promise<void>;
  onPaymentCancelled?: (feedback: PaymentFeedback) => Promise<void>;
  onPaymentWaiting?: (feedback: PaymentFeedback) => Promise<void>;
  onError?: (error: Error, feedback?: PaymentFeedback) => Promise<void>;
}

// ============================================
// Webhook 프로세서
// ============================================

export class PayAppWebhookProcessor {
  private credentials: PayAppCredentials;
  private processedKeys: Set<string>;

  constructor(credentials: PayAppCredentials) {
    this.credentials = credentials;
    this.processedKeys = new Set();
  }

  /**
   * Webhook 요청 파싱
   */
  parseWebhookRequest(body: Record<string, string>): PaymentFeedback {
    return body as unknown as PaymentFeedback;
  }

  /**
   * Webhook 검증
   */
  validate(feedback: PaymentFeedback): boolean {
    return validateFeedback(feedback, this.credentials);
  }

  /**
   * 중복 처리 확인
   */
  isDuplicate(feedback: PaymentFeedback): boolean {
    const key = generateFeedbackKey(feedback);
    return this.processedKeys.has(key);
  }

  /**
   * 처리 완료 표시
   */
  markAsProcessed(feedback: PaymentFeedback): void {
    const key = generateFeedbackKey(feedback);
    this.processedKeys.add(key);
  }

  /**
   * 처리 완료 키 초기화 (메모리 관리)
   */
  clearProcessedKeys(): void {
    this.processedKeys.clear();
  }

  /**
   * 결제 상태에 따른 이벤트 타입 결정
   */
  getEventType(feedback: PaymentFeedback): WebhookEventType {
    switch (feedback.pay_state) {
      case 1:
        return 'payment.requested';
      case 4:
        return 'payment.completed';
      case 8:
      case 9:
      case 32:
      case 64:
      case 70:
      case 71:
        return 'payment.cancelled';
      case 10:
        return 'payment.waiting';
      default:
        return 'payment.unknown';
    }
  }

  /**
   * Webhook 처리
   */
  async process(
    feedback: PaymentFeedback,
    handlers: WebhookHandler
  ): Promise<'SUCCESS' | 'ERROR'> {
    try {
      // 1. 검증
      if (!this.validate(feedback)) {
        throw new Error('Invalid webhook credentials');
      }

      // 2. 중복 체크
      if (this.isDuplicate(feedback)) {
        console.warn('Duplicate webhook detected:', generateFeedbackKey(feedback));
        return 'SUCCESS'; // 중복은 성공으로 처리
      }

      // 3. 이벤트 타입 결정
      const eventType = this.getEventType(feedback);

      // 4. 핸들러 실행
      switch (eventType) {
        case 'payment.requested':
          if (handlers.onPaymentRequested) {
            await handlers.onPaymentRequested(feedback);
          }
          break;

        case 'payment.completed':
          if (handlers.onPaymentCompleted) {
            await handlers.onPaymentCompleted(feedback);
          }
          break;

        case 'payment.cancelled':
          if (handlers.onPaymentCancelled) {
            await handlers.onPaymentCancelled(feedback);
          }
          break;

        case 'payment.waiting':
          if (handlers.onPaymentWaiting) {
            await handlers.onPaymentWaiting(feedback);
          }
          break;

        default:
          console.warn('Unknown payment state:', feedback.pay_state);
      }

      // 5. 처리 완료 표시
      this.markAsProcessed(feedback);

      return 'SUCCESS';
    } catch (error) {
      console.error('Webhook processing error:', error);

      if (handlers.onError) {
        await handlers.onError(
          error instanceof Error ? error : new Error('Unknown error'),
          feedback
        );
      }

      return 'ERROR';
    }
  }
}

// ============================================
// Supabase Edge Function 헬퍼
// ============================================

/**
 * Supabase Edge Function용 Webhook 핸들러 생성
 *
 * 사용 예시:
 * ```typescript
 * // supabase/functions/payapp-webhook/index.ts
 * import { createWebhookHandler } from '@/lib/payappWebhook';
 *
 * const handler = createWebhookHandler({
 *   userid: Deno.env.get('PAYAPP_USER_ID')!,
 *   linkkey: Deno.env.get('PAYAPP_LINK_KEY')!,
 *   linkval: Deno.env.get('PAYAPP_LINK_VAL')!,
 * }, {
 *   onPaymentCompleted: async (feedback) => {
 *     // 결제 완료 처리
 *     await supabase.from('payments').insert({
 *       mul_no: feedback.mul_no,
 *       amount: parseInt(feedback.price),
 *       status: 'completed',
 *     });
 *   },
 * });
 *
 * Deno.serve(handler);
 * ```
 */
export function createWebhookHandler(
  credentials: PayAppCredentials,
  handlers: WebhookHandler
) {
  const processor = new PayAppWebhookProcessor(credentials);

  return async (req: Request): Promise<Response> => {
    try {
      // POST 메서드만 허용
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      // Content-Type 확인
      const contentType = req.headers.get('content-type');
      if (!contentType?.includes('application/x-www-form-urlencoded')) {
        return new Response('Invalid content type', { status: 400 });
      }

      // Body 파싱
      const text = await req.text();
      const params = new URLSearchParams(text);
      const body: Record<string, string> = {};
      params.forEach((value, key) => {
        body[key] = value;
      });

      // Webhook 처리
      const feedback = processor.parseWebhookRequest(body);
      const result = await processor.process(feedback, handlers);

      // PayApp은 HTTP 200 + "SUCCESS" 응답을 기대
      return new Response(result, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } catch (error) {
      console.error('Webhook handler error:', error);

      if (handlers.onError) {
        await handlers.onError(
          error instanceof Error ? error : new Error('Unknown error')
        );
      }

      // 에러 발생 시에도 200 반환 (PayApp 재시도 방지)
      return new Response('ERROR', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  };
}

// ============================================
// 로깅 헬퍼
// ============================================

export interface WebhookLog {
  mul_no: string;
  event_type: WebhookEventType;
  pay_state: number;
  pay_type?: number;
  price: string;
  feedback_data: PaymentFeedback;
  created_at: Date;
}

/**
 * Webhook 로그 생성
 */
export function createWebhookLog(
  feedback: PaymentFeedback,
  eventType: WebhookEventType
): WebhookLog {
  return {
    mul_no: feedback.mul_no,
    event_type: eventType,
    pay_state: feedback.pay_state,
    pay_type: feedback.pay_type,
    price: feedback.price,
    feedback_data: feedback,
    created_at: new Date(),
  };
}

/**
 * Supabase에 Webhook 로그 저장
 *
 * 사용 예시:
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * import { logWebhookToSupabase } from '@/lib/payappWebhook';
 *
 * const supabase = createClient(url, key);
 *
 * await logWebhookToSupabase(supabase, feedback, 'payment.completed');
 * ```
 */
export async function logWebhookToSupabase(
  supabase: any,
  feedback: PaymentFeedback,
  eventType: WebhookEventType
): Promise<void> {
  const log = createWebhookLog(feedback, eventType);

  const { error } = await supabase.from('payapp_webhook_logs').insert({
    mul_no: log.mul_no,
    event_type: log.event_type,
    pay_state: log.pay_state,
    pay_type: log.pay_type,
    price: log.price,
    feedback_data: log.feedback_data,
    created_at: log.created_at.toISOString(),
  });

  if (error) {
    console.error('Failed to log webhook:', error);
    throw error;
  }
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 결제 정보 추출
 */
export function extractPaymentInfo(feedback: PaymentFeedback) {
  return {
    mulNo: feedback.mul_no,
    goodName: feedback.goodname,
    price: parseInt(feedback.price),
    recvPhone: feedback.recvphone,
    payDate: feedback.pay_date,
    payType: feedback.pay_type,
    payState: feedback.pay_state,
    isCompleted: isPaymentCompleted(feedback),
    isCancelled: isPaymentCancelled(feedback),
    var1: feedback.var1,
    var2: feedback.var2,
    // 신용카드 정보
    cardInfo: feedback.card_name
      ? {
          cardName: feedback.card_name,
          cardNum: feedback.card_num,
          authCode: feedback.payauthcode,
          quota: feedback.card_quota,
        }
      : undefined,
    // 가상계좌 정보
    vbankInfo: feedback.vbank
      ? {
          bankName: feedback.vbank,
          accountNo: feedback.vbankno,
          depositor: feedback.depositor,
        }
      : undefined,
  };
}

/**
 * 결제 금액 검증
 */
export function validatePaymentAmount(
  feedback: PaymentFeedback,
  expectedAmount: number
): boolean {
  const actualAmount = parseInt(feedback.price);
  return actualAmount === expectedAmount;
}

/**
 * 결제 완료 여부 및 금액 검증
 */
export function verifyPayment(
  feedback: PaymentFeedback,
  expectedAmount: number
): boolean {
  return (
    isPaymentCompleted(feedback) &&
    validatePaymentAmount(feedback, expectedAmount)
  );
}
