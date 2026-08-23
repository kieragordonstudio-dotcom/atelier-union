import { CalendarPlus, Check, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { artists, getArtistById } from '../../data/artists';
import {
  bookableDates,
  nextAvailable,
  slotsFor,
  type AvailabilitySlot,
  type TimeGroup,
} from '../../data/availability';
import { getLookById } from '../../data/lookbook';
import {
  addOns,
  calculateBookingTotal,
  canUseAddOn,
  formatPrice,
  getAddOnById,
  getTreatmentById,
  productRemoval,
  treatmentCategories,
  treatments,
  type AddOnId,
  type ProductOn,
  type Treatment,
  type TreatmentCategory,
} from '../../data/treatments';
import { Button } from '../common/Button';

const steps = ['Treatment', 'Artist', 'Date & Time', 'Confirm', 'Booked'];
const groups: TimeGroup[] = ['Morning', 'Afternoon', 'Evening'];
const deposit = 15;

type ArtistChoice = 'any' | 'maya' | 'sophie' | 'isla';

type CustomerDetails = {
  fullName: string;
  mobile: string;
  email: string;
  note: string;
};

function getInitialTreatment(params: URLSearchParams) {
  const look = getLookById(params.get('look'));
  return (
    getTreatmentById(params.get('treatment')) ??
    getTreatmentById(look?.suggestedBaseTreatment) ??
    treatments[0]
  );
}

function getInitialProduct(params: URLSearchParams, treatment: Treatment): ProductOn {
  const value = params.get('product');
  if (!treatment.allowsProductRemoval) return 'none';
  if (value && Object.prototype.hasOwnProperty.call(productRemoval, value)) {
    return value as ProductOn;
  }
  return 'none';
}

function getInitialAddOns(params: URLSearchParams, treatment: Treatment) {
  const look = getLookById(params.get('look'));
  const ids = [params.get('addon'), look?.addOn].filter(Boolean) as AddOnId[];
  return Array.from(new Set(ids)).filter((id) => {
    const addOn = getAddOnById(id);
    return addOn ? canUseAddOn(treatment, addOn) : false;
  });
}

function formatSlot(slot: AvailabilitySlot | null) {
  return slot ? `${slot.fullDisplay} · ${slot.time}` : 'Not selected';
}

export function BookingShell() {
  const [params] = useSearchParams();
  const paramsKey = params.toString();
  const panelRef = useRef<HTMLElement>(null);
  const initialTreatment = useMemo(() => getInitialTreatment(params), [paramsKey]);
  const initialArtist = getArtistById(params.get('artist'))?.id as
    | ArtistChoice
    | undefined;
  const [step, setStep] = useState(0);
  const [selectedTreatment, setSelectedTreatment] =
    useState<Treatment>(initialTreatment);
  const [selectedCategory, setSelectedCategory] = useState<TreatmentCategory>(
    initialTreatment.category,
  );
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnId[]>(() =>
    getInitialAddOns(params, initialTreatment),
  );
  const [productOn, setProductOn] = useState<ProductOn>(() =>
    getInitialProduct(params, initialTreatment),
  );
  const [artistId, setArtistId] = useState<ArtistChoice>(initialArtist ?? 'any');
  const initialSlot = nextAvailable(initialArtist ?? 'any') ?? null;
  const [selectedDate, setSelectedDate] = useState(
    initialSlot?.date ?? bookableDates[0].date,
  );
  const [timeGroup, setTimeGroup] = useState<TimeGroup>(
    initialSlot?.group ?? 'Afternoon',
  );
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [compatibilityMessage, setCompatibilityMessage] = useState('');
  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: '',
    mobile: '',
    email: '',
    note: '',
  });
  const [cancelMessage, setCancelMessage] = useState(false);

  useEffect(() => {
    setSelectedAddOns((current) =>
      current.filter((id) => {
        const addOn = getAddOnById(id);
        return addOn ? canUseAddOn(selectedTreatment, addOn) : false;
      }),
    );
    if (!selectedTreatment.allowsProductRemoval) {
      setProductOn('none');
    }
  }, [selectedTreatment]);

  useEffect(() => {
    const nextTreatment = getInitialTreatment(params);
    const nextArtist = (getArtistById(params.get('artist'))?.id ??
      'any') as ArtistChoice;
    const nextSlot = nextAvailable(nextArtist) ?? null;
    setStep(0);
    setSelectedTreatment(nextTreatment);
    setSelectedCategory(nextTreatment.category);
    setSelectedAddOns(getInitialAddOns(params, nextTreatment));
    setProductOn(getInitialProduct(params, nextTreatment));
    setArtistId(nextArtist);
    setSelectedDate(nextSlot?.date ?? bookableDates[0].date);
    setTimeGroup(nextSlot?.group ?? 'Afternoon');
    setSelectedSlot(null);
  }, [paramsKey]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  const total = calculateBookingTotal(
    selectedTreatment,
    selectedAddOns,
    productOn,
  );

  const selectedArtist = artistId === 'any' ? null : getArtistById(artistId);
  const visibleTreatments = treatments.filter(
    (treatment) => treatment.category === selectedCategory,
  );
  const availableSlots = slotsFor(selectedDate, artistId, timeGroup);
  const nextSlot = nextAvailable(artistId) ?? null;
  const canConfirm =
    customer.fullName.trim() && customer.mobile.trim() && customer.email.trim();

  function toggleAddOn(id: AddOnId) {
    const addOn = getAddOnById(id);
    if (!addOn) return;
    if (!canUseAddOn(selectedTreatment, addOn)) {
      setCompatibilityMessage(
        'This finish is not available with the selected treatment. Choose Builder Gel or Extensions instead.',
      );
      return;
    }
    setCompatibilityMessage('');
    setSelectedAddOns((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
    setSelectedSlot(null);
  }

  function chooseTreatment(treatment: Treatment) {
    setSelectedTreatment(treatment);
    setSelectedCategory(treatment.category);
    setSelectedSlot(null);
  }

  function chooseProduct(product: ProductOn) {
    setProductOn(product);
    setSelectedSlot(null);
  }

  function chooseNextSlot(slot: AvailabilitySlot | null) {
    if (!slot) return;
    setSelectedDate(slot.date);
    setTimeGroup(slot.group);
    setSelectedSlot(slot);
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
  }

  function goNext() {
    setStep((current) => Math.min(steps.length - 2, current + 1));
  }

  function finishBooking() {
    if (!canConfirm || !selectedSlot) return;
    setStep(4);
  }

  function resetBooking() {
    setStep(0);
    setCancelMessage(false);
  }

  function addToCalendar() {
    if (!selectedSlot) return;
    const title = `${selectedTreatment.name} at ${siteConfig.shortName}`;
    const description = `${selectedTreatment.name} ${total.addOns
      .map((addOn) => addOn.name)
      .join(', ')}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${siteConfig.address.line1}, ${siteConfig.address.city}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'atelier-union-demo-appointment.ics';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="booking-shell">
      <section className="booking-panel" aria-live="polite" ref={panelRef}>
        <div className="booking-steps" aria-label="Booking progress">
          {steps.map((label, index) => (
            <span
              key={label}
              className={`step-pill ${step === index ? 'is-active' : ''}`}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>

        {step === 0 ? (
          <TreatmentStep
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            visibleTreatments={visibleTreatments}
            selectedTreatment={selectedTreatment}
            setSelectedTreatment={chooseTreatment}
            productOn={productOn}
            setProductOn={chooseProduct}
            selectedAddOns={selectedAddOns}
            toggleAddOn={toggleAddOn}
            compatibilityMessage={compatibilityMessage}
            onNext={goNext}
          />
        ) : null}

        {step === 1 ? (
          <ArtistStep
            artistId={artistId}
            setArtistId={(id) => {
              setArtistId(id);
              setSelectedSlot(null);
            }}
            onBack={goBack}
            onNext={goNext}
          />
        ) : null}

        {step === 2 ? (
          <TimeStep
            artistId={artistId}
            selectedDate={selectedDate}
            setSelectedDate={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
            }}
            timeGroup={timeGroup}
            setTimeGroup={(group) => {
              setTimeGroup(group);
              setSelectedSlot(null);
            }}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            availableSlots={availableSlots}
            nextSlot={nextSlot}
            chooseNextSlot={chooseNextSlot}
            onBack={goBack}
            onNext={goNext}
            onChangeArtist={() => setStep(1)}
          />
        ) : null}

        {step === 3 ? (
          <ConfirmStep
            selectedTreatment={selectedTreatment}
            total={total}
            selectedArtist={selectedArtist}
            artistId={artistId}
            selectedSlot={selectedSlot}
            customer={customer}
            setCustomer={setCustomer}
            onBack={goBack}
            onConfirm={finishBooking}
            canConfirm={Boolean(canConfirm && selectedSlot)}
          />
        ) : null}

        {step === 4 ? (
          <BookingComplete
            selectedTreatment={selectedTreatment}
            total={total}
            selectedArtist={selectedArtist}
            artistId={artistId}
            selectedSlot={selectedSlot}
            onAddCalendar={addToCalendar}
            onChange={resetBooking}
            cancelMessage={cancelMessage}
            setCancelMessage={setCancelMessage}
          />
        ) : null}
      </section>

      <BookingSummary
        treatment={selectedTreatment}
        total={total}
        productOn={productOn}
        artist={selectedArtist}
        artistId={artistId}
        slot={selectedSlot}
      />
    </div>
  );
}

function TreatmentStep({
  selectedCategory,
  setSelectedCategory,
  visibleTreatments,
  selectedTreatment,
  setSelectedTreatment,
  productOn,
  setProductOn,
  selectedAddOns,
  toggleAddOn,
  compatibilityMessage,
  onNext,
}: {
  selectedCategory: TreatmentCategory;
  setSelectedCategory: (category: TreatmentCategory) => void;
  visibleTreatments: Treatment[];
  selectedTreatment: Treatment;
  setSelectedTreatment: (treatment: Treatment) => void;
  productOn: ProductOn;
  setProductOn: (product: ProductOn) => void;
  selectedAddOns: AddOnId[];
  toggleAddOn: (id: AddOnId) => void;
  compatibilityMessage: string;
  onNext: () => void;
}) {
  return (
    <>
      <p className="eyebrow">Appointment details</p>
      <h1 className="serif" style={{ fontSize: 'var(--step-3)' }}>
        What would you like to book?
      </h1>
      <div className="button-row" role="tablist" aria-label="Treatment categories">
        {treatmentCategories
          .filter((category) => category.id !== 'addons')
          .map((category) => (
            <button
              key={category.id}
              className={`filter-button ${
                selectedCategory === category.id ? 'is-selected' : ''
              }`}
              type="button"
              role="tab"
              aria-selected={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
      </div>
      <div className="category-list" style={{ marginTop: 'var(--space-6)' }}>
        {visibleTreatments.map((treatment) => (
          <button
            className={`option-button treatment-row ${
              selectedTreatment.id === treatment.id ? 'is-selected' : ''
            }`}
            key={treatment.id}
            type="button"
            onClick={() => setSelectedTreatment(treatment)}
          >
            <h3>{treatment.name}</h3>
            <p>{treatment.description}</p>
            <span className="price">
              {treatment.duration} min · £{treatment.price}
            </span>
          </button>
        ))}
      </div>

      {selectedTreatment.allowsProductRemoval ? (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <p className="eyebrow">Do you already have product on your nails?</p>
          <div className="finder-grid">
            {(Object.keys(productRemoval) as ProductOn[]).map((key) => (
              <button
                className={`option-button ${productOn === key ? 'is-selected' : ''}`}
                type="button"
                key={key}
                onClick={() => setProductOn(key)}
              >
                <strong>{productRemoval[key].label}</strong>
                <br />
                <span className="muted">
                  {productRemoval[key].duration
                    ? `Removal adds ${productRemoval[key].duration} min · +£${productRemoval[key].price}`
                    : 'No removal needed'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedTreatment.acceptsAddOns ? (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <p className="eyebrow">Choose your finish</p>
          <div className="finder-grid">
            {addOns.map((addOn) => {
              const compatible = canUseAddOn(selectedTreatment, addOn);
              const selected = selectedAddOns.includes(addOn.id);
              return (
                <button
                  className={`option-button ${selected ? 'is-selected' : ''}`}
                  type="button"
                  key={addOn.id}
                  aria-pressed={selected}
                  onClick={() => toggleAddOn(addOn.id)}
                >
                  <strong>{addOn.name}</strong>
                  <br />
                  <span className="muted">
                    {compatible
                      ? `${addOn.priceLabel} · adds ${addOn.duration} min`
                      : 'Not compatible with this treatment'}
                  </span>
                </button>
              );
            })}
          </div>
          {compatibilityMessage ? (
            <p className="muted" role="status" style={{ marginTop: 'var(--space-4)' }}>
              {compatibilityMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
        <Button tone="accent" onClick={onNext}>
          Continue
        </Button>
      </div>
    </>
  );
}

function ArtistStep({
  artistId,
  setArtistId,
  onBack,
  onNext,
}: {
  artistId: ArtistChoice;
  setArtistId: (id: ArtistChoice) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <h1 className="serif" style={{ fontSize: 'var(--step-3)' }}>
        Choose your Nail Artist.
      </h1>
      <div className="category-list">
        <button
          type="button"
          className={`option-button simple-row ${artistId === 'any' ? 'is-selected' : ''}`}
          onClick={() => setArtistId('any')}
        >
          <h3>Any Nail Artist</h3>
          <p>Show me the earliest availability.</p>
          <span className="price">Earliest appointments</span>
        </button>
        {artists.map((artist) => (
          <button
            className={`option-button simple-row ${
              artistId === artist.id ? 'is-selected' : ''
            }`}
            key={artist.id}
            type="button"
            onClick={() => setArtistId(artist.id as ArtistChoice)}
          >
            <h3>{artist.name}</h3>
            <p>{artist.specialties.join(', ')}</p>
            <span className="price">{artist.nextAvailable}</span>
          </button>
        ))}
      </div>
      <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
        <Button tone="ghost" onClick={onBack}>
          Back
        </Button>
        <Button tone="accent" onClick={onNext}>
          Continue
        </Button>
      </div>
    </>
  );
}

function TimeStep({
  artistId,
  selectedDate,
  setSelectedDate,
  timeGroup,
  setTimeGroup,
  selectedSlot,
  setSelectedSlot,
  availableSlots,
  nextSlot,
  chooseNextSlot,
  onBack,
  onNext,
  onChangeArtist,
}: {
  artistId: ArtistChoice;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  timeGroup: TimeGroup;
  setTimeGroup: (group: TimeGroup) => void;
  selectedSlot: AvailabilitySlot | null;
  setSelectedSlot: (slot: AvailabilitySlot) => void;
  availableSlots: AvailabilitySlot[];
  nextSlot: AvailabilitySlot | null;
  chooseNextSlot: (slot: AvailabilitySlot | null) => void;
  onBack: () => void;
  onNext: () => void;
  onChangeArtist: () => void;
}) {
  const nextDateWithSlot = bookableDates.find((date) =>
    groups.some((group) => slotsFor(date.date, artistId, group).length > 0),
  );
  const selectedDateLabel =
    bookableDates.find((date) => date.date === selectedDate)?.fullDisplay ??
    'this date';

  return (
    <>
      <h1 className="serif" style={{ fontSize: 'var(--step-3)' }}>
        Choose a time.
      </h1>
      {nextSlot ? (
        <button
          className="option-button"
          type="button"
          onClick={() => chooseNextSlot(nextSlot)}
          style={{ marginBottom: 'var(--space-6)', width: '100%' }}
        >
          <strong>Next available</strong>
          <br />
          <span className="muted">
            {nextSlot.date === '2026-08-22' ? 'Today' : nextSlot.fullDisplay} ·{' '}
            {nextSlot.time}
          </span>
        </button>
      ) : null}
      <div className="button-row" role="tablist" aria-label="Bookable dates">
        {bookableDates.map((date) => (
          <button
            key={date.date}
            className={`date-button ${selectedDate === date.date ? 'is-selected' : ''}`}
            type="button"
            role="tab"
            aria-selected={selectedDate === date.date}
            onClick={() => setSelectedDate(date.date)}
          >
            <strong>{date.dayLabel}</strong>
            <br />
            {date.display}
          </button>
        ))}
      </div>
      <div
        className="button-row"
        role="tablist"
        aria-label="Time groups"
        style={{ marginTop: 'var(--space-6)' }}
      >
        {groups.map((group) => (
          <button
            key={group}
            className={`filter-button ${timeGroup === group ? 'is-selected' : ''}`}
            type="button"
            role="tab"
            aria-selected={timeGroup === group}
            onClick={() => setTimeGroup(group)}
          >
            {group}
          </button>
        ))}
      </div>
      <div className="finder-grid" style={{ marginTop: 'var(--space-6)' }}>
        {availableSlots.map((slot) => (
          <button
            className={`time-button ${
              selectedSlot?.date === slot.date && selectedSlot.time === slot.time
                ? 'is-selected'
                : ''
            }`}
            type="button"
            key={`${slot.date}-${slot.time}-${slot.artist}`}
            onClick={() => setSelectedSlot(slot)}
          >
            {slot.time}
            <br />
            <span className="muted">
              {getArtistById(slot.artist)?.name ?? 'Any Nail Artist'}
            </span>
          </button>
        ))}
      </div>
      {!availableSlots.length ? (
        <div className="info-panel" style={{ marginTop: 'var(--space-6)' }}>
          <p>No appointments remaining on {selectedDateLabel}.</p>
          <div className="button-row">
            {nextDateWithSlot ? (
              <Button tone="ghost" onClick={() => setSelectedDate(nextDateWithSlot.date)}>
                See {nextDateWithSlot.fullDisplay.split(' ')[0]}
              </Button>
            ) : null}
            <Button tone="ghost" onClick={onChangeArtist}>
              See another Nail Artist
            </Button>
          </div>
        </div>
      ) : null}
      <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
        <Button tone="ghost" onClick={onBack}>
          Back
        </Button>
        <Button tone="accent" onClick={onNext} disabled={!selectedSlot}>
          Continue
        </Button>
      </div>
    </>
  );
}

function ConfirmStep({
  selectedTreatment,
  total,
  selectedArtist,
  artistId,
  selectedSlot,
  customer,
  setCustomer,
  onBack,
  onConfirm,
  canConfirm,
}: {
  selectedTreatment: Treatment;
  total: ReturnType<typeof calculateBookingTotal>;
  selectedArtist: ReturnType<typeof getArtistById> | null;
  artistId: ArtistChoice;
  selectedSlot: AvailabilitySlot | null;
  customer: CustomerDetails;
  setCustomer: (customer: CustomerDetails) => void;
  onBack: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
}) {
  const dueAtStudio = Math.max(total.price - deposit, 0);
  return (
    <>
      <h1 className="serif" style={{ fontSize: 'var(--step-3)' }}>
        Confirm your appointment.
      </h1>
      <article className="info-panel">
        <h3>{selectedTreatment.name}</h3>
        {total.removal.price ? (
          <p>{total.removal.label} removal</p>
        ) : null}
        {total.addOns.map((addOn) => (
          <p key={addOn.id}>{addOn.name}</p>
        ))}
        <p>
          with {selectedArtist?.name ?? (artistId === 'any' ? 'Any Nail Artist' : 'your Nail Artist')}
          <br />
          {formatSlot(selectedSlot)}
          <br />
          {total.duration} min
          <br />
          Total {formatPrice(total.price)}
        </p>
      </article>
      <form className="form-grid" style={{ marginTop: 'var(--space-6)' }}>
        <label className="field">
          <span>Full name</span>
          <input
            value={customer.fullName}
            autoComplete="name"
            onChange={(event) =>
              setCustomer({ ...customer, fullName: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Mobile</span>
          <input
            value={customer.mobile}
            autoComplete="tel"
            inputMode="tel"
            onChange={(event) =>
              setCustomer({ ...customer, mobile: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            value={customer.email}
            autoComplete="email"
            inputMode="email"
            onChange={(event) =>
              setCustomer({ ...customer, email: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Anything we should know?</span>
          <textarea
            value={customer.note}
            onChange={(event) =>
              setCustomer({ ...customer, note: event.target.value })
            }
          />
        </label>
      </form>
      <div className="demo-payment">
        <p className="eyebrow">Payment summary</p>
        <h3>£15 deposit required</h3>
        <p className="muted">Deducted from your final bill. No payment will be taken.</p>
        <div className="summary-row">
          <span>Total</span>
          <strong>{formatPrice(total.price)}</strong>
        </div>
        <div className="summary-row">
          <span>Pay today</span>
          <strong>{formatPrice(deposit)}</strong>
        </div>
        <div className="summary-row">
          <span>Pay at the salon</span>
          <strong>{formatPrice(dueAtStudio)}</strong>
        </div>
      </div>
      <p className="muted">
        Free changes up to 24 hours before your appointment. Cancellations within
        24 hours may result in the loss of the £15 deposit.{' '}
        <Link className="text-link" to="/policies">
          View full cancellation policy
        </Link>
      </p>
      <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
        <Button tone="ghost" onClick={onBack}>
          Back
        </Button>
        <Button tone="accent" onClick={onConfirm} disabled={!canConfirm}>
          Confirm appointment
        </Button>
      </div>
    </>
  );
}

function BookingComplete({
  selectedTreatment,
  total,
  selectedArtist,
  artistId,
  selectedSlot,
  onAddCalendar,
  onChange,
  cancelMessage,
  setCancelMessage,
}: {
  selectedTreatment: Treatment;
  total: ReturnType<typeof calculateBookingTotal>;
  selectedArtist: ReturnType<typeof getArtistById> | null;
  artistId: ArtistChoice;
  selectedSlot: AvailabilitySlot | null;
  onAddCalendar: () => void;
  onChange: () => void;
  cancelMessage: boolean;
  setCancelMessage: (value: boolean) => void;
}) {
  const addOnText = total.addOns.length
    ? ` + ${total.addOns.map((addOn) => addOn.name).join(', ')}`
    : '';
  const dueAtSalon = Math.max(total.price - deposit, 0);
  return (
    <>
      <div className="complete-mark" aria-hidden="true">
        <Check />
      </div>
      <h1 className="serif" style={{ fontSize: 'var(--step-4)' }}>
        Booked.
      </h1>
      <article className="info-panel">
        <h3>
          {selectedTreatment.name}
          {addOnText}
        </h3>
        {total.removal.price ? <p>{total.removal.label} removal</p> : null}
        <p>
          {formatSlot(selectedSlot)}
          <br />
          with {selectedArtist?.name ?? (artistId === 'any' ? 'Any Nail Artist' : 'your Nail Artist')}
          <br />
          {total.duration} min
        </p>
        <p>
          {siteConfig.shortName}
          <br />
          {siteConfig.address.line1}, {siteConfig.address.city}
        </p>
        <p>
          Total: {formatPrice(total.price)}
          <br />
          Pay today: {formatPrice(deposit)}
          <br />
          Pay at the salon: {formatPrice(dueAtSalon)}
        </p>
      </article>
      <p className="muted">
        No real payment has been taken. Please arrive five minutes before your
        appointment. If you are wearing product that was not included in your
        booking, contact the studio before arriving.
      </p>
      <div className="button-row">
        <Button tone="accent" onClick={onAddCalendar}>
          <CalendarPlus size={18} aria-hidden="true" />
          Add to calendar
        </Button>
        <a
          className="button-link ghost"
          href="https://www.google.com/maps/search/?api=1&query=Union%20Street%20Aberdeen"
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={18} aria-hidden="true" />
          Get directions
        </a>
        <Button tone="ghost" onClick={onChange}>
          Change appointment
        </Button>
        <Button tone="ghost" onClick={() => setCancelMessage(true)}>
          Cancel appointment
        </Button>
      </div>
      {cancelMessage ? (
        <div className="info-panel" style={{ marginTop: 'var(--space-6)' }}>
          <p>
            This is a concept booking. A live salon site would open a secure
            cancellation flow here.
          </p>
        </div>
      ) : null}
    </>
  );
}

function BookingSummary({
  treatment,
  total,
  productOn,
  artist,
  artistId,
  slot,
}: {
  treatment: Treatment;
  total: ReturnType<typeof calculateBookingTotal>;
  productOn: ProductOn;
  artist: ReturnType<typeof getArtistById> | null;
  artistId: ArtistChoice;
  slot: AvailabilitySlot | null;
}) {
  return (
    <aside className="summary-panel" aria-label="Booking summary">
      <p className="eyebrow">Booking summary</p>
      <h2 className="serif" style={{ fontSize: 'var(--step-2)' }}>
        {treatment.name}
      </h2>
      <div className="summary-row">
        <span>Treatment</span>
        <strong>{formatPrice(treatment.price)}</strong>
      </div>
      {total.removal.price ? (
        <div className="summary-row">
          <span>{productRemoval[productOn].label} removal</span>
          <strong>+{formatPrice(total.removal.price)}</strong>
        </div>
      ) : null}
      {total.addOns.map((addOn) => (
        <div className="summary-row" key={addOn.id}>
          <span>{addOn.name}</span>
          <strong>+{formatPrice(addOn.price)}</strong>
        </div>
      ))}
      <div className="summary-row">
        <span>Duration</span>
        <strong>{total.duration} min</strong>
      </div>
      <div className="summary-row">
        <span>Artist</span>
        <strong>{artist?.name ?? (artistId === 'any' ? 'Any' : 'Selected')}</strong>
      </div>
      <div className="summary-row">
        <span>Date/time</span>
        <strong>{slot ? `${slot.display} ${slot.time}` : 'Choose time'}</strong>
      </div>
      <div className="summary-row summary-total">
        <span>Total</span>
        <strong>{formatPrice(total.price)}</strong>
      </div>
      <p className="muted">{siteConfig.bookingPolicy}</p>
    </aside>
  );
}
