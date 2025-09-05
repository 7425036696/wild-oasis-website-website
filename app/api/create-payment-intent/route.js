// app/api/create-payment-intent/route.js
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export async function POST(request) {
  try {
    const { amount, currency = 'usd', bookingData } = await request.json();

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        cabinId: bookingData.cabinId.toString(),
        numNights: bookingData.numNights.toString(),
        numGuests: bookingData.numGuests?.toString() || '',
        guestId: bookingData.guestId?.toString() || '',
      },
      // Optional: Add automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}