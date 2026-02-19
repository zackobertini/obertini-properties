// api/create-checkout-session.js
import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ DO NOT hardcode keys — use Vercel env var
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
    });

    // ✅ Set your NET rent here (what you want to receive)
    const netRentCents = 100000; // $1000.00

    // ✅ Stripe card fee estimate (US): 2.9% + 30¢
    const percentFee = 0.029;
    const fixedFeeCents = 30;

    // ✅ Gross up so you still net the rent after fees
    // gross = ceil((net + fixed) / (1 - percent))
    const grossCents = Math.ceil((netRentCents + fixedFeeCents) / (1 - percentFee));
    const processingFeeCents = grossCents - netRentCents;

    const origin = req.headers.origin || "https://www.obertiniproperties.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Monthly Rent" },
            unit_amount: netRentCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Processing Fee" },
            unit_amount: processingFeeCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/portal.html?paid=1`,
      cancel_url: `${origin}/portal.html?paid=0`,
    });

    // ✅ IMPORTANT: return the URL so the browser can redirect
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return res.status(500).json({ error: "Failed to create Stripe checkout session" });
  }
}
