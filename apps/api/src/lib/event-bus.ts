import { EventEmitter } from 'events';

export type HotelEventType =
  | 'booking.created'
  | 'booking.updated'
  | 'payment.captured'
  | 'payment.pay_at_hotel'
  | 'folio.updated'
  | 'review.added'
  | 'hotel.updated'
  | 'settlement.generated'
  | 'settlement.completed'
  | 'finance.updated'
  | 'finance.refund';

export interface HotelEvent {
  hotelId: string;
  type: HotelEventType;
  timestamp: string;
  data?: Record<string, unknown>;
}

class HotelEventBus extends EventEmitter {
  publish(event: HotelEvent) {
    this.emit(`hotel:${event.hotelId}`, event);
    this.emit('hotel:*', event);
  }

  subscribe(hotelId: string, handler: (event: HotelEvent) => void) {
    this.on(`hotel:${hotelId}`, handler);
    return () => this.off(`hotel:${hotelId}`, handler);
  }
}

export const hotelEventBus = new HotelEventBus();
