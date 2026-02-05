// Mock Data for Analytics Dashboard
// Simulates data from Shopify (Sales), Meta (Ads), and Klaviyo (Email)
// Replace with real API integrations when ready

// ============================================================================
// SHOPIFY - Revenue & Sales Data
// ============================================================================

export const revenueData = [
  { month: "Sep", revenue: 0, orders: 0, aov: 0 },
  { month: "Oct", revenue: 2400, orders: 32, aov: 75 },
  { month: "Nov", revenue: 8200, orders: 98, aov: 83.67 },
  { month: "Dec", revenue: 15600, orders: 178, aov: 87.64 },
  { month: "Jan", revenue: 12400, orders: 156, aov: 79.49 },
  { month: "Feb", revenue: 18200, orders: 210, aov: 86.67 },
]

export const revenueByChannel = [
  { channel: "Direct", revenue: 28400, percentage: 42 },
  { channel: "Meta Ads", revenue: 18900, percentage: 28 },
  { channel: "Organic Search", revenue: 10800, percentage: 16 },
  { channel: "Email", revenue: 6100, percentage: 9 },
  { channel: "Referral", revenue: 3400, percentage: 5 },
]

export const topProducts = [
  { name: "Ashwagandha Blend", units: 412, revenue: 24720 },
  { name: "Sleep Support Complex", units: 287, revenue: 17220 },
  { name: "Focus & Energy", units: 198, revenue: 13860 },
  { name: "Gut Health Probiotic", units: 156, revenue: 10920 },
]

// ============================================================================
// META ADS - Acquisition & Performance Data
// ============================================================================

export const acquisitionData = [
  { month: "Sep", cac: 0, roas: 0, adSpend: 0 },
  { month: "Oct", cac: 45, roas: 1.8, adSpend: 1440 },
  { month: "Nov", cac: 38, roas: 2.4, adSpend: 3724 },
  { month: "Dec", cac: 32, roas: 2.9, adSpend: 5696 },
  { month: "Jan", cac: 28, roas: 3.2, adSpend: 4368 },
  { month: "Feb", cac: 24, roas: 3.8, adSpend: 5040 },
]

export const adPerformance = {
  totalSpend: 20268,
  totalConversions: 674,
  avgCac: 30.07,
  avgRoas: 2.82,
  impressions: 1240000,
  clicks: 31000,
  ctr: 2.5,
}

export const campaignData = [
  { name: "Brand Awareness", spend: 4200, conversions: 89, roas: 2.1 },
  { name: "Retargeting", spend: 3100, conversions: 156, roas: 4.2 },
  { name: "Lookalike - Health", spend: 5800, conversions: 198, roas: 3.1 },
  { name: "Lookalike - Fitness", spend: 4100, conversions: 142, roas: 2.8 },
  { name: "Interest - Wellness", spend: 3068, conversions: 89, roas: 2.4 },
]

// ============================================================================
// KLAVIYO - Email & Customer Data
// ============================================================================

export const emailMetrics = [
  { month: "Sep", subscribers: 0, openRate: 0, clickRate: 0, revenue: 0 },
  { month: "Oct", subscribers: 420, openRate: 42, clickRate: 4.8, revenue: 480 },
  { month: "Nov", subscribers: 1250, openRate: 45, clickRate: 5.2, revenue: 1640 },
  { month: "Dec", subscribers: 2100, openRate: 48, clickRate: 5.8, revenue: 3120 },
  { month: "Jan", subscribers: 2890, openRate: 44, clickRate: 5.1, revenue: 2480 },
  { month: "Feb", subscribers: 3650, openRate: 46, clickRate: 5.4, revenue: 3640 },
]

export const emailFlows = [
  { name: "Welcome Series", sent: 3650, openRate: 58, clickRate: 12, revenue: 4200 },
  { name: "Abandoned Cart", sent: 890, openRate: 52, clickRate: 18, revenue: 2800 },
  { name: "Post-Purchase", sent: 674, openRate: 62, clickRate: 8, revenue: 1400 },
  { name: "Win-Back", sent: 420, openRate: 28, clickRate: 4, revenue: 680 },
]

// ============================================================================
// CUSTOMER METRICS - Combined/Calculated
// ============================================================================

export const customerMetrics = {
  totalCustomers: 674,
  ltv: 245,
  avgOrderValue: 84.50,
  avgOrdersPerCustomer: 2.9,
  repeatPurchaseRate: 42,
  churnRate: 8,
}

export const ltvBySegment = [
  { segment: "VIP (Top 10%)", ltv: 580, customers: 67 },
  { segment: "Loyal (10-25%)", ltv: 320, customers: 101 },
  { segment: "Regular (25-50%)", ltv: 195, customers: 168 },
  { segment: "Occasional (50-75%)", ltv: 120, customers: 169 },
  { segment: "One-Time (75-100%)", ltv: 85, customers: 169 },
]

export const cohortRetention = [
  { cohort: "Oct 2025", month1: 100, month2: 45, month3: 32, month4: 28 },
  { cohort: "Nov 2025", month1: 100, month2: 48, month3: 35, month4: null },
  { cohort: "Dec 2025", month1: 100, month2: 52, month3: null, month4: null },
  { cohort: "Jan 2026", month1: 100, month2: null, month3: null, month4: null },
]

// ============================================================================
// SUMMARY KPIs
// ============================================================================

export const summaryKPIs = {
  totalRevenue: 56800,
  revenueGrowth: 46.8, // vs last period
  totalOrders: 674,
  avgOrderValue: 84.27,
  cac: 24,
  cacTrend: -14.3, // vs last month (negative = improving)
  ltv: 245,
  ltvCacRatio: 10.2,
  roas: 3.8,
  roasTrend: 18.8, // vs last month
  emailRevenue: 11360,
  emailRevenuePercentage: 20,
}

// ============================================================================
// DATA SOURCE METADATA
// ============================================================================

export const dataSources = {
  shopify: {
    name: "Shopify",
    status: "mock",
    lastSync: null,
    description: "Revenue, orders, and product sales",
  },
  meta: {
    name: "Meta Ads",
    status: "mock",
    lastSync: null,
    description: "Ad spend, CAC, and ROAS metrics",
  },
  klaviyo: {
    name: "Klaviyo",
    status: "mock",
    lastSync: null,
    description: "Email performance and subscriber data",
  },
}
