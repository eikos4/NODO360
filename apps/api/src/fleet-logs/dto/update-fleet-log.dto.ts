import { PartialType } from '@nestjs/mapped-types';
import { CreateFleetLogDto } from './create-fleet-log.dto';

export class UpdateFleetLogDto extends PartialType(CreateFleetLogDto) {}
