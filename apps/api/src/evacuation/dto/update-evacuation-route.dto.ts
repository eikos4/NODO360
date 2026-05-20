import { PartialType } from '@nestjs/mapped-types';
import { CreateEvacuationRouteDto } from './create-evacuation-route.dto';

export class UpdateEvacuationRouteDto extends PartialType(CreateEvacuationRouteDto) {}
