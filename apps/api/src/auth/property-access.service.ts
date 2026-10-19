import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity } from '../entities/property.entity';
import type { JwtUser } from './auth.types';

@Injectable()
export class PropertyAccessService {
  constructor(
    @InjectRepository(PropertyEntity)
    private readonly properties: Repository<PropertyEntity>,
  ) {}

  /** Portfolio-wide roles vs owner scoped to owner_id in properties CSV. */
  private isPortfolioRole(user: JwtUser): boolean {
    return user.role === 'admin' || user.role === 'viewer';
  }

  async allowedPropertyIds(user: JwtUser): Promise<Set<string> | 'all'> {
    if (this.isPortfolioRole(user)) return 'all';
    if (user.role === 'owner' && user.ownerId) {
      const rows = await this.properties.find({
        where: { ownerId: user.ownerId },
        select: ['propertyId'],
      });
      return new Set(rows.map((r) => r.propertyId));
    }
    return new Set();
  }

  /**
   * Anti-IDOR: unknown or forbidden property → 404 (same shape, no leak).
   * Empty propertyId = portfolio aggregate (allowed for portfolio roles; owners get their slice in analytics).
   */
  async assertPropertyAccess(user: JwtUser, propertyId?: string): Promise<void> {
    const normalized = propertyId?.trim();
    if (!normalized) return;

    const row = await this.properties.findOne({
      where: { propertyId: normalized },
      select: ['propertyId', 'ownerId'],
    });
    if (!row) {
      throw new NotFoundException('Property not found');
    }

    if (this.isPortfolioRole(user)) return;

    if (user.role === 'owner' && user.ownerId && row.ownerId === user.ownerId) {
      return;
    }

    throw new NotFoundException('Property not found');
  }

  async filterPropertyIds(user: JwtUser, ids: string[]): Promise<string[]> {
    const allowed = await this.allowedPropertyIds(user);
    if (allowed === 'all') return ids;
    return ids.filter((id) => allowed.has(id));
  }

  /** Owners cannot read portfolio-wide KPIs without selecting a villa (anti-IDOR). */
  assertPortfolioScope(user: JwtUser, propertyId?: string): void {
    if (!propertyId?.trim() && user.role === 'owner') {
      throw new ForbiddenException('Select a property for owner accounts');
    }
  }
}
