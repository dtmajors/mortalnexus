const test = require('node:test');
const assert = require('node:assert/strict');
const { completedPayPalPayment } = require('../src/paypal');

function completedOrder(overrides = {}) {
  return {
    status: 'COMPLETED',
    purchase_units: [{
      reference_id: 'mortal_nexus_lifetime',
      custom_id: 'user-123',
      amount: { currency_code: 'USD', value: '19.99' },
      payments: {
        captures: [{ id: 'capture-123', status: 'COMPLETED', amount: { currency_code: 'USD', value: '19.99' } }]
      },
      ...overrides
    }]
  };
}

test('accepts a completed Mortal Nexus payment', () => {
  assert.deepEqual(completedPayPalPayment(completedOrder()), {
    userId: 'user-123',
    paymentId: 'capture-123',
    amountTotal: 1999,
    currency: 'usd'
  });
});

test('rejects a payment with a changed amount', () => {
  assert.throws(
    () => completedPayPalPayment(completedOrder({ amount: { currency_code: 'USD', value: '1.00' } })),
    /unexpected payment amount/
  );
});

test('accepts a recorded historical price during fulfillment retry', () => {
  const order = completedOrder({ amount: { currency_code: 'USD', value: '1.00' } });
  order.purchase_units[0].payments.captures[0].amount.value = '1.00';
  assert.equal(completedPayPalPayment(order, { currency: 'USD', value: '1.00' }).amountTotal, 100);
});

test('rejects a partial capture', () => {
  const order = completedOrder();
  order.purchase_units[0].payments.captures[0].amount.value = '1.00';
  assert.throws(() => completedPayPalPayment(order), /unexpected payment amount/);
});

test('rejects an incomplete payment', () => {
  const order = completedOrder();
  order.status = 'APPROVED';
  assert.throws(() => completedPayPalPayment(order), /has not completed/);
});
