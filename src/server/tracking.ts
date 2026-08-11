import { OrderStatus, TrackingType } from "@prisma/client";
import { prisma } from "./db";

// Fully automatic courier simulation, driven by time since payment.
// After the customer pays, the order advances through the pipeline on its own:
//   PAID -> CONFIRMED (4s) -> PACKED (10s) -> OUT_FOR_DELIVERY (18s, courier moves)
//   -> DELIVERED (when the courier reaches the destination zone).
// No cron, no manual dispatch — just call trackOrderPublic() and it self-advances.

const START_LAT = 12.9685;
const START_LNG = 77.5925;

const CONFIRMED_AT = 4; // seconds after payment
const PACKED_AT = 10; // seconds after payment
const DISPATCHED_AT = 18; // seconds after payment
const TRIP_SECONDS = 200; // courier journey duration (faster for demo, ~3.5 min)
const LEG_INTERVALS = 5;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function computeCourierPosition(
  destLat: number,
  destLng: number,
  dispatchAtMs: number,
) {
  const now = Date.now();
  const elapsed = Math.max(0, (now - dispatchAtMs) / 1000);
  const progress = Math.min(1, elapsed / TRIP_SECONDS);

  // Gentle zig-zag so the marker looks alive between polls
  const wobble =
    Math.sin(progress * Math.PI * LEG_INTERVALS) * 0.0012 * progress;

  return {
    lat: lerp(START_LAT, destLat, progress) + wobble,
    lng: lerp(START_LNG, destLng, progress) + wobble * 0.7,
    progress,
  };
}

export async function simulateCourierIfNeeded(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { zone: true, tracking: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return null;

  // Cancelled / delivered orders don't move
  if (
    order.status === OrderStatus.CANCELLED ||
    order.status === OrderStatus.DELIVERED
  ) {
    return order;
  }

  // Not paid yet — nothing to simulate
  if (order.paymentStatus !== "PAID") return order;

  const destLat = order.zone?.lat ?? 12.9716;
  const destLng = order.zone?.lng ?? 77.5946;

  // Anchor everything to the moment payment landed (PAID event timestamp)
  const paidEvent = order.tracking.find((e) => e.type === TrackingType.PAID);
  const paidAtMs =
    paidEvent?.createdAt.getTime() ?? order.createdAt.getTime();
  const now = Date.now();
  const elapsed = Math.max(0, (now - paidAtMs) / 1000);

  const existingTypes = new Set(order.tracking.map((e) => e.type));

  // ----- Decide target status based purely on elapsed time -----
  let targetStatus = order.status;

  if (elapsed >= DISPATCHED_AT) {
    targetStatus = OrderStatus.OUT_FOR_DELIVERY;
  } else if (elapsed >= PACKED_AT) {
    targetStatus = OrderStatus.PACKED;
  } else if (elapsed >= CONFIRMED_AT) {
    targetStatus = OrderStatus.CONFIRMED;
  }

  // Apply any status transition that happened (ordered by pipeline)
  const statusOrder = [
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.CONFIRMED,
    OrderStatus.PACKED,
    OrderStatus.OUT_FOR_DELIVERY,
  ];
  const wantIdx = statusOrder.indexOf(targetStatus);
  const curIdx = statusOrder.indexOf(order.status);

  if (wantIdx > curIdx) {
    // Jump through each intermediate status so events get created in order
    for (const status of statusOrder) {
      const idx = statusOrder.indexOf(status);
      if (idx <= curIdx || idx > wantIdx) continue;

      const eventData: { type: TrackingType; note: string; lat?: number; lng?: number } | undefined =
        status === OrderStatus.CONFIRMED
          ? { type: TrackingType.CONFIRMED, note: "Store has confirmed your order." }
          : status === OrderStatus.PACKED
            ? { type: TrackingType.PACKED, note: "Your items are packed and sealed." }
            : status === OrderStatus.OUT_FOR_DELIVERY
              ? {
                  type: TrackingType.OUT_FOR_DELIVERY,
                  note: "Courier picked up your order and is on the way!",
                  lat: START_LAT,
                  lng: START_LNG,
                }
              : undefined;

      if (!eventData) continue;
      if (existingTypes.has(eventData.type)) continue;

      await prisma.trackingEvent.create({
        data: {
          orderId: order.id,
          type: eventData.type,
          note: eventData.note,
          lat: eventData.lat,
          lng: eventData.lng,
        },
      });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: targetStatus },
    });
    order.status = targetStatus;
  }

  // ----- Courier movement once dispatched -----
  if (order.status === OrderStatus.OUT_FOR_DELIVERY) {
    const dispatchEvent = order.tracking.find(
      (e) => e.type === TrackingType.OUT_FOR_DELIVERY,
    );
    const dispatchAtMs =
      dispatchEvent?.createdAt.getTime() ?? paidAtMs;

    const pos = computeCourierPosition(destLat, destLng, dispatchAtMs);

    // Arrived? Distance check vs destination
    const distToDest = haversineKm(pos.lat, pos.lng, destLat, destLng);
    if (pos.progress >= 1 || distToDest < 0.06) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.DELIVERED,
            deliveredAt: new Date(),
            courierLat: destLat,
            courierLng: destLng,
          },
        }),
        prisma.trackingEvent.create({
          data: {
            orderId: order.id,
            type: TrackingType.DELIVERED,
            note: "Delivered! Enjoy your order. 🎉",
            lat: destLat,
            lng: destLng,
          },
        }),
      ]);
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { courierLat: pos.lat, courierLng: pos.lng },
      });
    }
  }

  return order;
}

export async function trackOrderPublic(orderId: string) {
  await simulateCourierIfNeeded(orderId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      zone: true,
      tracking: { orderBy: { createdAt: "asc" } },
      items: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!order) return null;

  const paidEvent = order.tracking.find((e) => e.type === TrackingType.PAID);
  const dispatchEvent = order.tracking.find(
    (e) => e.type === TrackingType.OUT_FOR_DELIVERY,
  );
  const now = Date.now();

  const etaMinutes =
    order.status === OrderStatus.OUT_FOR_DELIVERY && dispatchEvent
      ? Math.max(
          1,
          Math.ceil(
            (TRIP_SECONDS - (now - dispatchEvent.createdAt.getTime()) / 1000) /
              60,
          ),
        )
      : null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    items: order.items,
    courierLat: order.courierLat,
    courierLng: order.courierLng,
    zone: order.zone,
    scheduledSlot: order.scheduledSlot,
    tracking: order.tracking,
    deliveredAt: order.deliveredAt,
    paidAt: paidEvent?.createdAt ?? null,
    etaMinutes,
    userName: order.user.name,
  };
}
