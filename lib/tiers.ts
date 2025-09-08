// Tier definitions and access control
export type PlanTier = 'free' | 'professional' | 'business' | 'coaching' | 'super_admin'

export interface TierFeatures {
  monthlyMeetings: number | null; // null = unlimited
  customEventTypes: boolean;
  multipleCalendars: boolean;
  maxCalendarAccounts: number; // Max accounts per provider
  automatedReminders: boolean;
  preferenceEngine: boolean;
  profileDefaults: boolean;
  teamFeatures: boolean;
  integrations: boolean;
  groupRescheduling: boolean;
  maxGroupParticipants: number;
  recurringSessions: boolean;
  coachingPackages: boolean;
  paymentCollection: boolean;
  intakeForms: boolean;
  // Follow-up system features
  automatedFollowUps: boolean;
  maxFollowUps: number; // 0 = none, 1-3 = number allowed
  customFollowUpTemplates: boolean;
  followUpAnalytics: boolean;
}

export const TIER_FEATURES: Record<PlanTier, TierFeatures> = {
  free: {
    monthlyMeetings: 5,
    customEventTypes: false,
    multipleCalendars: false,
    maxCalendarAccounts: 1, // Only 1 account per provider
    automatedReminders: false,
    preferenceEngine: false,
    profileDefaults: false,
    teamFeatures: false,
    integrations: false,
    groupRescheduling: false,
    maxGroupParticipants: 2,
    recurringSessions: false,
    coachingPackages: false,
    paymentCollection: false,
    intakeForms: false,
    // Follow-up restrictions
    automatedFollowUps: false,
    maxFollowUps: 0,
    customFollowUpTemplates: false,
    followUpAnalytics: false,
  },
  professional: {
    monthlyMeetings: null,
    customEventTypes: true,
    multipleCalendars: true,
    maxCalendarAccounts: 3, // Up to 3 accounts per provider
    automatedReminders: true,
    preferenceEngine: true,
    profileDefaults: true,
    teamFeatures: false,
    integrations: false,
    groupRescheduling: false,
    maxGroupParticipants: 2,
    recurringSessions: false,
    coachingPackages: false,
    paymentCollection: false,
    intakeForms: false,
    // Follow-up features
    automatedFollowUps: true,
    maxFollowUps: 1, // Single follow-up at 48h
    customFollowUpTemplates: false,
    followUpAnalytics: false,
  },
  business: {
    monthlyMeetings: null,
    customEventTypes: true,
    multipleCalendars: true,
    maxCalendarAccounts: 5, // Up to 5 accounts per provider
    automatedReminders: true,
    preferenceEngine: true,
    profileDefaults: true,
    teamFeatures: true,
    integrations: true,
    groupRescheduling: false,
    maxGroupParticipants: 5,
    recurringSessions: false,
    coachingPackages: false,
    paymentCollection: false,
    intakeForms: false,
    // Advanced follow-up features
    automatedFollowUps: true,
    maxFollowUps: 2, // Up to 2 follow-ups
    customFollowUpTemplates: true,
    followUpAnalytics: true,
  },
  coaching: {
    monthlyMeetings: null,
    customEventTypes: true,
    multipleCalendars: true,
    maxCalendarAccounts: 10, // Up to 10 accounts per provider
    automatedReminders: true,
    preferenceEngine: true,
    profileDefaults: true,
    teamFeatures: true,
    integrations: true,
    groupRescheduling: true,
    maxGroupParticipants: 10,
    recurringSessions: true,
    coachingPackages: true,
    paymentCollection: true,
    intakeForms: true,
    automatedFollowUps: true,
    maxFollowUps: 5, // Coaching tier gets more follow-ups
    customFollowUpTemplates: true,
    followUpAnalytics: true,
  },
  super_admin: {
    monthlyMeetings: null,
    customEventTypes: true,
    multipleCalendars: true,
    maxCalendarAccounts: 999, // Unlimited accounts per provider
    automatedReminders: true,
    preferenceEngine: true,
    profileDefaults: true,
    teamFeatures: true,
    integrations: true,
    groupRescheduling: true,
    maxGroupParticipants: 999,
    recurringSessions: true,
    coachingPackages: true,
    paymentCollection: true,
    intakeForms: true,
    // All follow-up features
    automatedFollowUps: true,
    maxFollowUps: 3, // Maximum follow-ups
    customFollowUpTemplates: true,
    followUpAnalytics: true,
  },
}

export const TIER_PRICING = {
  free: 0,
  professional: 15,
  business: 35,
  coaching: 65,
  super_admin: 0,
}

export function getTierFeatures(plan: PlanTier): TierFeatures {
  return TIER_FEATURES[plan] || TIER_FEATURES.free
}

export function hasAccess(userPlan: PlanTier, feature: keyof TierFeatures): boolean {
  const features = getTierFeatures(userPlan)
  return !!features[feature]
}

export function canCreateGroupMeeting(userPlan: PlanTier, participantCount: number): boolean {
  const features = getTierFeatures(userPlan)
  return participantCount <= features.maxGroupParticipants
}

export function canAddMoreCalendars(userPlan: PlanTier, currentCount: number, provider: string): { canAdd: boolean; limit: number; message?: string } {
  const features = getTierFeatures(userPlan)
  const limit = features.maxCalendarAccounts
  const canAdd = currentCount < limit
  
  if (!canAdd) {
    const nextTier = userPlan === 'free' ? 'professional' : 
                    userPlan === 'professional' ? 'business' : 
                    userPlan === 'business' ? 'coaching' : null
    
    const message = nextTier 
      ? `You've reached your ${provider} account limit (${limit}). Upgrade to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} ($${TIER_PRICING[nextTier as PlanTier]}/month) for more accounts.`
      : `You've reached the maximum ${provider} account limit (${limit}).`
    
    return { canAdd: false, limit, message }
  }
  
  return { canAdd: true, limit }
}

export function getUpgradeMessage(currentPlan: PlanTier, feature: string): string {
  const messages: Record<PlanTier, string> = {
    free: `Upgrade to Professional ($${TIER_PRICING.professional}/month) to unlock ${feature}`,
    professional: `Upgrade to Business ($${TIER_PRICING.business}/month) to unlock ${feature}`,
    business: `Upgrade to Coaching ($${TIER_PRICING.coaching}/month) to unlock ${feature}`,
    coaching: 'You have access to all features!',
    super_admin: 'You have access to all features!'
  }
  
  return messages[currentPlan] || 'Upgrade your plan to unlock this feature'
}