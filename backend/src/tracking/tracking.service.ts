import { Injectable, Logger } from '@nestjs/common';

interface PendingUtm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  clickId?: string;
  createdAt: number;
}

/**
 * Fila FIFO de UTMs capturados no clique do botão da LP.
 * Quando um lead entra no grupo, o GroupJoinService consome
 * o UTM mais antigo (primeiro a clicar = primeiro a entrar).
 * Entradas expiram após 30 minutos.
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly queue: PendingUtm[] = [];
  private readonly TTL_MS = 30 * 60 * 1000;

  registerClick(data: Omit<PendingUtm, 'createdAt'>) {
    this.purgeExpired();
    this.queue.push({ ...data, createdAt: Date.now() });
    this.logger.log(`UTM registrado (fila: ${this.queue.length}) — source=${data.utmSource} medium=${data.utmMedium} campaign=${data.utmCampaign}`);
  }

  consumeNextUtm(): Omit<PendingUtm, 'createdAt'> | null {
    this.purgeExpired();
    if (this.queue.length === 0) return null;
    const { createdAt, ...utm } = this.queue.shift()!;
    this.logger.log(`UTM consumido (fila restante: ${this.queue.length}) — source=${utm.utmSource} campaign=${utm.utmCampaign}`);
    return utm;
  }

  private purgeExpired() {
    const now = Date.now();
    const before = this.queue.length;
    while (this.queue.length > 0 && now - this.queue[0].createdAt > this.TTL_MS) {
      this.queue.shift();
    }
    const removed = before - this.queue.length;
    if (removed > 0) this.logger.debug(`${removed} UTM(s) expirados removidos da fila`);
  }
}
