import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import {Inventory} from "./model.inventory"

@Table({ 
    tableName: "Warehouses",
    version: true,
    paranoid: true
})
export class Warehouse extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    declare address: string;

    @HasMany(() => Inventory)
    declare inventories: Inventory[];
}