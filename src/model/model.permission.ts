import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo, HasMany} from "sequelize-typescript";
import { Role } from "./model.role";
@Table({ 
    tableName: "Permissions",
    version: true,
    paranoid: true
})
export class Permission extends Model {
    @PrimaryKey
    @Column({ type: DataType.STRING, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;
    
    @BelongsTo(() => Role) declare role: Role;
}