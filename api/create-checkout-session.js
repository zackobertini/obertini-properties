// api/create-checkout-session.js
import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2022-11-15",
    });

    const { method, email, uid } = req.body || {};
    const payMethod = method === "ach" ? "ach" : "card";

    // ✅ Set your NET rent here (what you want to receive)
    const netRentCents = 100000; // $1000.00

    // Fee models (typical US; adjust if your Stripe pricing differs)
    // Card: 2.9% + 30¢
    // ACH: 0.8% capped at $5 (i.e., 500 cents)
    let grossCents = netRentCents;
    let processingFeeCents = 0;

    if (payMethod === "card") {
      const percentFee = 0.029;
      const fixedFeeCents = 30;
      grossCents = Math.ceil((netRentCents + fixedFeeCents) / (1 - percentFee));
      processingFeeCents = grossCents - netRentCents;
    } else {
      const achPercent = 0.008;
      const achCapCents = 500;
      processingFeeCents = Math.min(Math.ceil(netRentCents * achPercent), achCapCents);
      grossCents = netRentCents + processingFeeCents;
    }

    const origin = req.headers.origin || "https://www.obertiniproperties.com";

    const payment_method_types =
      payMethod === "card" ? ["card"] : ["us_bank_account"];

    const payment_method_options =
      payMethod === "ach"
        ? {
            us_bank_account: {
              // Stripe Checkout will use Financial Connections for bank auth
              financial_connections: { permissions: ["payment_method"] },
            },
          }
        : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types,
      ...(payment_method_options ? { payment_method_options } : {}),

      // optional but helpful:
      customer_email: typeof email === "string" ? email : undefined,
      metadata: {
        uid: uid || "",
        pay_method: payMethod,
        net_rent_cents: String(netRentCents),
        fee_cents: String(processingFeeCents),
      },

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
            product_data: {
              name: payMethod === "card" ? "Card Processing Fee" : "ACH Processing Fee",
            },
            unit_amount: processingFeeCents,
          },
          quantity: 1,
        },
      ],

      success_url: `${origin}/portal.html?paid=1`,
      cancel_url: `${origin}/portal.html?paid=0`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return res.status(500).json({ error: err?.message || "Failed to create checkout session" });
  }
}
