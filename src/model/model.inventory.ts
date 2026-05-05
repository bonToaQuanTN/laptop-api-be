import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import {Product} from "./model.product";
import {Warehouse}from "./model.warehouse";

@Table({ 
    tableName: "Inventories",
    version: true,
    paranoid: true
})
export class Inventory extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @ForeignKey(() => Product)
    @Column({ type: DataType.STRING })
    declare productId: string;

    @BelongsTo(() => Product)
    declare product: Product;

    @ForeignKey(() => Warehouse)
    @Column({ type: DataType.STRING })
    declare warehouseId: string;

    @BelongsTo(() => Warehouse)
    declare warehouse: Warehouse;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare quantity: number;
}