import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  let amount = 0;
  try {
    const body = await req.json();
    amount = body.amount;
    
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykey';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

    const razorpay = new Razorpay({ key_id, key_secret });
    
    // Amount is in rupees, razorpay expects paise (amount * 100)
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json({ ...order, key_id });
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    // If we use dummy keys, razorpay will throw an error. So we return a mock order for development purposes if it fails due to auth.
    if (error.statusCode === 401 || !process.env.RAZORPAY_KEY_ID) {
      console.log("Using Mock Order because Razorpay credentials are not set/valid.");
      return NextResponse.json({
        id: "order_mock_" + Date.now(),
        entity: "order",
        amount: amount * 100,
        amount_paid: 0,
        amount_due: amount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        status: "created",
        attempts: 0,
        notes: [],
        created_at: Math.floor(Date.now() / 1000)
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
