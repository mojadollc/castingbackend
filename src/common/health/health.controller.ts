import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      environment: this.config.get('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  version() {
    return {
      version: this.config.get('APP_VERSION', '1.0.0'),
      environment: this.config.get('NODE_ENV', 'development'),
    };
  }
}
