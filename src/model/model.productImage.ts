import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import {Product} from "./model.product";
@Table({ 
    tableName: "ProductImages",
    version: true,
    paranoid: true
})
export class ProductImage extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @ForeignKey(() => Product)
    @Column({ type: DataType.STRING })
    declare productId: string;

    @BelongsTo(() => Product)
    declare product: Product;

    @Column({ type: DataType.STRING, allowNull: false })
    declare imageUrl: string;
}