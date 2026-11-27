import type {
  HotelDetail,
  RateInfo,
  RateMode,
  RoomTypeDetail,
} from "../types/catalog";

const peruTime = { timeZone: "America/Lima" };

export const reservationDateTime = new Intl.DateTimeFormat("es-PE", {
  ...peruTime,
  dateStyle: "medium",
  timeStyle: "short",
  hourCycle: "h23",
});

export const reservationHour = new Intl.DateTimeFormat("es-PE", {
  ...peruTime,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const reservationDay = new Intl.DateTimeFormat("es-PE", {
  ...peruTime,
  day: "numeric",
  month: "short",
});

const peruDate = new Intl.DateTimeFormat("sv-SE", {
  ...peruTime,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInPeru() {
  return peruDate.format(new Date());
}

export function slotLabel(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const time = `${reservationHour.format(start)}–${reservationHour.format(end)}`;
  return peruDate.format(start) === peruDate.format(end)
    ? time
    : `${time} · salida ${reservationDay.format(end)}`;
}

export function isBookable(
  hotel: HotelDetail,
  room: RoomTypeDetail,
  rate: RateInfo,
) {
  return (
    !!hotel.acceptsReservations &&
    (room.totalUnits ?? 0) > 0 &&
    !rate.simulated &&
    (rate.mode !== "NIGHT" || !!(hotel.nightCheckIn && hotel.nightCheckOut))
  );
}

export const reservationModeLabel: Record<RateMode, string> = {
  HOUR: "Por hora",
  PACKAGE: "Paquete de horas",
  NIGHT: "Por noche",
};
