export const SERVICE_TYPES = [
  "product_demo",
  "technical_support",
  "purchase_consultation",
  "device_setup",
  "repair_assessment",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  product_demo: "Product Demonstration",
  technical_support: "Technical Support Session",
  purchase_consultation: "Purchase Consultation",
  device_setup: "Device Setup Assistance",
  repair_assessment: "Repair Assessment",
};

export const BUSINESS_HOURS = {
  start: 9,
  end: 18,
} as const;
