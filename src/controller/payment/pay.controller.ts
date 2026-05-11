import { Controller, Post, Body, Req, Get, Logger, Res, HttpStatus } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Response, Request } from 'express';
import { StripeService } from '../../service/payment/pay.service';
import type { CreatePaymentDto } from '../../dto/payment/pay.dto';
import { OrderService } from 'src/service/sale/order.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../guard/decorator/public.decorator';
import { PaginationDto } from '../../dto/pagination/pagination.dto';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly orderService: OrderService
  ) {}

  private readonly logger = new Logger(PaymentController.name);

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  async checkout(@Body() body: CreatePaymentDto) {
    const session = await this.stripeService.createCheckoutSessionFromOrder(body.id);
    return { url: session.url };
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe Webhook endpoint (No Auth required)' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const sigHeader = req.headers['stripe-signature'];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    if (!signature) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing request body');
    }

    let event: any;

    try {
      event = this.stripeService.constructWebhookEvent(rawBody as string | Buffer, signature);
      this.logger.log(`Webhook received: ${event.type}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook signature verification failed`, errorMessage);
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${errorMessage}`);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        this.logger.warn(`OrderId missing in metadata`);
        return res.status(HttpStatus.BAD_REQUEST).send('Missing orderId');
      }

      try {
        // TÌM KIẾM ĐƠN HÀNG TRƯỚC KHI UPDATE
        const order = await this.orderService.getOrderById(orderId);
        if (order.status === 'PAID') {
          this.logger.warn(`Order ${orderId} is already PAID. Ignoring duplicate webhook.`);
          return res.status(HttpStatus.OK).json({ received: true });
        }

        // Nếu chưa PAID thì tiến hành update
        this.logger.log(`Payment success for orderId: ${orderId}`);
        await this.orderService.updateStatus(orderId, 'PAID'); 
        this.logger.log(`Order status updated to PAID: ${orderId}`);
        
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : String(error);
         this.logger.error(`Failed to update order ${orderId}`, errorMessage);
         return res.status(HttpStatus.OK).json({ received: true, error: 'Internal processing failed' });
      }
    }
    res.status(HttpStatus.OK).json({ received: true });
  }

  @Get('success')
  success() {
    return { message: "Payment Success" };
  }

  @Get('cancel')
  cancel() {
    return { message: "Payment Cancelled" };
  }
}