import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import { Product } from "./model.product";
import { Order } from "./model.order";

@Table({ 
    tableName: "orderItems",
    version: true,
    paranoid: true
})
export class OrderItem extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @ForeignKey(() => Order)
    @Column({ type: DataType.STRING })
    declare orderId: string;

    @BelongsTo(() => Order)
    declare order: Order;

    @ForeignKey(() => Product)
    @Column({ type: DataType.STRING })
    declare productId: string;

    @BelongsTo(() => Product)
    declare product: Product;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare quantity: number;

    @Column({ 
        type: DataType.DECIMAL(10, 2),
        allowNull: false, 
        defaultValue: 0 
    })
    declare price: number;
}