/**
 * PayApp 결제 연동 React Hook
 * @see https://www.payapp.kr/dev_center/dev_center01.html
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PaymentRequestParams,
  PaymentRequestResponse,
  RebillRegistParams,
  RebillRegistResponse,
  PayAppError,
  PayAppCredentials,
} from '../types';
import {
  loadPayAppSDK,
  initPayAppSDK,
  requestPaymentWithSDK,
  requestRecurringPaymentWithSDK,
  createPayAppClient,
  isPayAppError,
  getPayAppErrorMessage,
} from '../lib/client';

// ============================================
// Hook 타입 정의
// ============================================

export interface UsePayAppOptions {
  credentials: PayAppCredentials;
  shopname?: string;
  onSuccess?: (response: PaymentRequestResponse) => void;
  onError?: (error: PayAppError) => void;
  autoLoadSDK?: boolean;
}

export interface UsePayAppReturn {
  // 상태
  isLoading: boolean;
  isSDKLoaded: boolean;
  error: PayAppError | null;

  // 결제 요청 (JS SDK)
  requestPayment: (params: Omit<PaymentRequestParams, 'userid' | 'shopname'>) => void;

  // 정기결제 요청 (JS SDK)
  requestRecurringPayment: (
    params: Omit<RebillRegistParams, 'cmd' | 'userid'>
  ) => void;

  // 결제 요청 (REST API)
  requestPaymentAPI: (
    params: Omit<PaymentRequestParams, 'userid'>
  ) => Promise<PaymentRequestResponse>;

  // 정기결제 요청 (REST API)
  requestRecurringPaymentAPI: (
    params: Omit<RebillRegistParams, 'cmd' | 'userid'>
  ) => Promise<RebillRegistResponse>;

  // SDK 수동 로드
  loadSDK: () => Promise<void>;

  // 에러 초기화
  clearError: () => void;
}

// ============================================
// usePayApp Hook
// ============================================

/**
 * PayApp 결제 연동 Hook
 *
 * 사용 예시:
 * ```tsx
 * function PaymentButton() {
 *   const { requestPayment, isLoading, error } = usePayApp({
 *     userid: 'your_userid',
 *     shopname: '상점명',
 *     onSuccess: (response) => {
 *       console.log('결제 요청 성공:', response);
 *     },
 *     onError: (error) => {
 *       console.error('결제 요청 실패:', error);
 *     },
 *   });
 *
 *   const handlePayment = () => {
 *     requestPayment({
 *       goodname: '상품명',
 *       price: 10000,
 *       recvphone: '01012341234',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handlePayment} disabled={isLoading}>
 *       {isLoading ? '처리 중...' : '결제하기'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePayApp(options: UsePayAppOptions): UsePayAppReturn {
  const {
    credentials,
    shopname = 'FlashLingo',
    onSuccess,
    onError,
    autoLoadSDK = true,
  } = options;

  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PayAppError | null>(null);

  const clientRef = useRef(createPayAppClient(credentials));

  // SDK 로드
  const loadSDK = useCallback(async () => {
    try {
      setIsLoading(true);
      await loadPayAppSDK();
      initPayAppSDK(credentials.userid, shopname);
      setIsSDKLoaded(true);
    } catch (err) {
      const error = err as PayAppError;
      setError(error);
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
    }
  }, [credentials.userid, shopname, onError]);

  // 자동 SDK 로드
  useEffect(() => {
    if (autoLoadSDK && !isSDKLoaded) {
      loadSDK();
    }
  }, [autoLoadSDK, isSDKLoaded, loadSDK]);

  // 에러 초기화
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 결제 요청 (JS SDK)
  const requestPayment = useCallback(
    (params: Omit<PaymentRequestParams, 'userid' | 'shopname'>) => {
      try {
        if (!isSDKLoaded) {
          throw new Error('PayApp SDK is not loaded');
        }

        clearError();
        requestPaymentWithSDK(params);
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
      }
    },
    [isSDKLoaded, clearError, onError]
  );

  // 정기결제 요청 (JS SDK)
  const requestRecurringPayment = useCallback(
    (params: Omit<RebillRegistParams, 'cmd' | 'userid'>) => {
      try {
        if (!isSDKLoaded) {
          throw new Error('PayApp SDK is not loaded');
        }

        clearError();
        requestRecurringPaymentWithSDK(params);
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
      }
    },
    [isSDKLoaded, clearError, onError]
  );

  // 결제 요청 (REST API)
  const requestPaymentAPI = useCallback(
    async (
      params: Omit<PaymentRequestParams, 'userid'>
    ): Promise<PaymentRequestResponse> => {
      try {
        setIsLoading(true);
        clearError();

        const response = await clientRef.current.requestPayment(params);

        if (onSuccess) onSuccess(response);
        return response;
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, onSuccess, onError]
  );

  // 정기결제 요청 (REST API)
  const requestRecurringPaymentAPI = useCallback(
    async (
      params: Omit<RebillRegistParams, 'cmd' | 'userid'>
    ): Promise<RebillRegistResponse> => {
      try {
        setIsLoading(true);
        clearError();

        const response =
          await clientRef.current.registerRecurringPayment(params);

        return response;
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, onError]
  );

  return {
    isLoading,
    isSDKLoaded,
    error,
    requestPayment,
    requestRecurringPayment,
    requestPaymentAPI,
    requestRecurringPaymentAPI,
    loadSDK,
    clearError,
  };
}

// ============================================
// usePayAppBilling Hook (등록결제)
// ============================================

export interface UsePayAppBillingOptions {
  credentials: PayAppCredentials;
  onSuccess?: (encBill: string) => void;
  onError?: (error: PayAppError) => void;
}

export interface UsePayAppBillingReturn {
  isLoading: boolean;
  error: PayAppError | null;

  // 등록결제 등록
  registerBill: (params: {
    cardNo: string;
    expMonth: string;
    expYear: string;
    buyerAuthNo: string;
    cardPw: string;
    buyerPhone: string;
    buyerName: string;
    buyerId?: string;
  }) => Promise<string | undefined>;

  // 등록결제 삭제
  deleteBill: (encBill: string) => Promise<void>;

  // 등록결제로 결제
  payWithBill: (params: {
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
  }) => Promise<void>;

  clearError: () => void;
}

/**
 * PayApp 등록결제(BILL) Hook
 *
 * 사용 예시:
 * ```tsx
 * function BillingManagement() {
 *   const { registerBill, payWithBill, isLoading } = usePayAppBilling({
 *     onSuccess: (encBill) => {
 *       console.log('카드 등록 성공:', encBill);
 *     },
 *   });
 *
 *   const handleRegister = async () => {
 *     const encBill = await registerBill({
 *       cardNo: '1234567890123456',
 *       expMonth: '12',
 *       expYear: '25',
 *       buyerAuthNo: '900101',
 *       cardPw: '12',
 *       buyerPhone: '01012341234',
 *       buyerName: '홍길동',
 *     });
 *
 *     if (encBill) {
 *       // 등록된 카드로 결제
 *       await payWithBill({
 *         encBill,
 *         goodname: '상품명',
 *         price: 10000,
 *         recvphone: '01012341234',
 *       });
 *     }
 *   };
 * }
 * ```
 */
