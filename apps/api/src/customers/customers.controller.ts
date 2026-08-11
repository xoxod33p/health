import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(SupabaseAuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCustomerDto) { return this.customers.create(user, dto); }
  @Get() findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: CustomerQueryDto) { return this.customers.findAll(user, query); }
  @Get(':id') findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.customers.findOne(user, id); }
  @Patch(':id') update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.customers.update(user, id, dto); }
}
