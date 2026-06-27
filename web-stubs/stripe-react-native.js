const React = require('react');

const CardField = () => null;

const useStripe = () => ({
  confirmPayment: async () => ({ error: { message: 'Not available on web' } }),
  createPaymentMethod: async () => ({ error: { message: 'Not available on web' } }),
  initPaymentSheet: async () => ({ error: { message: 'Not available on web' } }),
  presentPaymentSheet: async () => ({ error: { message: 'Not available on web' } }),
});

const StripeProvider = ({ children }) => children;

module.exports = {
  CardField,
  useStripe,
  StripeProvider,
};
