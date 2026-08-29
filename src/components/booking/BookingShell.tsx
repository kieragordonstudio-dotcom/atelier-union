import { CalendarPlus, Check, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Artist } from '../../data/artists';
import { getLookById } from '../../data/lookbook';
import { usePublicData } from '../../data/PublicDataProvider';
import {
  calculateBookingTotal,
  canUseAddOn,
  formatPrice,
  productRemoval,
  type AddOn,
  type AddOnId,
  type ProductOn,
  type Treatment,
  type TreatmentCategory,
} from '../../data/treatments';
import { ApiError, apiFetch } from '../../lib/api';
import { Button } from '../common/Button';

const steps = ['Treatment', 'Artist', 'Date & Time', 'Confirm', 'Booked'];
const groups: TimeGroup[] = ['Morning', 'Afternoon', 'Evening'];

type ArtistChoice = string;
type TimeGroup = 'Morning' | 'Afternoon' | 'Evening';
type AvailabilitySlot = {
  date: string;
  startsAt: string;
  dayLabel: string;
  display: string;
  fullDisplay: string;
  time: string;
  group: TimeGroup;
  artist: string;
  artistId: string;
  artistName: string;
};
type AvailabilityDay = {
  date: string;
  slotCount: number;
  status: 'good' | 'limited' | 'full' | 'closed';
  dayLabel: string;
  display: string;
  fullDisplay: string;
};
type AvailabilityResponse = {
  timezone: string;
  durationMinutes: number;
  totalPence: number;
  days: AvailabilityDay[];
  slots: AvailabilitySlot[];
};
const availabilityStart = startOfToday();

type CustomerDetails = {
  fullName: string;
  mobile: string;
  email: string;
  note: string;
};

