'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatPrice } from '@/lib/utils';
import { guestCheckout, validateCoupon } from '@/lib/api/checkout';
import { getAddresses } from '@/lib/api/addresses';

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const EMPTY_CONTACT = { email: '', firstName: '', lastName: '', phone: '' };
const EMPTY_ADDRESS = { street: '', city: '', state: '', zipCode: '', country: 'US' };

// ─── Stripe Payment Form ──────────────────────────────────────────
function PaymentForm({ onSuccess, onError, isProcessing, setIsProcessing }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      } else {
        onError('Payment was not completed. Please try again.');
      }
    } catch (err) {
      onError('An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        className="checkout-place-order-btn"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing Payment...' : 'Pay Now'}
      </button>
    </form>
  );
}

// ─── Main Checkout ────────────────────────────────────────────────
export default function CheckoutContent() {
  const router = useRouter();
  const { items, total, itemCount, clearAll } = useCart();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, type, value, discountAmount }
  const [couponLoading, setCouponLoading] = useState(false);

  // Payment state
  const [clientSecret, setClientSecret] = useState(null);
  const [orderData, setOrderData] = useState(null);

  // Pre-fill from authenticated user
  useEffect(() => {
    if (isAuthenticated && user) {
      setContact((c) => ({
        email: c.email || user.email || '',
        firstName: c.firstName || user.firstName || '',
        lastName: c.lastName || user.lastName || '',
        phone: c.phone || user.phone || '',
      }));
      getAddresses()
        .then((res) => {
          const addrs = res.data || res || [];
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          if (defaultAddr && !selectedAddressId) {
            setSelectedAddressId(defaultAddr.id);
            setAddress({
              street: defaultAddr.street,
              city: defaultAddr.city,
              state: defaultAddr.state,
              zipCode: defaultAddr.zipCode,
              country: defaultAddr.country || 'US',
            });
          }
        })
        .catch(() => {
          toast.error('Could not load your saved addresses. You can enter one manually.');
        });
    }
  }, [isAuthenticated, user, selectedAddressId]);

  // Redirect to cart if empty
  useEffect(() => {
    if (!authLoading && itemCount === 0 && !orderData) {
      router.replace('/cart');
    }
  }, [authLoading, itemCount, router, orderData]);

  const shipping = useMemo(() => (total >= 500 ? 0 : 49.99), [total]);
  const taxRate = 0.08;
  const tax = useMemo(() => Math.round(total * taxRate * 100) / 100, [total]);
  const discount = appliedCoupon?.discountAmount ?? 0;
  const grandTotal = useMemo(() => Math.round(Math.max(0, total + shipping + tax - discount) * 100) / 100, [total, shipping, tax, discount]);

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await validateCoupon(code, total);
      const data = res.data || res;
      setAppliedCoupon(data);
      toast.success(`Coupon "${data.code}" applied — ${data.type === 'PERCENTAGE' ? `${data.value}%` : `$${data.value.toFixed(2)}`} off`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid coupon code';
      toast.error(msg);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
  }

  function updateContact(field, value) {
    setContact((c) => ({ ...c, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function updateAddress(field, value) {
    setAddress((a) => ({ ...a, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function selectSavedAddress(addr) {
    setSelectedAddressId(addr.id);
    setAddress({
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      country: addr.country || 'US',
    });
  }

  function validateStep1() {
    const errs = {};
    if (!contact.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(contact.email)) errs.email = 'Invalid email';
    if (!contact.firstName.trim()) errs.firstName = 'First name is required';
    if (!contact.lastName.trim()) errs.lastName = 'Last name is required';
    if (!contact.phone.trim()) errs.phone = 'Phone number is required';
    if (!address.street.trim()) errs.street = 'Street address is required';
    if (!address.city.trim()) errs.city = 'City is required';
    if (!address.state.trim()) errs.state = 'State is required';
    else if (address.state.trim().length < 2) errs.state = 'Enter a valid state (e.g. NY)';
    if (!address.zipCode.trim()) errs.zipCode = 'ZIP code is required';
    else if (address.zipCode.trim().length < 4) errs.zipCode = 'Enter a valid ZIP code';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleContinue() {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  }

  // Place order → get clientSecret → move to payment step
  async function handlePlaceOrder() {
    setIsSubmitting(true);
    try {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const orderItems = items.map((item) => ({
        productId: item.productId,
        ...(item.variantId && uuidRe.test(item.variantId) ? { variantId: item.variantId } : {}),
        quantity: Number(item.quantity) || 1,
      }));

      const result = await guestCheckout({
        email: contact.email.trim(),
        firstName: contact.firstName.trim(),
        lastName: contact.lastName.trim(),
        phone: contact.phone.trim() || undefined,
        address: {
          street: address.street.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          zipCode: address.zipCode.trim(),
          country: address.country || 'US',
        },
        items: orderItems,
        notes: notes.trim() || undefined,
        couponCode: appliedCoupon?.code || undefined,
      });

      // Backend returns a single order: { order: {..., clientSecret} }
      const order = result.order || result.data?.order;
      const clientSecretValue = order?.clientSecret;

      if (clientSecretValue) {
        setOrderData([order]);
        setClientSecret(clientSecretValue);
        setStep(3);
        window.scrollTo(0, 0);
      } else {
        // No payment intent (e.g. Stripe not configured) — go to confirmation
        clearAll();
        router.push(`/checkout/confirmation?orders=${order?.orderNumber || ''}&email=${encodeURIComponent(contact.email)}`);
      }
    } catch (err) {
      const data = err.response?.data;
      // Log full error so we can see exactly what the backend returns
      console.error('[Checkout] Order failed:', {
        status: err.response?.status,
        data,
        message: err.message,
      });
      if (data?.details?.length) {
        const messages = data.details.map((d) => `${d.field}: ${d.message}`).join('\n');
        toast.error(messages, { duration: 5000 });
      } else {
        const msg = data?.error || data?.message || err.message || 'Failed to place order. Please try again.';
        toast.error(msg, { duration: 5000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePaymentSuccess = useCallback(() => {
    const orderNumber = orderData?.[0]?.orderNumber || '';
    clearAll();
    router.push(`/checkout/confirmation?orders=${orderNumber}&email=${encodeURIComponent(contact.email)}`);
  }, [orderData, clearAll, router, contact.email]);

  const handlePaymentError = useCallback((message) => {
    const orderNumber = orderData?.[0]?.orderNumber;
    const detail = orderNumber
      ? `If this persists, contact support with order #${orderNumber}.`
      : 'Please try again.';
    toast.error(`${message || 'Payment failed.'} ${detail}`, { duration: 8000 });
  }, [orderData]);

  if (authLoading || (itemCount === 0 && !orderData)) {
    return (
      <MainLayout>
        <div className="checkout-page">
          <div className="checkout-loading">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  const stripeOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#111',
        borderRadius: '6px',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
  } : null;

  return (
    <MainLayout>
      <div className="checkout-page">
        <div className="checkout-header">
          <h1>Checkout</h1>
          <div className="checkout-steps">
            <span className={`checkout-step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span> Shipping
            </span>
            <span className="step-divider" />
            <span className={`checkout-step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span> Review
            </span>
            <span className="step-divider" />
            <span className={`checkout-step ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span> Payment
            </span>
          </div>
        </div>

        <div className="checkout-layout">
          {/* Left: Form */}
          <div className="checkout-form-area">
            {step === 1 && (
              <>
                {/* Contact Info */}
                <section className="checkout-section">
                  <h2>Contact Information</h2>
                  {!isAuthenticated && (
                    <p className="checkout-login-hint">
                      Already have an account?{' '}
                      <Link href={`/auth/login?redirect=/checkout`}>Log in</Link>
                    </p>
                  )}
                  <div className="checkout-field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                      placeholder="your@email.com"
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>
                  <div className="checkout-row">
                    <div className="checkout-field">
                      <label htmlFor="firstName">First Name</label>
                      <input
                        id="firstName"
                        type="text"
                        value={contact.firstName}
                        onChange={(e) => updateContact('firstName', e.target.value)}
                        className={errors.firstName ? 'error' : ''}
                      />
                      {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                    </div>
                    <div className="checkout-field">
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        id="lastName"
                        type="text"
                        value={contact.lastName}
                        onChange={(e) => updateContact('lastName', e.target.value)}
                        className={errors.lastName ? 'error' : ''}
                      />
                      {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                    </div>
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="phone">Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact('phone', e.target.value)}
                      placeholder="For delivery contact"
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                  </div>
                </section>

                {/* Shipping Address */}
                <section className="checkout-section">
                  <h2>Shipping Address</h2>

                  {savedAddresses.length > 0 && (
                    <div className="saved-addresses">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          className={`saved-address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}
                          onClick={() => selectSavedAddress(addr)}
                        >
                          <span className="saved-address-name">{addr.label || 'Address'}</span>
                          <span className="address-line">{addr.street}</span>
                          <span className="address-line">{addr.city}, {addr.state} {addr.zipCode}</span>
                          {addr.isDefault && <span className="address-default">Default</span>}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`saved-address-card new-address ${selectedAddressId === 'new' ? 'selected' : ''}`}
                        onClick={() => { setSelectedAddressId('new'); setAddress(EMPTY_ADDRESS); }}
                      >
                        + New Address
                      </button>
                    </div>
                  )}

                  {(!savedAddresses.length || selectedAddressId === 'new' || !selectedAddressId) && (
                    <>
                      <div className="checkout-field">
                        <label htmlFor="street">Street Address</label>
                        <input
                          id="street"
                          type="text"
                          value={address.street}
                          onChange={(e) => updateAddress('street', e.target.value)}
                          className={errors.street ? 'error' : ''}
                        />
                        {errors.street && <span className="field-error">{errors.street}</span>}
                      </div>
                      <div className="checkout-row">
                        <div className="checkout-field">
                          <label htmlFor="city">City</label>
                          <input
                            id="city"
                            type="text"
                            value={address.city}
                            onChange={(e) => updateAddress('city', e.target.value)}
                            className={errors.city ? 'error' : ''}
                          />
                          {errors.city && <span className="field-error">{errors.city}</span>}
                        </div>
                        <div className="checkout-field">
                          <label htmlFor="state">State</label>
                          <input
                            id="state"
                            type="text"
                            value={address.state}
                            onChange={(e) => updateAddress('state', e.target.value)}
                            className={errors.state ? 'error' : ''}
                          />
                          {errors.state && <span className="field-error">{errors.state}</span>}
                        </div>
                      </div>
                      <div className="checkout-field">
                        <label htmlFor="zipCode">ZIP Code</label>
                        <input
                          id="zipCode"
                          type="text"
                          value={address.zipCode}
                          onChange={(e) => updateAddress('zipCode', e.target.value)}
                          className={errors.zipCode ? 'error' : ''}
                        />
                        {errors.zipCode && <span className="field-error">{errors.zipCode}</span>}
                      </div>
                    </>
                  )}
                </section>

                <button className="checkout-continue-btn" onClick={handleContinue}>
                  Continue to Review
                </button>
              </>
            )}

            {step === 2 && (
              <>
                {/* Review Info */}
                <section className="checkout-section">
                  <div className="review-header">
                    <h2>Review Your Order</h2>
                    <button className="checkout-edit-btn" onClick={() => setStep(1)}>
                      Edit
                    </button>
                  </div>

                  <div className="review-info">
                    <div className="review-block">
                      <h3>Contact</h3>
                      <p>{contact.email}</p>
                      <p>{contact.firstName} {contact.lastName}</p>
                      {contact.phone && <p>{contact.phone}</p>}
                    </div>
                    <div className="review-block">
                      <h3>Ship to</h3>
                      <p>{address.street}</p>
                      <p>{address.city}, {address.state} {address.zipCode}</p>
                    </div>
                  </div>
                </section>

                {/* Order Items */}
                <section className="checkout-section">
                  <h2>Items ({itemCount})</h2>
                  <div className="checkout-items">
                    {items.map((item) => {
                      const imageUrl = item.product?.images?.[0]?.imageUrl;
                      const name = item.product?.name || 'Product';
                      const variantName = item.variant?.name || item.variant?.variantName || null;

                      return (
                        <div key={item.id} className="checkout-item">
                          <div className="checkout-item-image">
                            {imageUrl ? (
                              <Image src={imageUrl} alt={name} width={64} height={64} style={{ objectFit: 'cover' }} />
                            ) : (
                              <div className="checkout-item-no-image">No Image</div>
                            )}
                            <span className="checkout-item-qty">{item.quantity}</span>
                          </div>
                          <div className="checkout-item-details">
                            <span className="checkout-item-name">{name}</span>
                            {variantName && <span className="checkout-item-variant">{variantName}</span>}
                          </div>
                          <span className="checkout-item-price">{formatPrice(item._price * item.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Notes */}
                <section className="checkout-section">
                  <label htmlFor="notes" className="checkout-notes-label">Order Notes (optional)</label>
                  <textarea
                    id="notes"
                    className="checkout-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    maxLength={500}
                  />
                </section>

                {/* Coupon Code */}
                <section className="checkout-section">
                  <label className="checkout-notes-label">Coupon Code</label>
                  {appliedCoupon ? (
                    <div className="checkout-coupon-applied">
                      <span className="checkout-coupon-badge">{appliedCoupon.code}</span>
                      <span className="checkout-coupon-saving">
                        −{formatPrice(appliedCoupon.discountAmount)}
                      </span>
                      <button type="button" className="checkout-coupon-remove" onClick={handleRemoveCoupon}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="checkout-coupon-row">
                      <input
                        type="text"
                        className="checkout-coupon-input"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      />
                      <button
                        type="button"
                        className="checkout-coupon-btn"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                      >
                        {couponLoading ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  )}
                </section>

                <button
                  className="checkout-continue-btn"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Continue to Payment'}
                </button>
              </>
            )}

            {step === 3 && clientSecret && stripeOptions && (
              <>
                <section className="checkout-section">
                  <h2>Payment</h2>
                  <p className="checkout-payment-hint">
                    Enter your payment details to complete the order.
                  </p>
                  <Elements stripe={stripePromise} options={stripeOptions}>
                    <PaymentForm
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                    />
                  </Elements>
                </section>
              </>
            )}
          </div>

          {/* Right: Order Summary Sidebar */}
          <aside className="checkout-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {items.map((item) => (
                <div key={item.id} className="summary-item">
                  <span className="summary-item-name">
                    {item.product?.name || 'Product'} x {item.quantity}
                  </span>
                  <span>{formatPrice(item._price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="summary-divider" />
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (est.)</span>
              <span>{formatPrice(tax)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row summary-discount">
                <span>Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="summary-divider" />
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
