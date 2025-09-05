"use client";

import { differenceInDays } from "date-fns";
import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useReservation } from "./ReservationContext";
import { createBooking } from "../_lib/actions";
import SubmitButton from "./SubmitButton";

function ReservationForm({ cabin, user }) {
  const { range, resetRange } = useReservation();
  const { maxCapacity, regularPrice, discount, id } = cabin;
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const startDate = range.from;
  const endDate = range.to;

  const numNights = differenceInDays(endDate, startDate);
  const cabinPrice = numNights * (regularPrice - discount);

  const bookingData = {
    startDate,
    endDate,
    numNights,
    cabinPrice,
    cabinId: id,
  };

  const handleSubmit = async (formData) => {
    if (!stripe || !elements) {
      setPaymentError("Stripe has not loaded yet. Please try again.");
      return;
    }

    setIsProcessing(true);
    setPaymentError("");

    const cardElement = elements.getElement(CardElement);
    const numGuests = formData.get("numGuests");
    const observations = formData.get("observations");

    try {
      // Create payment intent on your server
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: cabinPrice * 100, // Stripe expects amount in cents
          currency: "usd",
          bookingData: {
            ...bookingData,
            numGuests,
            observations,
            guestId: user.id,
          },
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: user.name,
              email: user.email,
            },
          },
        }
      );

      if (error) {
        setPaymentError(error.message);
      } else if (paymentIntent.status === "succeeded") {
        // Create booking in your database
        const bookingFormData = new FormData();
        bookingFormData.append("numGuests", numGuests);
        bookingFormData.append("observations", observations);
        bookingFormData.append("paymentIntentId", paymentIntent.id);

        await createBooking(bookingData, bookingFormData);
        resetRange();
        // Redirect or show success message
      }
    } catch (error) {
      setPaymentError("An error occurred while processing your payment.");
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#1f2937",
        "::placeholder": {
          color: "#6b7280",
        },
      },
      invalid: {
        color: "#9e2146",
      },
    },
  };

  return (
    <div className="scale-[1.01]">
      <div className="bg-primary-800 text-primary-300 px-16 py-2 flex justify-between items-center">
        <p>Logged in as</p>

        <div className="flex gap-4 items-center">
          <img
            // Important to display google profile images
            referrerPolicy="no-referrer"
            className="h-8 rounded-full"
            src={user.image}
            alt={user.name}
          />
          <p>{user.name}</p>
        </div>
      </div>

      <form
        action={handleSubmit}
        className="bg-primary-900 py-10 px-16 text-lg flex gap-5 flex-col"
      >
        <div className="space-y-2">
          <label htmlFor="numGuests">How many guests?</label>
          <select
            name="numGuests"
            id="numGuests"
            className="px-5 py-3 bg-primary-200 text-primary-800 w-full shadow-sm rounded-sm"
            required
          >
            <option value="" key="">
              Select number of guests...
            </option>
            {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((x) => (
              <option value={x} key={x}>
                {x} {x === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="observations">
            Anything we should know about your stay?
          </label>
          <textarea
            name="observations"
            id="observations"
            className="px-5 py-3 bg-primary-200 text-primary-800 w-full shadow-sm rounded-sm"
            placeholder="Any pets, allergies, special requirements, etc.?"
          />
        </div>

        <div className="space-y-2">
          <label>Payment Information</label>
          <div className="px-5 py-3 bg-primary-200 text-primary-800 w-full shadow-sm rounded-sm">
            <CardElement options={cardElementOptions} />
          </div>
          {paymentError && (
            <p className="text-red-400 text-sm">{paymentError}</p>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-primary-300">
            <p className="text-xl font-semibold">
              Total: ${cabinPrice}
            </p>
            <p className="text-sm">
              {numNights} nights × ${regularPrice - discount}/night
            </p>
          </div>
        </div>

        <div className="flex justify-end items-center gap-6">
          {!(startDate && endDate) ? (
            <p className="text-primary-300 text-base">
              Start by selecting dates
            </p>
          ) : (
            <SubmitButton 
              pendingLabel={isProcessing ? "Processing Payment..." : "Reserving..."}
              disabled={!stripe || isProcessing}
            >
              {isProcessing ? "Processing..." : `Pay $${cabinPrice} & Reserve`}
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}

export default ReservationForm;