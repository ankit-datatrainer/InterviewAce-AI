'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { ArrowLeft, Star, Clock, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { COACHES } from '@/lib/coaches';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function InstructorPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [coach, setCoach] = useState<typeof COACHES[0] | null>(null);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (params?.slug) {
      const found = COACHES.find(c => c.slug === params.slug);
      if (found) setCoach(found);
    }
  }, [params?.slug]);

  const availableTimes = ['Tomorrow, 10:00 AM', 'Tomorrow, 2:00 PM', 'Wednesday, 11:30 AM', 'Friday, 4:00 PM'];

  const initPayment = async () => {
    if (!selectedTime) {
      toast('Please select a time slot first.');
      return;
    }
    setProcessing(true);
    try {
      // Ensure Razorpay SDK is loaded dynamically
      const isLoaded = await new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection or disable adblockers.');
      }

      // 1. Create order on backend
      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: coach?.priceValue })
      });
      const order = await res.json();

      if (!res.ok) throw new Error(order.error || 'Failed to create order');

      // 2. Init Razorpay checkout
      const options = {
        key: order.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummykey', // Use key from backend, fallback to env
        amount: order.amount,
        currency: order.currency,
        name: 'InterviewAce Coaching',
        description: `1-on-1 Session with ${coach?.name}`,
        image: 'https://i.pravatar.cc/150?u=interviewace',
        order_id: order.id,
        handler: async function (response: any) {
          // 3. Verify payment on backend & trigger emails
          setBookingStep(2);
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                coachEmail: coach?.email,
                coachName: coach?.name,
                timeSlot: selectedTime,
                userEmail: 'student@example.com' // Mock user email, in real app fetch from session
              })
            });
            if (verifyRes.ok) {
              setBookingStep(3);
              toast('Payment successful! Emails sent.');
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (e) {
            console.error(e);
            toast('Error verifying payment.');
            setBookingStep(1);
          }
        },
        prefill: {
          name: 'Student',
          email: 'student@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#3b82f6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error(response.error);
        toast('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (error: any) {
      console.error(error);
      toast(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!coach) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-2)' }}>Loading profile...</div>;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="app-head" style={{ marginBottom: '2rem' }}>
        <button className="btn btn-ghost" onClick={() => router.back()} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-2)', background: 'var(--bg-2)', borderRadius: 'var(--r-full)' }}>
          <ArrowLeft size={16} /> Back to coaches
        </button>
      </div>

      {bookingStep === 3 ? (
        <div className="widget" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: 600, margin: '0 auto', background: 'linear-gradient(145deg, var(--bg-1), var(--bg-2))', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle size={80} color="#10b981" style={{ margin: '0 auto 1.5rem auto', filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.4))' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Booking Confirmed!</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Your 1-on-1 session with <strong style={{ color: 'var(--text-1)' }}>{coach.name}</strong> is confirmed for <strong style={{ color: 'var(--text-1)' }}>{selectedTime}</strong>.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: 'var(--r-lg)', textAlign: 'left', marginBottom: '2.5rem', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle size={18} color="#10b981" /> Payment processed successfully.</p>
            <p style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>✉️ Confirmation email sent to you.</p>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>📅 Calendar invite & meeting link generated.</p>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/coaching')} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: 'var(--r-full)' }}>
            Return to Coaching
          </button>
        </div>
      ) : bookingStep === 2 ? (
        <div className="widget" style={{ textAlign: 'center', padding: '5rem 2rem', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 60, height: 60, border: '4px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 2rem auto' }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Securing your session...</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '1.1rem' }}>Please do not close this window while we verify your payment and send the confirmation emails.</p>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* Left: Instructor Profile */}
          <div style={{ flex: '1 1 55%', minWidth: '300px' }}>
            <div className="widget" style={{ marginBottom: '2rem', padding: '3rem 2.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative Background Gradient */}
              <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }} />
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 140, height: 140, borderRadius: '50%', border: '4px solid var(--bg-1)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={coach.image} 
                        alt={coach.name} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          objectPosition: coach.slug === 'saurabh-sharda' ? 'center top' : 'center',
                          transformOrigin: coach.slug === 'saurabh-sharda' ? 'top center' : 'center',
                          transform: coach.slug === 'saurabh-sharda' ? 'scale(1.35)' : 'none' 
                        }} 
                      />
                    </div>
                    <div style={{ position: 'absolute', bottom: 5, right: 5, background: '#10b981', color: '#fff', borderRadius: '50%', padding: '4px', border: '3px solid var(--bg-1)', zIndex: 2 }}>
                      <CheckCircle size={16} />
                    </div>
                  </div>
                  <div>
                    <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', letterSpacing: '-0.02em' }}>{coach.name}</h1>
                    <p style={{ margin: 0, color: 'var(--blue)', fontSize: '1.2rem', fontWeight: 500 }}>{coach.title}</p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                      {coach.experience && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: 'var(--r-full)', fontSize: '.95rem', fontWeight: 600 }}>
                          <Star size={16} fill="currentColor" /> {coach.experience}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b', fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem 1rem', borderRadius: 'var(--r-full)' }}>
                        <Star size={18} fill="currentColor" /> 
                        <span>{coach.rating}</span> 
                        <span style={{ color: 'var(--text-2)', fontWeight: 'normal', fontSize: '0.9rem' }}>({coach.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>About the Coach</h3>
                <p style={{ color: 'var(--text-1)', lineHeight: 1.8, fontSize: '1.1rem', marginBottom: '2.5rem', opacity: 0.9 }}>
                  {coach.bio}
                </p>

                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Areas of Expertise</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {coach.tags.map(t => (
                    <span key={t} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '0.6rem 1.2rem', borderRadius: 'var(--r-full)', fontSize: '0.95rem', fontWeight: 500 }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Booking CTA */}
          <div className="widget" style={{ flex: '1 1 35%', minWidth: '300px', position: 'sticky', top: '2rem', padding: '2.5rem', background: 'linear-gradient(180deg, var(--bg-1), var(--bg-2))', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem' }}>Book a Session</h3>
                <span style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>1-on-1 personalized coaching</span>
              </div>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--blue)' }}>{coach.price}</span>
            </div>

            <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1.1rem' }}>Select a Date & Time</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
              {availableTimes.map(time => {
                const [datePart, timePart] = time.split(', ');
                return (
                  <button 
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{ 
                      padding: '1rem', 
                      border: `2px solid ${selectedTime === time ? 'var(--blue)' : 'var(--border)'}`, 
                      borderRadius: 'var(--r-md)', 
                      background: selectedTime === time ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-1)',
                      color: selectedTime === time ? '#fff' : 'var(--text-2)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: selectedTime === time ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: selectedTime === time ? '0 10px 20px rgba(59, 130, 246, 0.15)' : 'none'
                    }}
                  >
                    <Calendar size={18} color={selectedTime === time ? 'var(--blue)' : 'var(--text-3)'} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: selectedTime === time ? 600 : 500, fontSize: '0.95rem' }}>{datePart}</span>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: selectedTime === time ? '#fff' : 'var(--text-1)' }}>{timePart}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1.25rem', fontSize: '1.2rem', fontWeight: 600, borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}
              onClick={initPayment}
              disabled={processing}
            >
              {processing ? 'Connecting securely...' : `Checkout & Book Slot`}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-3)' }}>
              <CheckCircle size={14} />
              <span style={{ fontSize: '0.85rem' }}>Secure payments powered by <strong>Razorpay</strong></span>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
