import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import {Cart} from"./model.cart";
import {Product} from "./model.product";
@Table({ 
    tableName: "cartItems",
    version: true,
    paranoid: true
})
export class CartItem extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @ForeignKey(() => Cart)
    @Column({ type: DataType.STRING })
    declare cartId: string;

    @BelongsTo(() => Cart)
    declare cart: Cart;

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