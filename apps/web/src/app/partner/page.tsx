'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredUser,
  getPartnerHotels,
  getHotelAvailability,
  updatePrices,
  updateHotelProfile,
  uploadHotelImages,
  replyToReview,
  getMyKycDocuments,
  uploadKycDocuments,
  api,
} from '@/lib/api';
import { useCurrency } from '@/lib/currency';
import { usePartnerLive } from '@/lib/usePartnerLive';
import { PropertyOnboardingWizard } from '@/components/PropertyOnboardingWizard';

type ManageTab = 'overview' | 'profile' | 'bookings' | 'reviews' | 'photos' | 'pricing';

const BILLING_COLORS: Record<string, string> = {
  PAID_ONLINE: 'bg-green-100 text-green-700',
  PAY_AT_PROPERTY: 'bg-blue-100 text-blue-700',
  AWAITING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  PARTIAL: 'bg-orange-100 text-orange-700',
  SETTLED: 'bg-navy/10 text-navy',
  UNPAID: 'bg-red-100 text-red-600',
  PAID: 'bg-green-100 text-green-700',
};

export default function PartnerPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const [hotels, setHotels] = useState<Record<string, unknown>[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'manage' | 'onboard'>('manage');
  const [manageTab, setManageTab] = useState<ManageTab>('overview');
  const [uploadMsg, setUploadMsg] = useState('');
  const [onboardMsg, setOnboardMsg] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [priceMsg, setPriceMsg] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [partnerStatus, setPartnerStatus] = useState<string | null>(null);
  const [kycDocs, setKycDocs] = useState<Record<string, unknown>[]>([]);
  const [kycMsg, setKycMsg] = useState('');
  const [kycType, setKycType] = useState('ID_PROOF');

  const { dashboard, connected, lastUpdate, refresh } = usePartnerLive(selectedId || null);
  const hotel = dashboard?.hotel as Record<string, unknown> | undefined;
  const stats = dashboard?.stats as Record<string, number> | undefined;
  const bookings = (dashboard?.bookings as Record<string, unknown>[]) || [];
  const reviews = (dashboard?.reviews as Record<string, unknown>[]) || [];
  const reviewStats = dashboard?.reviewStats as Record<string, unknown> | undefined;

  const [profile, setProfile] = useState({
    phone: '', email: '', website: '', address: '', latitude: '', longitude: '',
    googleMapsUrl: '', checkInTime: '14:00', checkOutTime: '11:00',
    socialFacebook: '', socialInstagram: '', socialTwitter: '', socialLinkedIn: '', socialYoutube: '',
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 8);
  const [availability, setAvailability] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const user = getStoredUser() as { roles?: string[]; partnerStatus?: string } | null;
    if (!user?.roles?.some((r: string) => ['PARTNER', 'RECEPTIONIST', 'SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/login');
      return;
    }
    setPartnerStatus(
      user.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN'].includes(r))
        ? 'APPROVED'
        : (user.partnerStatus ?? 'APPROVED')
    );
    getMyKycDocuments().then((res) => {
      if (res.success) setKycDocs((res.data as Record<string, unknown>[]) || []);
    });
    getPartnerHotels().then((res) => {
      const list = (res.data as Record<string, unknown>[]) || [];
      setHotels(list);
      if (list.length > 0) setSelectedId(list[0].id as string);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!selectedId) return;
    getHotelAvailability(selectedId, tomorrow.toISOString().slice(0, 10), nextWeek.toISOString().slice(0, 10))
      .then((res) => { if (res.success) setAvailability(res.data as Record<string, unknown>); });
  }, [selectedId]);

  useEffect(() => {
    if (hotel) {
      setProfile({
        phone: (hotel.phone as string) || '',
        email: (hotel.email as string) || '',
        website: (hotel.website as string) || '',
        address: (hotel.address as string) || '',
        latitude: hotel.latitude != null ? String(hotel.latitude) : '',
        longitude: hotel.longitude != null ? String(hotel.longitude) : '',
        googleMapsUrl: (hotel.googleMapsUrl as string) || '',
        checkInTime: (hotel.checkInTime as string) || '14:00',
        checkOutTime: (hotel.checkOutTime as string) || '11:00',
        socialFacebook: (hotel.socialFacebook as string) || '',
        socialInstagram: (hotel.socialInstagram as string) || '',
        socialTwitter: (hotel.socialTwitter as string) || '',
        socialLinkedIn: (hotel.socialLinkedIn as string) || '',
        socialYoutube: (hotel.socialYoutube as string) || '',
      });
    }
  }, [hotel]);

  const handleOnboardComplete = async (hotelId: string, hotelName: string) => {
    setOnboardMsg(`"${hotelName}" submitted for admin approval!`);
    const list = (await getPartnerHotels()).data as Record<string, unknown>[];
    setHotels(list || []);
    setSelectedId(hotelId);
    setTab('manage');
  };

  const handleSaveProfile = async () => {
    if (!selectedId) return;
    const res = await updateHotelProfile(selectedId, {
      ...profile,
      latitude: profile.latitude ? parseFloat(profile.latitude) : undefined,
      longitude: profile.longitude ? parseFloat(profile.longitude) : undefined,
    });
    setProfileMsg(res.success ? 'Profile saved!' : res.error?.message || 'Failed');
    refresh();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedId || !e.target.files?.length) return;
    setUploadMsg('Uploading...');
    const res = await uploadHotelImages(selectedId, e.target.files, true);
    setUploadMsg(res.success ? 'Photos uploaded!' : res.error?.message || 'Failed');
    refresh();
  };

  const handlePriceUpdate = async () => {
    if (!selectedId) return;
    const hotelRes = await api(`/hotels/${selectedId}`);
    const ratePlans = ((hotelRes.data as Record<string, unknown>)?.ratePlans as Record<string, unknown>[]) || [];
    if (!ratePlans.length) { setPriceMsg('No rate plans found'); return; }
    const res = await updatePrices(selectedId, ratePlans[0].id as string, [{ date: tomorrow.toISOString().slice(0, 10), price: 399 }]);
    setPriceMsg(res.success ? 'Rate updated for tomorrow' : res.error?.message || 'Failed');
  };

  const handleReply = async (reviewId: string) => {
    const reply = replyText[reviewId];
    if (!reply || !selectedId) return;
    await replyToReview(selectedId, reviewId, reply);
    setReplyText({ ...replyText, [reviewId]: '' });
    refresh();
  };

  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setKycMsg('Uploading...');
    const res = await uploadKycDocuments(e.target.files, kycType);
    if (res.success) {
      setKycMsg('Documents uploaded! Awaiting admin approval.');
      setPartnerStatus('PENDING_APPROVAL');
      const docsRes = await getMyKycDocuments();
      if (docsRes.success) setKycDocs((docsRes.data as Record<string, unknown>[]) || []);
      const user = getStoredUser() as Record<string, unknown>;
      if (user) {
        user.partnerStatus = 'PENDING_APPROVAL';
        localStorage.setItem('user', JSON.stringify(user));
      }
    } else {
      setKycMsg(res.error?.message || 'Upload failed');
    }
  };

  if (loading) return <div className="text-center py-20 text-navy/50">Loading partner portal...</div>;

  const needsKyc = partnerStatus && partnerStatus !== 'APPROVED';
  const isRejected = partnerStatus === 'REJECTED';

  if (needsKyc) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-navy mb-2">Partner Verification</h1>
        <p className="text-gold text-sm mb-8">
          {isRejected
            ? 'Your application was not approved. Contact support for assistance.'
            : 'Upload your KYC documents before you can list properties.'}
        </p>

        {!isRejected && (
          <div className="bg-white rounded-xl border border-gold/10 p-6 space-y-4">
            <div className="bg-sand rounded-lg p-4 text-sm text-navy/70">
              <p className="font-medium text-navy mb-2">Required documents:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>Government-issued ID (passport, Aadhaar, driving licence)</li>
                <li>Business registration or property ownership proof</li>
                <li>PDF or image files accepted (max 10 MB each)</li>
              </ul>
            </div>

            <select value={kycType} onChange={(e) => setKycType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="ID_PROOF">Government ID</option>
              <option value="BUSINESS_PROOF">Business / Property Proof</option>
              <option value="ADDRESS_PROOF">Address Proof</option>
              <option value="OTHER">Other</option>
            </select>

            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gold/30 rounded-xl cursor-pointer hover:border-coral/50">
              <span className="text-2xl">📋</span>
              <span className="text-xs text-navy/60 mt-1">Upload KYC documents (up to 5 files)</span>
              <input type="file" accept="image/*,.pdf" multiple onChange={handleKycUpload} className="hidden" />
            </label>

            {kycMsg && <p className={`text-sm ${kycMsg.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>{kycMsg}</p>}

            {kycDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-navy">Uploaded documents:</p>
                {kycDocs.map((d) => (
                  <div key={d.id as string} className="text-xs text-navy/60 bg-sand px-3 py-2 rounded">
                    {(d.documentType as string)} — {d.originalName as string}
                  </div>
                ))}
                {partnerStatus === 'PENDING_APPROVAL' && (
                  <p className="text-sm text-gold">⏳ Awaiting admin approval. You&apos;ll be notified once approved.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const availList = (availability?.availability as Record<string, unknown>[]) || [];
  const manageTabs: { id: ManageTab; label: string }[] = [
    { id: 'overview', label: 'Live Overview' },
    { id: 'profile', label: 'Property Profile' },
    { id: 'bookings', label: 'Bookings & Billing' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'photos', label: 'Photos' },
    { id: 'pricing', label: 'Pricing' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Partner Portal</h1>
          <p className="text-gold text-sm">Real-time property, billing & review management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('manage')} className={`px-4 py-2 text-sm rounded-lg ${tab === 'manage' ? 'bg-navy text-white' : 'bg-sand text-navy'}`}>Manage</button>
          <button onClick={() => setTab('onboard')} className={`px-4 py-2 text-sm rounded-lg ${tab === 'onboard' ? 'bg-coral text-white' : 'bg-sand text-navy'}`}>+ Add Property</button>
        </div>
      </div>

      {tab === 'onboard' && (
        <div>
          {onboardMsg && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{onboardMsg}</div>
          )}
          <PropertyOnboardingWizard
            onComplete={handleOnboardComplete}
            onCancel={() => setTab('manage')}
          />
        </div>
      )}

      {tab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-navy text-sm">Your Properties</div>
            {hotels.map((h) => (
              <button key={h.id as string} onClick={() => setSelectedId(h.id as string)}
                className={`w-full text-left px-4 py-3 border-b border-gold/5 text-sm ${selectedId === h.id ? 'bg-sand border-l-4 border-l-coral' : 'hover:bg-sand'}`}>
                <div className="font-medium text-navy">{h.name as string}</div>
                <div className="text-xs text-navy/50">{h.city as string}</div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selectedId && hotel ? (
              <>
                <div className="flex items-center justify-between bg-white rounded-xl border border-gold/10 px-4 py-3">
                  <div>
                    <h2 className="font-bold text-navy">{hotel.name as string}</h2>
                    <p className="text-xs text-navy/50">{hotel.address as string}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className="text-xs text-navy/50">{connected ? 'Live' : 'Connecting...'} · {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : ''}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {manageTabs.map((t) => (
                    <button key={t.id} onClick={() => setManageTab(t.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg ${manageTab === t.id ? 'bg-navy text-white' : 'bg-sand text-navy'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {manageTab === 'overview' && stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Bookings', val: stats.totalBookings },
                      { label: 'Paid Online', val: stats.paidOnline },
                      { label: 'Pay at Property', val: stats.payAtProperty },
                      { label: 'Pending Payment', val: stats.pendingPayment },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-xl border border-gold/10 p-4 text-center">
                        <div className="text-2xl font-bold text-navy">{s.val}</div>
                        <div className="text-xs text-navy/50">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {manageTab === 'profile' && (
                  <div className="bg-white rounded-xl border border-gold/10 p-6 space-y-4">
                    <h3 className="font-semibold text-navy">Contact & Location</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="Website" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} className="px-3 py-2 border rounded-lg text-sm col-span-2" />
                      <input placeholder="Address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="px-3 py-2 border rounded-lg text-sm col-span-2" />
                      <input placeholder="Latitude" value={profile.latitude} onChange={(e) => setProfile({ ...profile, latitude: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="Longitude" value={profile.longitude} onChange={(e) => setProfile({ ...profile, longitude: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="Google Maps URL" value={profile.googleMapsUrl} onChange={(e) => setProfile({ ...profile, googleMapsUrl: e.target.value })} className="px-3 py-2 border rounded-lg text-sm col-span-2" />
                      <input placeholder="Check-in time" value={profile.checkInTime} onChange={(e) => setProfile({ ...profile, checkInTime: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="Check-out time" value={profile.checkOutTime} onChange={(e) => setProfile({ ...profile, checkOutTime: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <h3 className="font-semibold text-navy pt-2">Social Media</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Facebook" value={profile.socialFacebook} onChange={(e) => setProfile({ ...profile, socialFacebook: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="Instagram" value={profile.socialInstagram} onChange={(e) => setProfile({ ...profile, socialInstagram: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="Twitter / X" value={profile.socialTwitter} onChange={(e) => setProfile({ ...profile, socialTwitter: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="LinkedIn" value={profile.socialLinkedIn} onChange={(e) => setProfile({ ...profile, socialLinkedIn: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                      <input placeholder="YouTube" value={profile.socialYoutube} onChange={(e) => setProfile({ ...profile, socialYoutube: e.target.value })} className="px-3 py-2 border rounded-lg text-sm col-span-2" />
                    </div>
                    {profile.latitude && profile.longitude && (
                      <a href={`https://maps.google.com/?q=${profile.latitude},${profile.longitude}`} target="_blank" rel="noopener noreferrer"
                        className="inline-block text-sm text-coral hover:underline">📍 Preview on Google Maps</a>
                    )}
                    {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
                    <button onClick={handleSaveProfile} className="px-4 py-2 bg-navy text-white text-sm rounded-lg">Save Profile</button>
                  </div>
                )}

                {manageTab === 'bookings' && (
                  <div className="space-y-3">
                    {bookings.length === 0 ? (
                      <div className="bg-white rounded-xl p-8 text-center text-navy/40 text-sm">No bookings yet</div>
                    ) : bookings.map((b) => {
                      const guest = b.guest as Record<string, unknown>;
                      return (
                        <div key={b.id as string} className="bg-white rounded-xl border border-gold/10 p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-navy text-sm">{b.bookingNumber as string}</p>
                              <p className="text-xs text-navy/60">{guest?.firstName as string} {guest?.lastName as string} · {guest?.phone as string || guest?.email as string}</p>
                              <p className="text-xs text-navy/50 mt-1">{String(b.checkInDate).slice(0, 10)} → {String(b.checkOutDate).slice(0, 10)} · {b.roomType as string}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${BILLING_COLORS[b.billingState as string] || 'bg-gray-100'}`}>
                                {(b.billingState as string)?.replace(/_/g, ' ')}
                              </span>
                              <p className="text-lg font-bold text-navy mt-1">{format(b.totalAmount as number)}</p>
                              <p className="text-[10px] text-navy/50">
                                {b.paymentChannel === 'ONLINE' ? '💳 Paid Online' : b.paymentChannel === 'AT_PROPERTY' ? '🏨 Pay at Property' : '—'}
                                {b.paymentMethod ? ` (${b.paymentMethod as string})` : ''}
                              </p>
                            </div>
                          </div>
                          {b.folio && (
                            <div className="mt-3 pt-3 border-t border-gold/5 text-xs text-navy/60">
                              Folio: {(b.folio as Record<string, unknown>).status as string} · Total {format((b.folio as Record<string, unknown>).total as number)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {manageTab === 'reviews' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gold/10 p-4 flex gap-6">
                      <div><span className="text-3xl font-bold text-navy">{reviewStats?.averageRating as number || '—'}</span><span className="text-gold"> ★</span></div>
                      <div className="text-sm text-navy/60">{reviewStats?.totalReviews as number || 0} reviews</div>
                    </div>
                    {reviews.map((r) => (
                      <div key={r.id as string} className="bg-white rounded-xl border border-gold/10 p-4">
                        <div className="flex justify-between">
                          <span className="font-medium text-navy text-sm">{r.guestName as string}</span>
                          <span className="text-gold text-sm">{'★'.repeat(r.rating as number)}</span>
                        </div>
                        {r.title && <p className="font-medium text-sm text-navy mt-1">{r.title as string}</p>}
                        <p className="text-sm text-navy/70 mt-1">{r.comment as string}</p>
                        {r.partnerReply ? (
                          <p className="text-xs text-navy/50 mt-2 bg-sand p-2 rounded">Your reply: {r.partnerReply as string}</p>
                        ) : (
                          <div className="mt-2 flex gap-2">
                            <input placeholder="Write a reply..." value={replyText[r.id as string] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [r.id as string]: e.target.value })}
                              className="flex-1 px-2 py-1 border rounded text-xs" />
                            <button onClick={() => handleReply(r.id as string)} className="px-3 py-1 bg-navy text-white text-xs rounded">Reply</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {manageTab === 'photos' && (
                  <div className="bg-white rounded-xl border border-gold/10 p-6">
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gold/30 rounded-xl cursor-pointer hover:border-coral/50">
                      <span className="text-2xl">📷</span>
                      <span className="text-xs text-navy/60 mt-1">Upload property photos</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                    {uploadMsg && <p className="text-xs text-green-600 mt-2">{uploadMsg}</p>}
                  </div>
                )}

                {manageTab === 'pricing' && (
                  <div className="bg-white rounded-xl border border-gold/10 p-6 space-y-4">
                    <h3 className="font-semibold text-navy text-sm">Availability (Next 7 Days)</h3>
                    {availList.map((a) => (
                      <div key={a.roomTypeId as string} className="flex justify-between text-sm py-1 border-b border-gold/5">
                        <span>{a.roomTypeName as string}</span>
                        <span className={a.available ? 'text-green-600' : 'text-red-500'}>{a.available ? `${a.roomsAvailable} rooms` : 'Sold out'}</span>
                      </div>
                    ))}
                    <button onClick={handlePriceUpdate} className="px-4 py-2 bg-coral text-white text-sm rounded-lg">Update Tomorrow&apos;s Rate</button>
                    {priceMsg && <p className="text-sm text-green-600">{priceMsg}</p>}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-navy/40">Select a property or add a new one</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
