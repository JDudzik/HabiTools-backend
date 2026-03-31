
export const stripeWebhookCustomerSubscriptionUpdated = async ({ eventData, saveUserSub }) => {
  await saveUserSub({
    updated_at: eventData?.created * 1000,
    sub_expires: (eventData?.current_period_end * 1000 ) + (3 * 24 * 60 * 60 * 1000), // Add 3 days for grace period.
    sub_purchased: eventData?.current_period_start * 1000,
    is_sub_active: eventData?.status === 'active',
  });
};