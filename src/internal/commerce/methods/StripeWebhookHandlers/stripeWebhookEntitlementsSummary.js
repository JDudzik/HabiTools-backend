
export const stripeWebhookEntitlementsSummary = async ({ eventData, saveUserSub }) => {
  const entitlementKeys = eventData?.entitlements?.data?.map?.(entitlement => entitlement?.lookup_key);
  await saveUserSub({
    entitlements: entitlementKeys ? JSON.stringify(entitlementKeys) : null,
  });
};