export function usePayAppBilling(
  options: UsePayAppBillingOptions
): UsePayAppBillingReturn {
  const { credentials, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PayAppError | null>(null);

  const clientRef = useRef(createPayAppClient(credentials));

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const registerBill = useCallback(
    async (params: {
      cardNo: string;
      expMonth: string;
      expYear: string;
      buyerAuthNo: string;
      cardPw: string;
      buyerPhone: string;
      buyerName: string;
      buyerId?: string;
    }): Promise<string | undefined> => {
      try {
        setIsLoading(true);
        clearError();

        const response = await clientRef.current.registerBill(params);

        if (response.encBill && onSuccess) {
          onSuccess(response.encBill);
        }

        return response.encBill;
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, onSuccess, onError]
  );

  const deleteBill = useCallback(
    async (encBill: string): Promise<void> => {
      try {
        setIsLoading(true);
        clearError();

        await clientRef.current.deleteBill({ encBill });
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, onError]
  );

  const payWithBill = useCallback(
    async (params: {
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
    }): Promise<void> => {
      try {
        setIsLoading(true);
        clearError();

        await clientRef.current.payWithBill(params);
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, onError]
  );

  return {
    isLoading,
    error,
    registerBill,
    deleteBill,
    payWithBill,
    clearError,
  };
}

// ============================================
// usePayAppCancel Hook (결제 취소)
// ============================================

export interface UsePayAppCancelOptions {
  credentials: PayAppCredentials;
  onSuccess?: () => void;
  onError?: (error: PayAppError) => void;
}

export interface UsePayAppCancelReturn {
  isLoading: boolean;
  error: PayAppError | null;

  cancelPayment: (params: {
    mul_no: string;
    price?: number;
    memo?: string;
  }) => Promise<void>;

  clearError: () => void;
}

/**
 * PayApp 결제 취소 Hook
 *
 * 사용 예시:
 * ```tsx
 * function PaymentCancelButton({ mulNo }: { mulNo: string }) {
 *   const { cancelPayment, isLoading } = usePayAppCancel({
 *     onSuccess: () => {
 *       alert('결제가 취소되었습니다.');
 *     },
 *   });
 *
 *   const handleCancel = async () => {
 *     await cancelPayment({
 *       mul_no: mulNo,
 *       memo: '고객 요청',
 *     });
 *   };
 * }
 * ```
 */
export function usePayAppCancel(
  options: UsePayAppCancelOptions
): UsePayAppCancelReturn {
  const { credentials, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PayAppError | null>(null);

  const clientRef = useRef(createPayAppClient(credentials));

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelPayment = useCallback(
    async (params: {
      mul_no: string;
      price?: number;
      memo?: string;
    }): Promise<void> => {
      try {
        setIsLoading(true);
        clearError();

        await clientRef.current.cancelPayment(params);

        if (onSuccess) onSuccess();
      } catch (err) {
        const error = err as PayAppError;
        setError(error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, onSuccess, onError]
  );

  return {
    isLoading,
    error,
    cancelPayment,
    clearError,
  };
}

// ============================================
// 유틸리티 Hook
// ============================================

/**
 * PayApp 에러 메시지 Hook
 */
export function usePayAppErrorMessage(error: PayAppError | Error | null): string | null {
  if (!error) return null;
  if (!isPayAppError(error)) return (error as Error).message;
  return error.code ? getPayAppErrorMessage(error.code) : error.errorMessage || error.message;
}
