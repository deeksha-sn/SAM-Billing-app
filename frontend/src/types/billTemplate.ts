export interface BillFieldsConfig {
  // Company / Header
  showLogo?: boolean;
  showCompanyName?: boolean;
  showCompanyAddress?: boolean;
  showCompanyPhone?: boolean;
  showCompanyEmail?: boolean;
  showCompanyWebsite?: boolean;
  showCompanyGstin?: boolean;
  showCompanyContact?: boolean;

  // Document Details
  showDocNumber?: boolean;
  showDocDate?: boolean;
  showDate?: boolean;
  showDueDate?: boolean;
  showPaymentTerms?: boolean;
  showPaymentMode?: boolean;
  showRefNumber?: boolean;
  showPoNumber?: boolean;
  showPoDate?: boolean;
  showEwayBill?: boolean;

  // Customer / Party
  showCustomerName?: boolean;
  showCustomerPhone?: boolean;
  showCustomerGstin?: boolean;
  showGstin?: boolean;
  showBillingAddress?: boolean;
  showShippingAddress?: boolean;
  showCustomerState?: boolean;
  showCustomerStateCode?: boolean;
  showPlaceOfSupply?: boolean;

  // Farmer / Contact
  showFarmerName?: boolean;
  showFarmerPhone?: boolean;
  showFarmerAddress?: boolean;
  showFarmerPincode?: boolean;

  // Item Table
  showItemName?: boolean;
  showDescription?: boolean;
  showHsn?: boolean;
  showSerialNumber?: boolean;
  showQuantity?: boolean;
  showFreeQuantity?: boolean;
  showUnit?: boolean;
  showRate?: boolean;
  showDiscount?: boolean;
  showGstRate?: boolean;
  showTaxableAmount?: boolean;
  showCgst?: boolean;
  showSgst?: boolean;
  showIgst?: boolean;
  showTaxAmount?: boolean;
  showItemTotal?: boolean;
  showTotalAmount?: boolean;

  // Totals
  showSubtotal?: boolean;
  showDiscountTotal?: boolean;
  showCgstTotal?: boolean;
  showSgstTotal?: boolean;
  showIgstTotal?: boolean;
  showTotalTax?: boolean;
  showRoundOff?: boolean;
  showGrandTotal?: boolean;
  showAmountInWords?: boolean;
  showBalanceDue?: boolean;

  // Transport / Delivery
  showTransportName?: boolean;
  showTransport?: boolean;
  showDeliveryLocation?: boolean;
  showVehicleNumber?: boolean;
  showDeliveryDate?: boolean;
  showReasonForDelivery?: boolean;
  showDispatchDetails?: boolean;

  // Payment / Bank
  showBankDetails?: boolean;
  showBankName?: boolean;
  showAccountName?: boolean;
  showAccountNumber?: boolean;
  showIfsc?: boolean;
  showUpiId?: boolean;
  showPaymentInstructions?: boolean;

  // Footer
  showNotes?: boolean;
  showTerms?: boolean;
  showCustomerSignature?: boolean;
  showAuthSignature?: boolean;
  showSignature?: boolean;
  showCompanySeal?: boolean;
}

export interface BillTemplate {
  id: string;
  name: string;
  documentType: string;
  isDefault: boolean;
  fieldsConfig: string | BillFieldsConfig;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_INVOICE_FIELDS: BillFieldsConfig = {
  showLogo: true,
  showCompanyName: true,
  showCompanyAddress: true,
  showCompanyPhone: true,
  showCompanyEmail: true,
  showCompanyWebsite: true,
  showCompanyGstin: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDocDate: true,
  showDate: true,
  showDueDate: true,
  showPaymentTerms: true,
  showPaymentMode: true,
  showRefNumber: true,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showCustomerGstin: true,
  showGstin: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showCustomerState: true,
  showCustomerStateCode: true,
  showPlaceOfSupply: true,
  showFarmerName: true,
  showFarmerPhone: true,
  showFarmerAddress: true,
  showFarmerPincode: true,
  showItemName: true,
  showDescription: true,
  showHsn: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showTaxableAmount: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showItemTotal: true,
  showTotalAmount: true,
  showSubtotal: true,
  showDiscountTotal: true,
  showCgstTotal: true,
  showSgstTotal: true,
  showIgstTotal: true,
  showTotalTax: true,
  showRoundOff: true,
  showGrandTotal: true,
  showAmountInWords: true,
  showBalanceDue: true,
  showTransportName: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: true,
  showDeliveryDate: true,
  showReasonForDelivery: true,
  showDispatchDetails: true,
  showBankDetails: true,
  showBankName: true,
  showAccountName: true,
  showAccountNumber: true,
  showIfsc: true,
  showUpiId: true,
  showPaymentInstructions: true,
  showNotes: true,
  showTerms: true,
  showCustomerSignature: true,
  showAuthSignature: true,
  showSignature: true,
  showCompanySeal: true,
};

export const DEFAULT_QUOTATION_FIELDS: BillFieldsConfig = {
  ...DEFAULT_INVOICE_FIELDS,
  showPaymentMode: false,
  showPoNumber: false,
  showPoDate: false,
  showEwayBill: false,
  showVehicleNumber: false,
};

export const DEFAULT_CHALLAN_FIELDS: BillFieldsConfig = {
  ...DEFAULT_INVOICE_FIELDS,
  showCompanyGstin: false,
  showHsn: false,
  showRate: false,
  showDiscount: false,
  showGstRate: false,
  showCgst: false,
  showSgst: false,
  showIgst: false,
  showTaxableAmount: false,
  showTaxAmount: false,
  showItemTotal: false,
  showTotalAmount: false,
  showSubtotal: false,
  showDiscountTotal: false,
  showCgstTotal: false,
  showSgstTotal: false,
  showIgstTotal: false,
  showTotalTax: false,
  showGrandTotal: false,
  showAmountInWords: false,
  showBalanceDue: false,
  showBankDetails: false,
  showPaymentMode: false,
  showFreeQuantity: true,
  showReasonForDelivery: true,
  showVehicleNumber: true,
  showTransport: true,
};

export const DEFAULT_PURCHASE_FIELDS: BillFieldsConfig = {
  ...DEFAULT_INVOICE_FIELDS,
};

export function getDefaultFieldsForDocType(docType: string): BillFieldsConfig {
  switch (docType.toUpperCase()) {
    case 'QUOTATION':
      return { ...DEFAULT_QUOTATION_FIELDS };
    case 'DELIVERY_CHALLAN':
      return { ...DEFAULT_CHALLAN_FIELDS };
    case 'PURCHASE':
      return { ...DEFAULT_PURCHASE_FIELDS };
    default:
      return { ...DEFAULT_INVOICE_FIELDS };
  }
}
