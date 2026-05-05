import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import {Order} from "./model.order";
@Table({ 
    tableName: "Discounts",
    version: true,
    paranoid: true
})
export class Discount extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Column({ type: DataType.DECIMAL(5, 2), allowNull: false })
    declare discountRate: number;

    @HasMany(() => Order)
    declare orders: Order[];
}