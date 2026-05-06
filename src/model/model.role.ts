import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import { Permission } from "./model.permission";
import { Users } from "./model.user";
@Table({ 
    tableName: "Roles",
    version: true,
    paranoid: true
})
export class Role extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @HasMany(() => Users)
    declare users: Users[];
    
    @HasMany(() => Permission)
    declare permissions: Permission[];
}