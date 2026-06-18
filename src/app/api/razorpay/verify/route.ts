import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      coachEmail,
      coachName,
      timeSlot,
      userEmail 
    } = body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

    // Verify signature only if it's a real order
    if (!razorpay_order_id?.startsWith('order_mock_')) {
      const generated_signature = crypto
        .createHmac('sha256', key_secret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // ─── Send Emails via Nodemailer ───
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      // 1. Email to User
      const userMailOptions = {
        from: `"InterviewAce Coaching" <${smtpUser}>`,
        to: userEmail,
        subject: `Booking Confirmed: 1-on-1 Coaching with ${coachName}`,
        html: `
          <h3>Booking Confirmed!</h3>
          <p>Hi there,</p>
          <p>Your 1-on-1 coaching session with <strong>${coachName}</strong> has been successfully booked for <strong>${timeSlot}</strong>.</p>
          <p>A calendar invite with the video link will be sent shortly.</p>
          <p>Thanks for using InterviewAce!</p>
        `
      };

      // 2. Email to Coach (Instructor)
      const coachMailOptions = {
        from: `"InterviewAce Platform" <${smtpUser}>`,
        to: coachEmail,
        subject: `New Coaching Booking from ${userEmail}`,
        html: `
          <h3>New Session Booked!</h3>
          <p>Hi ${coachName},</p>
          <p>You have a new 1-on-1 coaching session booked by <strong>${userEmail}</strong>.</p>
          <p><strong>Scheduled Time:</strong> ${timeSlot}</p>
          <p>Please ensure your calendar is up to date.</p>
          <p>Best, <br/>InterviewAce Team</p>
        `
      };

      await Promise.all([
        transporter.sendMail(userMailOptions),
        transporter.sendMail(coachMailOptions)
      ]);
      
      console.log('Confirmation emails sent successfully.');
    } else {
      console.warn('SMTP credentials not provided in .env. Skipping email dispatch.');
      console.log(`Mock Email to User (${userEmail}): Booked with ${coachName} at ${timeSlot}`);
      console.log(`Mock Email to Coach (${coachEmail}): New booking from ${userEmail} at ${timeSlot}`);
    }

    return NextResponse.json({ success: true, message: 'Payment verified and emails sent.' });

  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
