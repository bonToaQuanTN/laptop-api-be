import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import {Users} from "./model.user";
import {CartItem}from "./model.cartItem";
@Table({ 
    tableName: "Carts",
    version: true,
    paranoid: true
})
export class Cart extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @ForeignKey(() => Users)
    @Column({ type: DataType.STRING })
    declare userId: string;

    @BelongsTo(() => Users)
    declare user: Users;

    @HasMany(() => CartItem)
    declare cartItems: CartItem[];
}