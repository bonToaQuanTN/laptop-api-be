import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import { Users } from "./model.user";
import { OrderItem } from "./model.orderItem";
import { Discount } from "./model.discount";

@Table({ 
    tableName: "Orders",
    version: true,
    paranoid: true
})
export class Order extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @ForeignKey(() => Users)
    @Column({ type: DataType.STRING })
    declare userId: string;

    @BelongsTo(() => Users)
    declare user: Users;

    @ForeignKey(() => Discount)
    @Column({ type: DataType.STRING, allowNull: true })
    declare discountId: string;

    @BelongsTo(() => Discount)
    declare discount: Discount;

    @Column({ type: DataType.STRING, allowNull: true })
    declare status: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare shippingAddress: string;

    @HasMany(() => OrderItem)
    declare orderItems: OrderItem[];
}