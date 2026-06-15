export const NOTIFICATION_TEMPLATES = {
  // 1. Inactivity & Engagement
  USER_INACTIVITY_7_DAYS: {
    title: "We miss you! 🚲",
    message: "It's been a week since your last ride. Grab a BHAR Bike today and escape the traffic!",
    type: "promo"
  },
  USER_INACTIVITY_30_DAYS: {
    title: "Come back and ride! 🎁",
    message: "Get 15% off on your next ride. Use code COMEBACK15 at checkout.",
    type: "promo"
  },
  WEEKEND_RIDE_PROMO: {
    title: "Weekend is here! ☀️",
    message: "Plan a weekend getaway. Check out the nearest hub for available bikes.",
    type: "promo"
  },
  MORNING_COMMUTE: {
    title: "Daily Commute Sorted? 🚀",
    message: "Beat the morning rush hour. Unlock a BHAR Bike near you for a swift ride.",
    type: "promo"
  },

  // 2. KYC Verification
  KYC_SUBMITTED: {
    title: "KYC Documents Under Review 📄",
    message: "We have received your KYC documents. Verification usually takes less than 2 hours.",
    type: "kyc"
  },
  KYC_APPROVED: {
    title: "KYC Approved! 🎉",
    message: "Your documents are verified. You are now fully approved to rent and ride!",
    type: "kyc"
  },
  KYC_REJECTED: {
    title: "KYC Verification Failed ❌",
    message: "Your KYC was rejected: {reason}. Please re-upload clear documents in the app.",
    type: "kyc"
  },

  // 3. Wallet & Payments
  LOW_WALLET_BALANCE: {
    title: "Low Wallet Balance ⚠️",
    message: "Your wallet balance is below ₹{minBalance}. Top up now to ensure uninterrupted rides.",
    type: "wallet"
  },
  WALLET_RECHARGE_SUCCESS: {
    title: "Wallet Recharge Successful 💰",
    message: "₹{amount} has been successfully added to your wallet balance.",
    type: "wallet"
  },
  PAYMENT_FAILED: {
    title: "Payment Transaction Failed ❌",
    message: "Your payment of ₹{amount} was unsuccessful. If money was deducted, it will be refunded.",
    type: "wallet"
  },
  REFUND_PROCESSED: {
    title: "Refund Processed 🔄",
    message: "A refund of ₹{amount} has been processed back to your payment source.",
    type: "wallet"
  },

  // 4. Subscription Management
  SUBSCRIPTION_ACTIVATED: {
    title: "Subscription Activated! 🚲",
    message: "Your {planName} subscription has been activated! Enjoy unlimited rides and premium modules.",
    type: "success"
  },
  SUBSCRIPTION_EXPIRY_WARNING: {
    title: "Subscription Expiring Soon! ⚠️",
    message: "Your plan expires in 2 days. Recharge to continue riding.",
    type: "warning"
  },
  SUBSCRIPTION_EXPIRED: {
    title: "Subscription Expired 🔴",
    message: "Your subscription has expired. Renew today to unlock GPS and battery controls.",
    type: "warning"
  },
  AUTO_RENEW_FAILED: {
    title: "Subscription Auto-Renewal Failed ⚠️",
    message: "We couldn't renew your subscription automatically. Please check your payment methods.",
    type: "warning"
  },

  // 5. Rentals & Bookings
  BOOKING_CONFIRMED: {
    title: "Booking Confirmed! 🎫",
    message: "Bike {bikeName} is reserved for you. Head to the pickup hub to start your ride.",
    type: "order"
  },
  RIDE_STARTED: {
    title: "Ride Started! 🟢",
    message: "Your ride on {bikeName} has started. Drive safely and wear a helmet!",
    type: "order"
  },
  RIDE_ENDED: {
    title: "Ride Completed Successfully! 🏁",
    message: "Thanks for riding with us! Total duration: {duration} mins. Wallet charged: ₹{cost}.",
    type: "order"
  },
  RENTAL_OVERTIME_WARNING: {
    title: "Rental Overtime Alert ⏰",
    message: "Your rental period has exceeded. Late fee charges of ₹{lateFee}/hour are now applicable.",
    type: "warning"
  },

  // 6. Bike Safety & Remote Controls
  BIKE_LOW_BATTERY: {
    title: "Low Battery Warning 🔋",
    message: "Your ride's battery level is at {battery}%. Please head to the nearest hub to swap bikes.",
    type: "warning"
  },
  BIKE_LOCKED_REMOTE: {
    title: "Bike Locked Successfully 🔒",
    message: "Your bike has been locked remotely. Your ride session is currently paused.",
    type: "info"
  },
  BIKE_UNLOCKED_REMOTE: {
    title: "Bike Unlocked Successfully 🔓",
    message: "Your bike has been unlocked remotely. Safe travels!",
    type: "info"
  },
  GEOFENCE_BREACH: {
    title: "Out of Bounds Warning 🚨",
    message: "You have crossed the designated hub boundary. Please return to avoid extra penalties.",
    type: "warning"
  },

  // 7. Marketing & Promotional
  NEW_HUB_OPENED: {
    title: "New Hub Opened Near You! 📍",
    message: "We just opened a new hub at {locationName}. Getting a bike is now even easier!",
    type: "promo"
  },
  PROMO_COUPON: {
    title: "Special Offer For You! 🎟️",
    message: "Enjoy {discount}% off on your next weekly subscription. Use code {code}.",
    type: "promo"
  }
};
