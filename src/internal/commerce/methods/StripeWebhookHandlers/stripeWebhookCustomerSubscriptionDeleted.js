
export const stripeWebhookCustomerSubscriptionDeleted = async ({ eventData, saveUserSub }) => {
  await saveUserSub({
    updated_at: eventData?.created * 1000,
    sub_expires: (eventData?.canceled_at * 1000 ),
    is_sub_active: eventData?.status === 'active',
  });
};