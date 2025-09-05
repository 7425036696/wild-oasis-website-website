"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import ReservationForm from "./ReservationForm";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function ClientReservationWrapper({ cabin, user }) {
  return (
    <Elements stripe={stripePromise}>
      <ReservationForm cabin={cabin} user={user} />
    </Elements>
  );
}

export default ClientReservationWrapper;