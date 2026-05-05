import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import { Product } from "./model.product";
@Table({ 
    tableName: "Categories",
    version: true,
    paranoid: true
})
export class Category extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @HasMany(() => Product)
    declare products: Product[];
}