// api/create-checkout-session.js
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' });
    return;
  }

  try {
    const stripe = new Stripe('sk_test_51T2JrFRpNMZCmY3ribZByERvaokhKQFvS0HV5Z4k2i3NDzTq1hPtJjybg2OvgpDYY4DAONkFBpGlLR3BNbTcdd3p00zHQ7ofnN', {
      apiVersion: '2022-11-15',
    });

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Rent Payment',
            },
            unit_amount: 1000, // Amount in cents ($10.00) — update to your rent
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}?success=true`,
      cancel_url: `${req.headers.origin}?canceled=true`,
    });

    res.status(200).json({ id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create Stripe checkout session' });
  }
}
