import { Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { InjectModel } from "@nestjs/sequelize";
import { Order } from "src/model/model.order";
import { OrderItem } from "src/model/model.orderItem";
import { Product } from "src/model/model.product";

@Injectable()
export class StripeService {
    private stripe: InstanceType<typeof Stripe>;
    private readonly logger = new Logger(StripeService.name);

    constructor(
        @InjectModel(Order)
        private orderModel: typeof Order,
    ) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY is not defined in .env file');
        }
        this.stripe = new Stripe(secretKey, { 
            apiVersion: '2026-04-22.dahlia' 
        });
    }
    
    async createCheckoutSessionFromOrder(orderId: string) {
        this.logger.log(`Calculating price and creating session for orderId: ${orderId}`);
        try {
        const order = await this.orderModel.findByPk(orderId, {
            include: [{ model: OrderItem, include: [Product] }]
        });

        if (!order) throw new Error('Order not found');

        let totalAmount = 0;
        for (const item of order.orderItems) {
            totalAmount += item.product.price * item.quantity; 
        }

        if (order.discount?.discountRate) {
            totalAmount = totalAmount - (totalAmount * order.discount.discountRate / 100);
        }

        return await this.createCheckoutSession(orderId, totalAmount);

        } catch (error) {
        const errorMessage = error instanceof Error ? error.stack : String(error);
        this.logger.error(`Failed to process order ${orderId}`, errorMessage);
        throw error;
        }
    }

    async createCheckoutSession(orderId: string, price: number) {
        this.logger.log(`Creating checkout session for orderId: ${orderId}, price: ${price}`);
        try {
            const unitAmountInCents = Math.round(price * 100);
            const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success';
            const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel';

            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Order Payment - #${orderId}`, 
                            },
                            unit_amount: unitAmountInCents, 
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${cancelUrl}?session_id={CHECKOUT_SESSION_ID}`,
                metadata: {orderId: orderId },
            });

            this.logger.log(`Checkout session created successfully. SessionId: ${session.id}`);
            return session;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.stack : String(error);
            this.logger.error(`Create checkout session failed for orderId: ${orderId}`, errorMessage);
            throw error;
        }
    }

    constructWebhookEvent(payload: string | Buffer, signature: string) {
        return this.stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    }
}