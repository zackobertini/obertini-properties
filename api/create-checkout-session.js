import Stripe from 'stripe';

// Replace with your Stripe **Secret Key**
const stripe = new Stripe('sk_test_51T2JrFRpNMZCmY3ribZByERvaokhKQFvS0HV5Z4k2i3NDzTq1hPtJjybg2OvgpDYY4DAONkFBpGlLR3BNbTcdd3p00zHQ7ofnN');

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Rent amount in cents (e.g., $1000 = 100000)
      const rentAmount = 100000; 

      // Calculate Stripe fees to pass to tenant
      const cardFee = Math.ceil(rentAmount * 0.029 + 30); // 2.9% + $0.30
      const achFee = Math.ceil(rentAmount * 0.008);       // 0.8% for ACH
      const totalAmount = rentAmount + cardFee;           // Charging worst-case card fee

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'us_bank_account'], // Card + ACH
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'Monthly Rent (includes fees)' },
            unit_amount: totalAmount
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${req.headers.origin}/portal.html?success=true`,
        cancel_url: `${req.headers.origin}/portal.html?canceled=true`
      });

      res.status(200).json({ id: session.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).end('Method Not Allowed');
  }
}
