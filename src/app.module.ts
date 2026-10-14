import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GuardiansModule } from './guardians/guardians.module';
import { TalentsModule } from './talents/talents.module';
import { MediaModule } from './media/media.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { CastingModule } from './casting/casting.module';
import { PublicSearchModule } from './public-search/public-search.module';
import { ApplicationsModule } from './applications/applications.module';
import { ShortlistsModule } from './shortlists/shortlists.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AuditionsModule } from './auditions/auditions.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { CmsModule } from './cms/cms.module';
import { SearchModule } from './search/search.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AiModule } from './ai/ai.module';
import { QueuesModule } from './queues/queues.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './common/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    QueuesModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    GuardiansModule,
    TalentsModule,
    MediaModule,
    ProfessionalsModule,
    CastingModule,
    PublicSearchModule,
    ApplicationsModule,
    ShortlistsModule,
    InvitationsModule,
    AuditionsModule,
    MessagingModule,
    NotificationsModule,
    OrganizationsModule,
    PaymentsModule,
    AdminModule,
    CmsModule,
    SearchModule,
    RecommendationsModule,
    AiModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
