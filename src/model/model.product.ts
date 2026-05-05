import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import { Category } from "./model.category";
import {Discount}from "./model.discount";
import {ProductImage} from "./model.productImage";
import {OrderItem} from "./model.orderItem";
import {Inventory}from "./model.inventory";
import{CartItem}from"./model.cartItem";
@Table({ 
    tableName: "Products",
    version: true,
    paranoid: true
})
export class Product extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare unit: string;

    @ForeignKey(() => Category)
    @Column({ type: DataType.STRING })
    declare categoryId: string;

    @BelongsTo(() => Category)
    declare category: Category;

    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    declare price: number;

    @Column({ type: DataType.STRING, allowNull: true })
    declare thumbnail: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare description: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare origin: string;

    @HasMany(() => ProductImage)
    declare productImages: ProductImage[];

    @HasMany(() => OrderItem)
    declare orderItems: OrderItem[];

    @HasMany(() => CartItem)
    declare cartItems: CartItem[];

    @HasMany(() => Inventory)
    declare inventories: Inventory[];
}