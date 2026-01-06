/**
 * @sanghyun-org/payapp-react
 * PayApp payment integration library for React
 */

// Types
export * from './types';

// Client
export { PayAppClient, createPayAppClient } from './lib/client';

// Webhook (선택적 import)
// import { createWebhookHandler } from '@sanghyun-org/payapp-react/webhook'

// Hooks
export {
  usePayApp,
  usePayAppBilling,
  usePayAppCancel,
  usePayAppErrorMessage,
} from './hooks';

export type {
  UsePayAppOptions,
  UsePayAppReturn,
  UsePayAppBillingOptions,
  UsePayAppBillingReturn,
  UsePayAppCancelOptions,
  UsePayAppCancelReturn,
} from './hooks';

// Utils
export {
  loadPayAppSDK,
  initPayAppSDK,
  requestPaymentWithSDK,
  requestRecurringPaymentWithSDK,
  validateFeedback,
  generateFeedbackKey,
  isPaymentCompleted,
  isPaymentCancelled,
  isPayAppError,
  getPayAppErrorMessage,
  PAYAPP_ERROR_MESSAGES,
} from './lib/client';