function getInitialTreatment(params: URLSearchParams, treatments: Treatment[]) {
  const look = getLookById(params.get('look'));
  return (
    treatments.find((treatment) => treatment.id === params.get('treatment')) ??
    treatments.find((treatment) => treatment.id === look?.suggestedBaseTreatment) ??
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

function getInitialAddOns(
  params: URLSearchParams,
  treatment: Treatment,
  addOns: AddOn[],
) {
  const look = getLookById(params.get('look'));
  const ids = [params.get('addon'), look?.addOn].filter(Boolean) as AddOnId[];
  return Array.from(new Set(ids)).filter((id) => {
    const addOn = addOns.find((item) => item.id === id);
    return addOn ? canUseAddOn(treatment, addOn) : false;
  });
}

function formatSlot(slot: AvailabilitySlot | null) {
  return slot ? `${slot.fullDisplay} · ${slot.time}` : 'Not selected';
}

function formatBookingPrice(value: number) {
  return `£${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export function BookingShell() {
  const { addOns, artists, bookingSettings, treatmentCategories, treatments, website } = usePublicData();
  const [params] = useSearchParams();
  const paramsKey = params.toString();
  const panelRef = useRef<HTMLElement>(null);
  const appliedParamsKeyRef = useRef(paramsKey);
  const initialTreatment = useMemo(
    () => getInitialTreatment(params, treatments),
    [paramsKey, treatments],
  );
  const initialArtist = artists.find((artist) => artist.id === params.get('artist'))?.id;
  const [step, setStep] = useState(0);
  const [selectedTreatment, setSelectedTreatment] =
    useState<Treatment>(initialTreatment);
  const [selectedCategory, setSelectedCategory] = useState<TreatmentCategory>(
    initialTreatment.category,
  );
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnId[]>(() =>
    getInitialAddOns(params, initialTreatment, addOns),
  );
  const [productOn, setProductOn] = useState<ProductOn>(() =>
    getInitialProduct(params, initialTreatment),
  );
  const [artistId, setArtistId] = useState<ArtistChoice>(initialArtist ?? 'any');
  const [selectedDate, setSelectedDate] = useState(toDateKey(startOfToday()));
  const [timeGroup, setTimeGroup] = useState<TimeGroup>('Afternoon');
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
  const [bookingError, setBookingError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedAddOns((current) => {
      const compatible = current.filter((id) => {
        const addOn = addOns.find((item) => item.id === id);
        return addOn ? canUseAddOn(selectedTreatment, addOn) : false;
      });
      return compatible.length === current.length ? current : compatible;
    });
    if (!selectedTreatment.allowsProductRemoval) {
      setProductOn('none');
    }
  }, [addOns, selectedTreatment]);

  useEffect(() => {
    setSelectedTreatment((current) =>
      treatments.find((treatment) => treatment.id === current.id) ?? current,
    );
  }, [treatments]);

  useEffect(() => {
    if (appliedParamsKeyRef.current === paramsKey) return;
    appliedParamsKeyRef.current = paramsKey;
    const nextTreatment = getInitialTreatment(params, treatments);
    const nextArtist = artists.find((artist) => artist.id === params.get('artist'))?.id ?? 'any';
    setStep(0);
    setSelectedTreatment(nextTreatment);
    setSelectedCategory(nextTreatment.category);
    setSelectedAddOns(getInitialAddOns(params, nextTreatment, addOns));
    setProductOn(getInitialProduct(params, nextTreatment));
    setArtistId(nextArtist);
    setSelectedDate(toDateKey(startOfToday()));
    setTimeGroup('Afternoon');
    setSelectedSlot(null);
  }, [addOns, artists, paramsKey, treatments]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  const total = calculateBookingTotal(
    selectedTreatment,
    selectedAddOns,
    productOn,
  );
  const deposit = bookingSettings.depositPence / 100;

  const selectedArtist = artistId === 'any' ? null : artists.find((artist) => artist.id === artistId);
  const visibleTreatments = treatments.filter(
    (treatment) => treatment.category === selectedCategory,
  );
  const canConfirm =
    customer.fullName.trim() && customer.mobile.trim() && customer.email.trim();

  function toggleAddOn(id: AddOnId) {
    const addOn = addOns.find((item) => item.id === id);
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

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
  }

  function goNext() {
    setStep((current) => Math.min(steps.length - 2, current + 1));
  }

  async function finishBooking() {
    if (!canConfirm || !selectedSlot) return;
    setBookingError('');
    setSubmitting(true);
    try {
      await apiFetch('/api/public/appointments', {
        method: 'POST',
        body: JSON.stringify({
          serviceSlug: selectedTreatment.id,
          addOnSlugs: selectedAddOns,
          productOn,
          artistSlug: selectedSlot.artist,
          startsAt: selectedSlot.startsAt,
          customer,
        }),
      });
      setStep(4);
    } catch (error) {
      setBookingError(
        error instanceof ApiError
          ? error.message
          : 'The appointment could not be booked. Please choose another time.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetBooking() {
    setStep(0);
    setCancelMessage(false);
  }

  function addToCalendar() {
    if (!selectedSlot) return;
    const startsAt = new Date(selectedSlot.startsAt);
    const endsAt = new Date(startsAt.getTime() + total.duration * 60_000);
    const title = `${selectedTreatment.name} at ${website.salonName}`;
    const description = `${selectedTreatment.name} ${total.addOns
      .map((addOn) => addOn.name)
      .join(', ')}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatIcsDate(startsAt)}`,
      `DTEND:${formatIcsDate(endsAt)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${website.addressLine1}, ${website.city}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
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
            treatmentCategories={treatmentCategories}
            addOns={addOns}
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
            artists={artists}
            artistId={artistId}
            setArtistId={(id) => {
              setArtistId(id);
              setSelectedDate(toDateKey(startOfToday()));
              setSelectedSlot(null);
            }}
            onBack={goBack}
            onNext={goNext}
          />
        ) : null}

        {step === 2 ? (
          <TimeStep
            selectedTreatment={selectedTreatment}
            selectedAddOns={selectedAddOns}
            productOn={productOn}
            artists={artists}
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
            onBack={goBack}
            onNext={goNext}
            onChangeArtist={() => setStep(1)}
            maximumAdvanceDays={bookingSettings.maximumAdvanceDays}
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
            bookingError={bookingError}
            submitting={submitting}
            deposit={deposit}
            cancellationCutoffHours={bookingSettings.cancellationCutoffHours}
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
            deposit={deposit}
          />
        ) : null}
      </section>

      <BookingSummary
        treatment={selectedTreatment}
        total={total}
        deposit={deposit}
        productOn={productOn}
        artist={selectedArtist}
        artistId={artistId}
        slot={selectedSlot}
      />
    </div>
  );
}

