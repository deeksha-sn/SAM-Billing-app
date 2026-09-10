export interface BillFieldsConfig {
  showLogo: boolean;
  showCompanyContact: boolean;
  showDocNumber: boolean;
  showDate: boolean;
  showCustomerName: boolean;
  showBillingAddress: boolean;
  showShippingAddress: boolean;
  showGstin: boolean;
  showPlaceOfSupply: boolean;
  showHsn: boolean;
  showItemName: boolean;
  showDescription: boolean;
  showSerialNumber: boolean;
  showQuantity: boolean;
  showFreeQuantity: boolean;
  showUnit: boolean;
  showRate: boolean;
  showDiscount: boolean;
  showGstRate: boolean;
  showCgst: boolean;
  showSgst: boolean;
  showIgst: boolean;
  showTaxAmount: boolean;
  showTotalAmount: boolean;
  showAmountInWords: boolean;
  showPaymentMode: boolean;
  showPaymentTerms: boolean;
  showDueDate: boolean;
  showPoNumber: boolean;
  showPoDate: boolean;
  showEwayBill: boolean;
  showTransport: boolean;
  showDeliveryLocation: boolean;
  showVehicleNumber: boolean;
  showNotes: boolean;
  showBankDetails: boolean;
  showTerms: boolean;
  showSignature: boolean;
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
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showGstin: true,
  showPlaceOfSupply: true,
  showHsn: true,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showPaymentMode: true,
  showPaymentTerms: true,
  showDueDate: true,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: true,
  showNotes: true,
  showBankDetails: true,
  showTerms: true,
  showSignature: true,
};

export const DEFAULT_QUOTATION_FIELDS: BillFieldsConfig = {
  showLogo: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showGstin: true,
  showPlaceOfSupply: true,
  showHsn: true,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showPaymentMode: false,
  showPaymentTerms: true,
  showDueDate: true,
  showPoNumber: false,
  showPoDate: false,
  showEwayBill: false,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: false,
  showNotes: true,
  showBankDetails: true,
  showTerms: true,
  showSignature: true,
};

export const DEFAULT_CHALLAN_FIELDS: BillFieldsConfig = {
  showLogo: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showGstin: false,
  showPlaceOfSupply: true,
  showHsn: false,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: true,
  showUnit: true,
  showRate: false,
  showDiscount: false,
  showGstRate: false,
  showCgst: false,
  showSgst: false,
  showIgst: false,
  showTaxAmount: false,
  showTotalAmount: false,
  showAmountInWords: false,
  showPaymentMode: false,
  showPaymentTerms: false,
  showDueDate: false,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: true,
  showNotes: true,
  showBankDetails: false,
  showTerms: true,
  showSignature: true,
};

export const DEFAULT_PURCHASE_FIELDS: BillFieldsConfig = {
  showLogo: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: false,
  showGstin: true,
  showPlaceOfSupply: true,
  showHsn: true,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showPaymentMode: true,
  showPaymentTerms: true,
  showDueDate: true,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: false,
  showNotes: true,
  showBankDetails: true,
  showTerms: true,
  showSignature: true,
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