function TreatmentStep({
  treatmentCategories,
  addOns,
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
  treatmentCategories: Array<{ id: string; label: string; description: string }>;
  addOns: AddOn[];
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
  artists,
  artistId,
  setArtistId,
  onBack,
  onNext,
}: {
  artists: Artist[];
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
          className={`option-button simple-row artist-choice-row ${artistId === 'any' ? 'is-selected' : ''}`}
          onClick={() => setArtistId('any')}
        >
          <h3>Any Nail Artist</h3>
          <p>See availability across all Nail Artists.</p>
        </button>
        {artists.map((artist) => (
          <button
            className={`option-button simple-row artist-choice-row ${
              artistId === artist.id ? 'is-selected' : ''
            }`}
            key={artist.id}
            type="button"
            onClick={() => setArtistId(artist.id as ArtistChoice)}
          >
            <h3>{artist.name}</h3>
            <p>{artist.specialties.join(', ')}</p>
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
  selectedTreatment,
  selectedAddOns,
  productOn,
  artists,
  artistId,
  selectedDate,
  setSelectedDate,
  timeGroup,
  setTimeGroup,
  selectedSlot,
  setSelectedSlot,
  onBack,
  onNext,
  onChangeArtist,
  maximumAdvanceDays,
}: {
  selectedTreatment: Treatment;
  selectedAddOns: AddOnId[];
  productOn: ProductOn;
  artists: Artist[];
  artistId: ArtistChoice;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  timeGroup: TimeGroup;
  setTimeGroup: (group: TimeGroup) => void;
  selectedSlot: AvailabilitySlot | null;
  setSelectedSlot: (slot: AvailabilitySlot) => void;
  onBack: () => void;
  onNext: () => void;
  onChangeArtist: () => void;
  maximumAdvanceDays: number;
}) {
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(dateFromKey(selectedDate)),
  );
  const calendarDates = useMemo(
    () => getCalendarDates(calendarMonth),
    [calendarMonth],
  );
  const monthLabel = calendarMonth.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
  const selectedDateLabel = dateFromKey(selectedDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const availableSlots = (availability?.slots ?? []).filter(
    (slot) => slot.date === selectedDate && slot.group === timeGroup,
  );
  const nextDateWithSlot = findNextDateWithSlot(
    selectedDate,
    timeGroup,
    availability?.slots ?? [],
  );
  const availabilityEnd = addDays(availabilityStart, maximumAdvanceDays);
  const firstCalendarMonth = startOfMonth(availabilityStart);
  const lastCalendarMonth = startOfMonth(availabilityEnd);
  const previousMonthDisabled = calendarMonth <= firstCalendarMonth;
  const nextMonthDisabled = calendarMonth >= lastCalendarMonth;

  useEffect(() => {
    setCalendarMonth((current) => {
      const next = startOfMonth(dateFromKey(selectedDate));
      return current.getFullYear() === next.getFullYear() &&
        current.getMonth() === next.getMonth()
        ? current
        : next;
    });
  }, [selectedDate]);

  useEffect(() => {
    let active = true;
    const from = toDateKey(calendarDates[0]);
    const to = toDateKey(calendarDates[calendarDates.length - 1]);
    const query = new URLSearchParams({
      service: selectedTreatment.id,
      artist: artistId,
      addOns: selectedAddOns.join(','),
      productOn,
      from,
      to,
    });
    setLoadingAvailability(true);
    setAvailabilityError('');
    apiFetch<AvailabilityResponse>(`/api/public/availability?${query.toString()}`)
      .then((result) => {
        if (!active) return;
        setAvailability(result);
        const selectedHasSlots = result.slots.some((slot) => slot.date === selectedDate);
        if (!selectedHasSlots && selectedDate >= from && selectedDate <= to) {
          const nextDate = result.days.find((day) => day.slotCount > 0)?.date;
          if (nextDate) setSelectedDate(nextDate);
        }
      })
      .catch((error) => {
        if (!active) return;
        setAvailability(null);
        setAvailabilityError(
          error instanceof ApiError ? error.message : 'Availability could not be loaded.',
        );
      })
      .finally(() => {
        if (active) setLoadingAvailability(false);
      });
    return () => {
      active = false;
    };
  }, [artistId, calendarDates, productOn, selectedAddOns, selectedTreatment.id]);

  useEffect(() => {
    if (loadingAvailability || !availability) return;
    const slotsOnSelectedDate = availability.slots.filter(
      (slot) => slot.date === selectedDate,
    );
    if (
      !slotsOnSelectedDate.length ||
      slotsOnSelectedDate.some((slot) => slot.group === timeGroup)
    ) {
      return;
    }
    const firstAvailableGroup = groups.find((group) =>
      slotsOnSelectedDate.some((slot) => slot.group === group),
    );
    if (firstAvailableGroup) setTimeGroup(firstAvailableGroup);
  }, [availability, loadingAvailability, selectedDate, setTimeGroup, timeGroup]);

  function chooseDate(date: Date) {
    setSelectedDate(toDateKey(date));
    if (date.getMonth() !== calendarMonth.getMonth()) {
      setCalendarMonth(startOfMonth(date));
    }
  }

  return (
    <>
      <h1 className="serif" style={{ fontSize: 'var(--step-3)' }}>
        Choose a date &amp; time.
      </h1>
      <section className="month-calendar" aria-label={`Availability for ${monthLabel}`}>
        <div className="calendar-header">
          <button
            className="calendar-nav-button"
            type="button"
            aria-label="Show previous month"
            title="Previous month"
            disabled={previousMonthDisabled}
            onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
          >
            <ChevronLeft size={19} aria-hidden="true" />
          </button>
          <h2 className="calendar-month-label">{monthLabel}</h2>
          <button
            className="calendar-nav-button"
            type="button"
            aria-label="Show next month"
            title="Next month"
            disabled={nextMonthDisabled}
            onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
          >
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid" role="grid" aria-label={monthLabel}>
          {calendarDates.map((date) => {
            const dateKey = toDateKey(date);
            const status = getAvailabilityStatus(
              dateKey,
              availability?.days ?? [],
              loadingAvailability,
              availabilityEnd,
            );
            const outsideMonth = date.getMonth() !== calendarMonth.getMonth();
            const selected = selectedDate === dateKey;
            const fullDate = date.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            const ariaLabel = `${fullDate}, ${status.label.toLowerCase()}`;

            return (
              <button
                className={`calendar-day is-${status.tone} ${
                  outsideMonth ? 'is-outside' : ''
                } ${selected ? 'is-selected' : ''}`}
                type="button"
                role="gridcell"
                key={dateKey}
                aria-label={ariaLabel}
                aria-selected={selected}
                disabled={status.disabled}
                onClick={() => chooseDate(date)}
              >
                <span className="calendar-day-number">{date.getDate()}</span>
                <span className="calendar-day-status">{status.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <ul className="availability-legend" aria-label="Availability legend">
          <li><span className="legend-dot is-good" aria-hidden="true" />Good</li>
          <li><span className="legend-dot is-limited" aria-hidden="true" />Limited</li>
          <li><span className="legend-dot is-full" aria-hidden="true" />Fully booked</li>
          <li><span className="legend-dot is-closed" aria-hidden="true" />Closed / unavailable</li>
        </ul>
        <p className="calendar-selection" aria-live="polite">
          Selected: <strong>{selectedDateLabel}</strong>
        </p>
      </section>
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
              {artists.find((artist) => artist.id === slot.artist)?.name ?? slot.artistName}
            </span>
          </button>
        ))}
      </div>
      {availabilityError ? (
        <div className="info-panel" style={{ marginTop: 'var(--space-6)' }}>
          <p role="alert">{availabilityError}</p>
        </div>
      ) : !loadingAvailability && !availableSlots.length ? (
        <div className="info-panel" style={{ marginTop: 'var(--space-6)' }}>
          <p>
            No {timeGroup.toLowerCase()} appointments remaining on{' '}
            {selectedDateLabel}.
          </p>
          <div className="button-row">
            {nextDateWithSlot ? (
              <Button tone="ghost" onClick={() => setSelectedDate(nextDateWithSlot)}>
                See {dateFromKey(nextDateWithSlot).toLocaleDateString('en-GB', { weekday: 'long' })}
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
}

function getCalendarDates(month: Date) {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function getAvailabilityStatus(
  date: string,
  days: AvailabilityDay[],
  loading: boolean,
  availabilityEnd: Date,
) {
  const firstDate = toDateKey(availabilityStart);
  const lastDate = toDateKey(availabilityEnd);

  if (date < firstDate || date > lastDate) {
    return { tone: 'closed', label: 'Unavailable', shortLabel: 'Closed', disabled: true };
  }
  if (loading) {
    return { tone: 'closed', label: 'Checking availability', shortLabel: '...', disabled: false };
  }
  const day = days.find((item) => item.date === date);
  if (!day || day.status === 'closed') {
    return { tone: 'closed', label: 'Closed', shortLabel: 'Closed', disabled: true };
  }
  if (day.status === 'good') {
    return {
      tone: 'good',
      label: `Good availability, ${day.slotCount} slots`,
      shortLabel: 'Good',
      disabled: false,
    };
  }
  if (day.status === 'limited') {
    return {
      tone: 'limited',
      label: `Limited availability, ${day.slotCount} ${day.slotCount === 1 ? 'slot' : 'slots'}`,
      shortLabel: 'Limited',
      disabled: false,
    };
  }
  return { tone: 'full', label: 'Fully booked', shortLabel: 'Full', disabled: true };
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function findNextDateWithSlot(
  selectedDate: string,
  timeGroup: TimeGroup,
  slots: AvailabilitySlot[],
) {
  return (
    slots.find((slot) => slot.date > selectedDate && slot.group === timeGroup)?.date ??
    null
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
  bookingError,
  submitting,
  deposit,
  cancellationCutoffHours,
}: {
  selectedTreatment: Treatment;
  total: ReturnType<typeof calculateBookingTotal>;
  selectedArtist: Artist | null | undefined;
  artistId: ArtistChoice;
  selectedSlot: AvailabilitySlot | null;
  customer: CustomerDetails;
  setCustomer: (customer: CustomerDetails) => void;
  onBack: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
  bookingError: string;
  submitting: boolean;
  deposit: number;
  cancellationCutoffHours: number;
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
      <p className="muted">
        Demo booking. Please do not enter real personal information. No real payment is taken.
      </p>
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
        <h3>{formatBookingPrice(deposit)} deposit required</h3>
        <p className="muted">Deducted from your final bill. No payment will be taken.</p>
        <div className="summary-row">
          <span>Total</span>
          <strong>{formatPrice(total.price)}</strong>
        </div>
        <div className="summary-row">
          <span>Pay today</span>
          <strong>{formatBookingPrice(deposit)}</strong>
        </div>
        <div className="summary-row">
          <span>Pay at the salon</span>
          <strong>{formatBookingPrice(dueAtStudio)}</strong>
        </div>
      </div>
      <p className="muted">
        Free changes up to {cancellationCutoffHours} hours before your appointment. Cancellations within
        {' '}{cancellationCutoffHours} hours may result in the loss of the {formatBookingPrice(deposit)} deposit.{' '}
        <Link className="text-link" to="/policies">
          View full cancellation policy
        </Link>
      </p>
      <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
        <Button tone="ghost" onClick={onBack}>
          Back
        </Button>
        <Button tone="accent" onClick={onConfirm} disabled={!canConfirm || submitting}>
          Confirm appointment
        </Button>
      </div>
      {bookingError ? (
        <p className="muted" role="alert" style={{ marginTop: 'var(--space-4)' }}>
          {bookingError}
        </p>
      ) : null}
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
  deposit,
}: {
  selectedTreatment: Treatment;
  total: ReturnType<typeof calculateBookingTotal>;
  selectedArtist: Artist | null | undefined;
  artistId: ArtistChoice;
  selectedSlot: AvailabilitySlot | null;
  onAddCalendar: () => void;
  onChange: () => void;
  cancelMessage: boolean;
  setCancelMessage: (value: boolean) => void;
  deposit: number;
}) {
  const { website } = usePublicData();
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
          {website.salonName}
          <br />
          {website.addressLine1}, {website.city}
        </p>
        <p>
          Total: {formatPrice(total.price)}
          <br />
          Pay today: {formatBookingPrice(deposit)}
          <br />
          Pay at the salon: {formatBookingPrice(dueAtSalon)}
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
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${website.addressLine1}, ${website.city} ${website.postcode}`,
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={18} aria-hidden="true" />
          Get directions
        </a>
        <Button tone="ghost" onClick={onChange}>
          Book another appointment
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
  deposit,
  productOn,
  artist,
  artistId,
  slot,
}: {
  treatment: Treatment;
  total: ReturnType<typeof calculateBookingTotal>;
  deposit: number;
  productOn: ProductOn;
  artist: Artist | null | undefined;
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
      <p className="muted">
        A {formatBookingPrice(deposit)} demo deposit is shown during booking and deducted from the final bill. No real payment is taken on this concept site.
      </p>
    </aside>
  );
}
